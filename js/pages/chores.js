import { auth } from '../../firebase.js';
import { 
  createChore, 
  getHouseholdChores, 
  toggleChoreCompletion,
  deleteCompletedChores,
  updateChore
} from '../utils/chores.js';
import { 
  getCurrentUserHousehold, 
  getHouseholdMembers 
} from '../utils/household.js';
import {
  initGoogleCalendar,
  requestCalendarAuthorization,
  isAuthorized,
  signOutCalendar,
  syncChoreToCalendar,
  deleteCalendarEvent,
  getConnectionStatus
} from '../utils/calendar.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

(function(){
  function esc(str) {
    return String(str).replace(/[&<>\"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#39;'}[s]));
  }

  async function initChoresPage() {
    const page = document.getElementById('chores-page');
    if (!page) return;

    const form = document.getElementById('chore-form');
    const list = document.getElementById('chore-list');
    const history = document.getElementById('chore-history');
    const clearBtn = document.getElementById('clear-chores');
    const assigneeSelect = document.getElementById('chore-assignee');
    const congratsModal = new bootstrap.Modal(document.getElementById('choresCongratsModal'));
    const calendarConnectBtn = document.getElementById('calendar-connect-btn');
    const calendarStatusText = document.getElementById('calendar-status-text');
    const calendarBanner = document.getElementById('calendar-banner');
    const syncToCalendarCheckbox = document.getElementById('sync-to-calendar');

    let currentHousehold = null;
    let householdMembers = [];
    let chores = [];
    let calendarInitialized = false;

    // Initialize Google Calendar API
    initializeCalendar();

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await loadHouseholdData();
          await loadChores();
        } catch (error) {
          console.error('Error loading chores:', error);
          showError('Failed to load chores. Please try refreshing the page.');
        }
      } else {
        window.location.href = 'login.html';
      }
    });

    async function initializeCalendar() {
      try {
        await initGoogleCalendar();
        calendarInitialized = true;
        updateCalendarUI();
      } catch (error) {
        console.error('Error initializing Google Calendar:', error);
        calendarStatusText.textContent = 'Failed to initialize calendar integration.';
      }
    }

    function updateCalendarUI() {
      const status = getConnectionStatus();
      
      if (isAuthorized()) {
        calendarStatusText.textContent = '✓ Connected to Google Calendar';
        calendarConnectBtn.textContent = 'Disconnect';
        calendarConnectBtn.classList.remove('btn-primary');
        calendarConnectBtn.classList.add('btn-outline-secondary');
        syncToCalendarCheckbox.disabled = false;
      } else {
        calendarStatusText.textContent = 'Connect your Google Calendar to sync chores automatically.';
        calendarConnectBtn.textContent = 'Connect Calendar';
        calendarConnectBtn.classList.remove('btn-outline-secondary');
        calendarConnectBtn.classList.add('btn-primary');
        syncToCalendarCheckbox.disabled = true;
        syncToCalendarCheckbox.checked = false;
      }
    }

    calendarConnectBtn.addEventListener('click', async () => {
      if (isAuthorized()) {
        // Disconnect
        signOutCalendar();
        updateCalendarUI();
        showSuccess('Disconnected from Google Calendar');
      } else {
        // Connect
        try {
          calendarConnectBtn.disabled = true;
          calendarConnectBtn.textContent = 'Connecting...';
          await requestCalendarAuthorization();
          updateCalendarUI();
          showSuccess('Successfully connected to Google Calendar!');
        } catch (error) {
          console.error('Error connecting to Google Calendar:', error);
          showError('Failed to connect to Google Calendar. Please try again.');
        } finally {
          calendarConnectBtn.disabled = false;
        }
      }
    });

    async function loadHouseholdData() {
      try {
        currentHousehold = await getCurrentUserHousehold();
        
        if (!currentHousehold) {
          showError('You need to join a household first.');
          assigneeSelect.innerHTML = '<option value="">No household found</option>';
          return;
        }

        householdMembers = await getHouseholdMembers(currentHousehold.id);
        populateAssigneeDropdown();
      } catch (error) {
        console.error('Error loading household:', error);
        throw error;
      }
    }

    function populateAssigneeDropdown() {
      assigneeSelect.innerHTML = '<option value="">Select assignee…</option>';
      
      householdMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member.uid;
        option.textContent = member.displayName;
        assigneeSelect.appendChild(option);
      });
    }

    async function loadChores() {
      if (!currentHousehold) return;

      try {
        showLoading(list);
        chores = await getHouseholdChores(currentHousehold.id);
        renderChores();
        renderHistory();
        updateClearButton();
      } catch (error) {
        console.error('Error loading chores:', error);
        showError('Failed to load chores.');
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentHousehold) {
        showError('You need to join a household first.');
        return;
      }

      const name = form.name.value.trim();
      const assigneeId = form.assignee.value;
      const frequency = form.frequency.value;
      const dueDate = form.due.value;

      if (!name || !assigneeId || !frequency || !dueDate) {
        showError('Please fill in all fields.');
        return;
      }

      const submitBtn = form.querySelector('button');
      if (!submitBtn) {
        console.error('Submit button not found');
        return;
      }

      try {
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';

        const assigneeMember = householdMembers.find(m => m.uid === assigneeId);
        const shouldSyncCalendar = syncToCalendarCheckbox.checked && isAuthorized();
        
        const choreData = {
          name,
          assigneeId,
          assigneeName: assigneeMember ? assigneeMember.displayName : '',
          frequency,
          dueDate,
          householdId: currentHousehold.id
        };

        const choreId = await createChore(choreData);

        // Sync to Google Calendar if requested
        if (shouldSyncCalendar) {
          try {
            submitBtn.textContent = 'Syncing to calendar...';
            const eventId = await syncChoreToCalendar({ ...choreData, id: choreId });
            // Update chore with calendar event ID
            await updateChore(choreId, { calendarEventId: eventId });
            showSuccess('Chore added and synced to Google Calendar!');
          } catch (calError) {
            console.error('Error syncing to calendar:', calError);
            showError('Chore added but failed to sync to calendar.');
          }
        }

        form.reset();
        await loadChores();
        
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      } catch (error) {
        console.error('Error creating chore:', error);
        showError('Failed to create chore. Please try again.');
        const submitBtn = form.querySelector('button');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Add Chore';
        }
      }
    });

    clearBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete all completed chores?')) {
        return;
      }

      try {
        clearBtn.disabled = true;
        clearBtn.textContent = 'Clearing...';
        
        await deleteCompletedChores(currentHousehold.id);
        await loadChores();
        
        clearBtn.disabled = false;
        clearBtn.textContent = 'Clear completed';
      } catch (error) {
        console.error('Error clearing chores:', error);
        showError('Failed to clear completed chores.');
        clearBtn.disabled = false;
        clearBtn.textContent = 'Clear completed';
      }
    });

    function renderChores() {
      list.innerHTML = '';

      const incompleteChores = chores.filter(c => !c.done);
      const completedChores = chores.filter(c => c.done);

      if (chores.length === 0) {
        list.innerHTML = '<div class="col-12"><p class="text-muted text-center py-4">No chores yet. Add your first chore above!</p></div>';
        return;
      }

      incompleteChores.forEach(renderChoreCard);
      completedChores.forEach(renderChoreCard);

      if (incompleteChores.length === 0 && completedChores.length > 0) {
        setTimeout(() => congratsModal.show(), 500);
      }
    }

    function renderChoreCard(chore) {
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4';
      
      const isOverdue = !chore.done && chore.dueDate < new Date().toISOString().split('T')[0];
      const statusClass = chore.done ? 'done' : (isOverdue ? 'overdue' : '');
      const calendarIcon = chore.calendarEventId ? '📅' : '';
      
      col.innerHTML = `
        <div class='card chore-card p-3 ${statusClass}' data-id='${chore.id}'>
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h3 class='h5 mb-0'>${esc(chore.name)}</h3>
            ${calendarIcon ? '<span class="badge bg-info">'+calendarIcon+'</span>' : ''}
          </div>
          <p class='mb-2 small'>
            <strong>👤 ${esc(chore.assigneeName || 'Unassigned')}</strong><br>
            📅 ${esc(chore.frequency)} • Due ${formatDate(chore.dueDate)}
            ${isOverdue ? '<br><span class="text-danger">⚠️ Overdue</span>' : ''}
          </p>
          <div class="d-flex gap-2">
            <button class='btn btn-sm flex-grow-1 mark-btn ${chore.done ? 'btn-outline-secondary' : 'btn-success'}'>
              ${chore.done ? '↩️ Mark Incomplete' : '✓ Mark Done'}
            </button>
            ${!chore.calendarEventId && isAuthorized() ? 
              '<button class="btn btn-sm btn-outline-primary sync-btn" title="Sync to Calendar">📅</button>' : ''}
          </div>
        </div>
      `;

      const markBtn = col.querySelector('.mark-btn');
      markBtn.addEventListener('click', async () => {
        try {
          markBtn.disabled = true;
          const newStatus = !chore.done;
          await toggleChoreCompletion(chore.id, newStatus);
          
          // Update calendar event if synced
          if (chore.calendarEventId && isAuthorized()) {
            try {
              await syncChoreToCalendar({ ...chore, done: newStatus });
            } catch (calError) {
              console.error('Error updating calendar:', calError);
            }
          }
          
          await loadChores();
        } catch (error) {
          console.error('Error toggling chore:', error);
          showError('Failed to update chore.');
          markBtn.disabled = false;
        }
      });

      // Sync button handler
      const syncBtn = col.querySelector('.sync-btn');
      if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
          try {
            syncBtn.disabled = true;
            syncBtn.textContent = '⏳';
            const eventId = await syncChoreToCalendar(chore);
            await updateChore(chore.id, { calendarEventId: eventId });
            await loadChores();
            showSuccess('Chore synced to Google Calendar!');
          } catch (error) {
            console.error('Error syncing chore:', error);
            showError('Failed to sync chore to calendar.');
            syncBtn.disabled = false;
            syncBtn.textContent = '📅';
          }
        });
      }

      list.appendChild(col);
    }

    function renderHistory() {
      if (!history) return;

      const completedChores = chores.filter(c => c.done);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recentCompleted = completedChores.filter(c => {
        if (!c.completedAt) return false;
        const completedDate = c.completedAt.toDate ? c.completedAt.toDate() : new Date(c.completedAt);
        return completedDate >= oneWeekAgo;
      });

      if (recentCompleted.length === 0) {
        history.innerHTML = '<p class="text-muted mb-0">No chores completed this week.</p>';
        return;
      }

      const historyHTML = recentCompleted.map(c => {
        const completedDate = c.completedAt ? 
          (c.completedAt.toDate ? c.completedAt.toDate() : new Date(c.completedAt)) : 
          new Date();
        return `
          <div class="mb-2 pb-2 border-bottom">
            <div class="fw-semibold">${esc(c.name)}</div>
            <div class="text-muted" style="font-size: 0.85em;">
              ${esc(c.assigneeName)} • ${formatDate(completedDate.toISOString().split('T')[0])}
            </div>
          </div>
        `;
      }).join('');

      history.innerHTML = historyHTML;
    }

    function updateClearButton() {
      const hasCompleted = chores.some(c => c.done);
      if (hasCompleted) {
        clearBtn.classList.remove('d-none');
      } else {
        clearBtn.classList.add('d-none');
      }
    }

    function formatDate(dateStr) {
      const date = new Date(dateStr + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }

    function showLoading(element) {
      element.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }

    function showError(message) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-danger alert-dismissible fade show';
      alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      page.insertBefore(alert, page.firstChild);
      setTimeout(() => alert.remove(), 5000);
    }

    function showSuccess(message) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-success alert-dismissible fade show';
      alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      page.insertBefore(alert, page.firstChild);
      setTimeout(() => alert.remove(), 5000);
    }
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initChoresPage = initChoresPage;
})();
