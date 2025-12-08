import { auth } from '../../firebase.js';
import { 
  getHouseholdChores, 
  toggleChoreCompletion
} from '../utils/chores.js';
import { 
  getCurrentUserHousehold, 
  getHouseholdMembers 
} from '../utils/household.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

(function(){
  function esc(str) {
    return String(str).replace(/[&<>\"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#39;'}[s]));
  }

  async function initCalendarPage() {
    const page = document.getElementById('calendar-page');
    if (!page) return;

    const calendarGrid = document.getElementById('calendar-grid');
    const calendarTitle = document.getElementById('calendar-title');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const todayBtn = document.getElementById('today-btn');
    const choreDetailModal = new bootstrap.Modal(document.getElementById('choreDetailModal'));
    const modalMarkDoneBtn = document.getElementById('modalMarkDone');

    let currentDate = new Date();
    let currentHousehold = null;
    let householdMembers = [];
    let chores = [];
    let selectedChore = null;
    let currentView = 'month'; // 'month' or 'week'
    
    // Show loading state
    showLoadingCalendar();

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          console.log('User authenticated, loading calendar data...');
          await loadHouseholdData();
          console.log('Household loaded:', currentHousehold);
          await loadChores();
          console.log('Chores loaded, rendering calendar...');
          renderCalendar();
          console.log('Calendar rendered successfully');
        } catch (error) {
          console.error('Error loading calendar:', error);
          showError('Failed to load calendar. Please try refreshing the page.');
        }
      } else {
        console.log('User not authenticated, redirecting to login...');
        window.location.href = 'login.html';
      }
    });

    async function loadHouseholdData() {
      try {
        currentHousehold = await getCurrentUserHousehold();
        
        if (!currentHousehold) {
          showError('You need to join a household first.');
          return;
        }

        householdMembers = await getHouseholdMembers(currentHousehold.id);
      } catch (error) {
        console.error('Error loading household:', error);
        throw error;
      }
    }

    async function loadChores() {
      if (!currentHousehold) return;

      try {
        chores = await getHouseholdChores(currentHousehold.id);
        console.log(`Loaded ${chores.length} chores for calendar`, chores);
      } catch (error) {
        console.error('Error loading chores:', error);
        showError('Failed to load chores.');
      }
    }

    function renderCalendar() {
      if (currentView === 'month') {
        renderMonthView();
      } else {
        renderWeekView();
      }
    }

    function renderMonthView() {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // Update title
      calendarTitle.textContent = currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });

      // Clear grid
      calendarGrid.innerHTML = '';

      // Add day headers
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
      });

      // Get first day of month and number of days
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      // Add empty cells for days before month starts
      for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        const prevMonthDay = new Date(year, month, -startingDayOfWeek + i + 1);
        emptyDay.innerHTML = `<div class="day-number">${prevMonthDay.getDate()}</div>`;
        calendarGrid.appendChild(emptyDay);
      }

      // Add days of current month
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        const currentDay = new Date(year, month, day);
        currentDay.setHours(0, 0, 0, 0);
        
        dayElement.className = 'calendar-day';
        
        if (currentDay.getTime() === today.getTime()) {
          dayElement.classList.add('today');
        }

        dayElement.innerHTML = `<div class="day-number">${day}</div>`;

        // Add chores for this day
        const dayChores = getChoresForDate(currentDay);
        dayChores.forEach(chore => {
          const choreElement = createChoreElement(chore);
          dayElement.appendChild(choreElement);
        });

        calendarGrid.appendChild(dayElement);
      }

      // Add remaining days to complete the grid
      const totalCells = calendarGrid.children.length - 7; // Subtract headers
      const remainingCells = 35 - totalCells; // 5 weeks * 7 days
      for (let i = 1; i <= remainingCells; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day other-month';
        emptyDay.innerHTML = `<div class="day-number">${i}</div>`;
        calendarGrid.appendChild(emptyDay);
      }
    }

    function renderWeekView() {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const day = currentDate.getDate();
      
      // Get start of week (Sunday)
      const startOfWeek = new Date(year, month, day - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      // Update title
      calendarTitle.textContent = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

      // Clear grid
      calendarGrid.innerHTML = '';

      // Add day headers
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
      });

      // Add week days
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(currentDay.getDate() + i);
        currentDay.setHours(0, 0, 0, 0);

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (currentDay.getTime() === today.getTime()) {
          dayElement.classList.add('today');
        }

        dayElement.innerHTML = `<div class="day-number">${currentDay.getDate()}</div>`;

        // Add chores for this day
        const dayChores = getChoresForDate(currentDay);
        dayChores.forEach(chore => {
          const choreElement = createChoreElement(chore);
          dayElement.appendChild(choreElement);
        });

        calendarGrid.appendChild(dayElement);
      }
    }

    function getChoresForDate(date) {
      const dateStr = date.toISOString().split('T')[0];
      return chores.filter(chore => chore.dueDate === dateStr);
    }

    function createChoreElement(chore) {
      const choreEl = document.createElement('div');
      choreEl.className = 'chore-item';
      
      if (chore.done) {
        choreEl.classList.add('done');
      } else {
        const today = new Date().toISOString().split('T')[0];
        if (chore.dueDate < today) {
          choreEl.classList.add('overdue');
        }
      }

      choreEl.textContent = chore.name;
      choreEl.title = `${chore.name} - ${chore.assigneeName}`;
      
      choreEl.addEventListener('click', () => showChoreDetail(chore));
      
      return choreEl;
    }

    function showChoreDetail(chore) {
      selectedChore = chore;
      
      const modalTitle = document.getElementById('modalChoreTitle');
      const modalBody = document.getElementById('modalChoreBody');
      
      modalTitle.textContent = chore.name;
      
      const dueDate = new Date(chore.dueDate + 'T00:00:00');
      const isOverdue = !chore.done && chore.dueDate < new Date().toISOString().split('T')[0];
      
      modalBody.innerHTML = `
        <div class="mb-3">
          <strong>👤 Assigned to:</strong> ${esc(chore.assigneeName || 'Unassigned')}
        </div>
        <div class="mb-3">
          <strong>📅 Due Date:</strong> ${dueDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        <div class="mb-3">
          <strong>🔄 Frequency:</strong> ${esc(chore.frequency)}
        </div>
        <div class="mb-3">
          <strong>Status:</strong> 
          ${chore.done ? 
            '<span class="badge bg-success">✓ Completed</span>' : 
            (isOverdue ? 
              '<span class="badge bg-danger">⚠️ Overdue</span>' : 
              '<span class="badge bg-primary">Pending</span>'
            )
          }
        </div>
        ${chore.calendarEventId ? '<div class="mb-3"><span class="badge bg-info">📅 Synced to Google Calendar</span></div>' : ''}
      `;

      // Update button state
      if (chore.done) {
        modalMarkDoneBtn.textContent = '↩️ Mark Incomplete';
        modalMarkDoneBtn.className = 'btn btn-outline-secondary';
      } else {
        modalMarkDoneBtn.textContent = '✓ Mark as Done';
        modalMarkDoneBtn.className = 'btn btn-success';
      }

      choreDetailModal.show();
    }

    modalMarkDoneBtn.addEventListener('click', async () => {
      if (!selectedChore) return;

      try {
        modalMarkDoneBtn.disabled = true;
        await toggleChoreCompletion(selectedChore.id, !selectedChore.done);
        await loadChores();
        renderCalendar();
        choreDetailModal.hide();
        showSuccess(selectedChore.done ? 'Chore marked as incomplete' : 'Chore marked as done!');
      } catch (error) {
        console.error('Error toggling chore:', error);
        showError('Failed to update chore.');
      } finally {
        modalMarkDoneBtn.disabled = false;
      }
    });

    // Navigation buttons
    prevMonthBtn.addEventListener('click', () => {
      if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() - 1);
      } else {
        currentDate.setDate(currentDate.getDate() - 7);
      }
      renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
      if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + 7);
      }
      renderCalendar();
    });

    todayBtn.addEventListener('click', () => {
      currentDate = new Date();
      renderCalendar();
    });

    // View toggle
    document.querySelectorAll('.view-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        renderCalendar();
      });
    });

    function showError(message) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
      alert.style.zIndex = '9999';
      alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      document.body.appendChild(alert);
      setTimeout(() => alert.remove(), 5000);
    }

    function showSuccess(message) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
      alert.style.zIndex = '9999';
      alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      document.body.appendChild(alert);
      setTimeout(() => alert.remove(), 3000);
    }
    
    function showLoadingCalendar() {
      calendarGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 3rem; text-align: center;">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3 text-muted">Loading your chores...</p>
        </div>
      `;
    }
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initCalendarPage = initCalendarPage;
  
  // Auto-initialize if on calendar page
  if (document.getElementById('calendar-page')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initCalendarPage);
    } else {
      initCalendarPage();
    }
  }
})();
