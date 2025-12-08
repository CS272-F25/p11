import { auth, db } from '../../firebase.js';
import { 
  getCurrentUserHousehold, 
  getHouseholdMembers 
} from '../utils/household.js';
import { 
  getIncompleteChores,
  getChoresDueSoon,
  createChore,
  toggleChoreCompletion
} from '../utils/chores.js';
import { addExpense, deleteExpense } from '../utils/finance.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

(function(){
  function esc(str) {
    return String(str).replace(/[&<>\"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#39;'}[s]));
  }

  async function initHomePage() {
    const page = document.getElementById('home-page');
    if (!page) return;

    const emptyState = document.getElementById('empty-state');
    const userName = document.getElementById('user-name');
    const statChores = document.getElementById('stat-chores');
    const statExpenses = document.getElementById('stat-expenses');
    const statMembers = document.getElementById('stat-members');
    const upcomingChoresEl = document.getElementById('upcoming-chores');
    const recentExpensesEl = document.getElementById('recent-expenses');
    const householdMembersEl = document.getElementById('household-members');
    const householdNameEl = document.getElementById('household-name');
    const inviteCodeEl = document.getElementById('invite-code');
    const copyInviteBtn = document.getElementById('copy-invite-code');

    // Modal elements
    const addChoreModal = document.getElementById('addChoreModal');
    const addExpenseModal = document.getElementById('addExpenseModal');
    const inviteCodeModal = document.getElementById('inviteCodeModal');
    const quickChoreForm = document.getElementById('quick-chore-form');
    const quickExpenseForm = document.getElementById('quick-expense-form');
    const submitQuickChore = document.getElementById('submit-quick-chore');
    const submitQuickExpense = document.getElementById('submit-quick-expense');
    const showInviteBtn = document.getElementById('show-invite-btn');
    const modalInviteCode = document.getElementById('modal-invite-code');
    const modalCopyInvite = document.getElementById('modal-copy-invite');

    let currentHousehold = null;
    let householdMembers = [];
    let bsChoreModal, bsExpenseModal, bsInviteModal;

    // Initialize modals
    if (addChoreModal) bsChoreModal = new bootstrap.Modal(addChoreModal);
    if (addExpenseModal) bsExpenseModal = new bootstrap.Modal(addExpenseModal);
    if (inviteCodeModal) bsInviteModal = new bootstrap.Modal(inviteCodeModal);

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Set user name
          if (userName) {
            userName.textContent = user.displayName || user.email?.split('@')[0] || 'User';
          }

          // Load household
          currentHousehold = await getCurrentUserHousehold();
          
          if (!currentHousehold) {
            showEmptyState();
            return;
          }

          // Load members first
          householdMembers = await getHouseholdMembers(currentHousehold.id);

          // Load all data
          await Promise.all([
            loadHouseholdInfo(),
            loadStats(),
            loadUpcomingChores(),
            loadRecentExpenses(),
            loadHouseholdMembers()
          ]);

          // Initialize modals
          setupModals();

        } catch (error) {
          console.error('Error loading home page:', error);
        }
      } else {
        window.location.href = 'login.html';
      }
    });

    function showEmptyState() {
      if (emptyState) {
        emptyState.classList.remove('d-none');
      }
      // Hide all main content sections
      const contentSections = page.querySelectorAll('.row.g-4, .mb-5');
      contentSections.forEach(section => {
        if (!section.contains(emptyState)) {
          section.classList.add('d-none');
        }
      });
    }

    async function loadHouseholdInfo() {
      if (!currentHousehold) return;

      if (householdNameEl) {
        householdNameEl.textContent = currentHousehold.name || 'Your Household';
      }

      if (inviteCodeEl) {
        inviteCodeEl.textContent = currentHousehold.inviteCode || '------';
      }

      if (copyInviteBtn) {
        copyInviteBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(currentHousehold.inviteCode);
            const originalText = copyInviteBtn.textContent;
            copyInviteBtn.textContent = '✓ Copied!';
            setTimeout(() => {
              copyInviteBtn.textContent = originalText;
            }, 2000);
          } catch (error) {
            console.error('Failed to copy:', error);
          }
        });
      }
    }

    async function loadStats() {
      if (!currentHousehold) return;

      try {
        // Load chores count
        const chores = await getIncompleteChores(currentHousehold.id);
        if (statChores) {
          statChores.textContent = chores.length;
        }

        // Load expenses total
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('householdId', '==', currentHousehold.id)
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        let totalExpenses = 0;
        expensesSnapshot.forEach(doc => {
          totalExpenses += doc.data().amount || 0;
        });
        if (statExpenses) {
          statExpenses.textContent = `$${totalExpenses.toFixed(0)}`;
        }

        // Load members count
        const members = await getHouseholdMembers(currentHousehold.id);
        if (statMembers) {
          statMembers.textContent = members.length;
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    }

    async function loadUpcomingChores() {
      if (!currentHousehold || !upcomingChoresEl) return;

      try {
        const chores = await getIncompleteChores(currentHousehold.id);
        
        if (chores.length === 0) {
          upcomingChoresEl.innerHTML = `
            <div class="card-body text-center text-muted py-4">
              <p class="mb-0">No upcoming chores. Great job! 🎉</p>
            </div>
          `;
          return;
        }

        const choresList = chores.slice(0, 3).map(chore => {
          const dueDate = new Date(chore.dueDate + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const isToday = dueDate.toDateString() === today.toDateString();
          const isTomorrow = dueDate.toDateString() === new Date(today.getTime() + 86400000).toDateString();
          
          let dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (isToday) dueDateStr = 'Today';
          else if (isTomorrow) dueDateStr = 'Tomorrow';

          return `
            <div class="d-flex align-items-center py-3 border-bottom chore-item" data-chore-id="${chore.id}">
              <div class="flex-grow-1 me-2">
                <div class="fw-semibold mb-1">${esc(chore.name)}</div>
                <small class="text-muted">
                  ${esc(chore.assigneeName)} • ${esc(chore.frequency)}
                </small>
              </div>
              <div class="text-end d-flex flex-column align-items-end gap-1">
                <span class="badge ${isToday ? 'bg-danger' : isTomorrow ? 'bg-warning text-dark' : 'bg-secondary'}">${dueDateStr}</span>
                <button class="btn btn-success btn-sm complete-chore-btn" data-chore-id="${chore.id}">
                  <small>✓ Complete</small>
                </button>
              </div>
            </div>
          `;
        }).join('');

        upcomingChoresEl.innerHTML = `<div class="card-body scrollable-list">${choresList}</div>`;
        
        // Attach event listeners to complete buttons
        upcomingChoresEl.querySelectorAll('.complete-chore-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const choreId = btn.dataset.choreId;
            await handleCompleteChore(choreId, btn);
          });
        });
      } catch (error) {
        console.error('Error loading chores:', error);
        upcomingChoresEl.innerHTML = `
          <div class="card-body text-center text-muted py-4">
            <p class="mb-0">Failed to load chores</p>
          </div>
        `;
      }
    }

    async function loadRecentExpenses() {
      if (!currentHousehold || !recentExpensesEl) return;

      try {
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('householdId', '==', currentHousehold.id),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        
        const expensesSnapshot = await getDocs(expensesQuery);
        
        if (expensesSnapshot.empty) {
          recentExpensesEl.innerHTML = `
            <div class="card-body text-center text-muted py-4">
              <p class="mb-0">No expenses yet. Add your first expense!</p>
            </div>
          `;
          return;
        }

        const expensesList = [];
        expensesSnapshot.forEach(doc => {
          const expense = doc.data();
          const expenseId = doc.id;
          const date = expense.createdAt?.toDate ? expense.createdAt.toDate() : new Date();
          const participants = expense.participants || [];
          const splitAmount = participants.length > 0 ? expense.amount / participants.length : expense.amount;
          
          expensesList.push(`
            <div class="d-flex align-items-center py-3 border-bottom expense-item" data-expense-id="${expenseId}">
              <div class="flex-grow-1 me-2">
                <div class="fw-semibold mb-1">${esc(expense.description || 'Expense')}</div>
                <small class="text-muted">
                  ${esc(expense.paidBy || 'Unknown')} paid • ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </small>
                <div><small class="text-muted">Split: $${splitAmount.toFixed(2)} each</small></div>
              </div>
              <div class="text-end d-flex flex-column align-items-end gap-1">
                <span class="fw-bold text-success">$${(expense.amount || 0).toFixed(2)}</span>
                <button class="btn btn-danger btn-sm delete-expense-btn" data-expense-id="${expenseId}">
                  <small>✗ Delete</small>
                </button>
              </div>
            </div>
          `);
        });

        recentExpensesEl.innerHTML = `<div class="card-body scrollable-list">${expensesList.join('')}</div>`;
        
        // Attach event listeners to delete buttons
        recentExpensesEl.querySelectorAll('.delete-expense-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const expenseId = btn.dataset.expenseId;
            await handleDeleteExpense(expenseId, btn);
          });
        });
      } catch (error) {
        console.error('Error loading expenses:', error);
        recentExpensesEl.innerHTML = `
          <div class="card-body text-center text-muted py-4">
            <p class="mb-0">Failed to load expenses</p>
          </div>
        `;
      }
    }

    async function loadHouseholdMembers() {
      if (!currentHousehold || !householdMembersEl) return;

      try {
        const members = await getHouseholdMembers(currentHousehold.id);
        
        if (members.length === 0) {
          householdMembersEl.innerHTML = `
            <div class="card-body text-center text-muted py-4">
              <p class="mb-0">No members found</p>
            </div>
          `;
          return;
        }

        const membersList = members.map(member => `
          <div class="d-flex align-items-center py-2 border-bottom">
            <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3" 
                 style="width: 40px; height: 40px; font-size: 1.2rem;">
              ${esc(member.displayName.charAt(0).toUpperCase())}
            </div>
            <div class="flex-grow-1">
              <div class="fw-semibold">${esc(member.displayName)}</div>
              <small class="text-muted">${member.isCreator ? '👑 Creator' : 'Member'}</small>
            </div>
          </div>
        `).join('');

        householdMembersEl.innerHTML = `<div class="card-body">${membersList}</div>`;
      } catch (error) {
        console.error('Error loading members:', error);
        householdMembersEl.innerHTML = `
          <div class="card-body text-center text-muted py-4">
            <p class="mb-0">Failed to load members</p>
          </div>
        `;
      }
    }

    function setupModals() {
      // Populate chore assignee dropdown
      const quickChoreAssignee = document.getElementById('quick-chore-assignee');
      if (quickChoreAssignee) {
        quickChoreAssignee.innerHTML = '<option value="">Select member...</option>';
        householdMembers.forEach(member => {
          const option = document.createElement('option');
          option.value = member.uid;
          option.textContent = member.displayName;
          quickChoreAssignee.appendChild(option);
        });
      }

      // Populate expense paid by dropdown
      const quickExpensePaidBy = document.getElementById('quick-expense-paidby');
      if (quickExpensePaidBy) {
        quickExpensePaidBy.innerHTML = '<option value="">Select who paid...</option>';
        householdMembers.forEach(member => {
          const option = document.createElement('option');
          option.value = member.displayName;
          option.textContent = member.displayName;
          option.dataset.uid = member.uid;
          quickExpensePaidBy.appendChild(option);
        });
      }

      // Populate expense participants checkboxes
      const quickExpenseParticipants = document.getElementById('quick-expense-participants');
      if (quickExpenseParticipants) {
        quickExpenseParticipants.innerHTML = '';
        householdMembers.forEach(member => {
          const div = document.createElement('div');
          div.className = 'form-check';
          div.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${esc(member.displayName)}" 
                   id="participant-${esc(member.uid)}" checked>
            <label class="form-check-label" for="participant-${esc(member.uid)}">
              ${esc(member.displayName)}
            </label>
          `;
          quickExpenseParticipants.appendChild(div);
        });
      }

      // Set default dates
      const today = new Date().toISOString().split('T')[0];
      const quickChoreDue = document.getElementById('quick-chore-due');
      const quickExpenseDate = document.getElementById('quick-expense-date');
      if (quickChoreDue) quickChoreDue.value = today;
      if (quickExpenseDate) quickExpenseDate.value = today;

      // Reset forms when modals are closed
      if (addChoreModal) {
        addChoreModal.addEventListener('hidden.bs.modal', () => {
          quickChoreForm?.reset();
          if (quickChoreDue) quickChoreDue.value = today;
        });
      }

      if (addExpenseModal) {
        addExpenseModal.addEventListener('hidden.bs.modal', () => {
          quickExpenseForm?.reset();
          if (quickExpenseDate) quickExpenseDate.value = today;
          // Re-check all participants
          quickExpenseParticipants?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
          });
        });
      }

      // Handle chore form submission
      if (submitQuickChore) {
        submitQuickChore.addEventListener('click', async () => {
          if (!quickChoreForm.checkValidity()) {
            quickChoreForm.reportValidity();
            return;
          }

          const formData = new FormData(quickChoreForm);
          const assigneeId = formData.get('assignee');
          const assigneeMember = householdMembers.find(m => m.uid === assigneeId);

          try {
            submitQuickChore.disabled = true;
            submitQuickChore.textContent = 'Adding...';

            await createChore({
              name: formData.get('name'),
              assigneeId: assigneeId,
              assigneeName: assigneeMember ? assigneeMember.displayName : '',
              frequency: formData.get('frequency'),
              dueDate: formData.get('due'),
              householdId: currentHousehold.id
            });

            // Reset form and close modal
            quickChoreForm.reset();
            bsChoreModal.hide();
            
            // Reload data
            await Promise.all([loadStats(), loadUpcomingChores()]);
            
            showSuccessMessage('Chore added successfully!');
          } catch (error) {
            console.error('Error adding chore:', error);
            showErrorMessage('Failed to add chore. Please try again.');
          } finally {
            submitQuickChore.disabled = false;
            submitQuickChore.textContent = 'Add Chore';
          }
        });
      }

      // Handle expense form submission
      if (submitQuickExpense) {
        submitQuickExpense.addEventListener('click', async () => {
          if (!quickExpenseForm.checkValidity()) {
            quickExpenseForm.reportValidity();
            return;
          }

          const formData = new FormData(quickExpenseForm);
          
          // Get checked participants
          const participantCheckboxes = quickExpenseParticipants.querySelectorAll('input[type="checkbox"]:checked');
          const participants = Array.from(participantCheckboxes).map(cb => cb.value);

          if (participants.length === 0) {
            showErrorMessage('Please select at least one participant.');
            return;
          }

          try {
            submitQuickExpense.disabled = true;
            submitQuickExpense.textContent = 'Adding...';

            await addExpense(currentHousehold.id, {
              description: formData.get('description'),
              amount: parseFloat(formData.get('amount')),
              paidBy: formData.get('paidBy'),
              participants: participants,
              date: formData.get('date')
            });

            // Reset form and close modal
            quickExpenseForm.reset();
            bsExpenseModal.hide();
            
            // Reload data
            await Promise.all([loadStats(), loadRecentExpenses()]);
            
            showSuccessMessage('Expense added successfully!');
          } catch (error) {
            console.error('Error adding expense:', error);
            showErrorMessage('Failed to add expense. Please try again.');
          } finally {
            submitQuickExpense.disabled = false;
            submitQuickExpense.textContent = 'Add Expense';
          }
        });
      }

      // Handle invite code modal
      if (showInviteBtn) {
        showInviteBtn.addEventListener('click', () => {
          if (modalInviteCode) {
            modalInviteCode.textContent = currentHousehold.inviteCode || '------';
          }
          bsInviteModal.show();
        });
      }

      if (modalCopyInvite) {
        modalCopyInvite.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(currentHousehold.inviteCode);
            const originalText = modalCopyInvite.textContent;
            modalCopyInvite.textContent = '✓ Copied!';
            modalCopyInvite.classList.remove('btn-primary');
            modalCopyInvite.classList.add('btn-success');
            setTimeout(() => {
              modalCopyInvite.textContent = originalText;
              modalCopyInvite.classList.remove('btn-success');
              modalCopyInvite.classList.add('btn-primary');
            }, 2000);
          } catch (error) {
            console.error('Failed to copy:', error);
            showErrorMessage('Failed to copy invite code.');
          }
        });
      }
    }

    async function handleCompleteChore(choreId, button) {
      if (!choreId) return;

      try {
        button.disabled = true;
        button.innerHTML = '<small>⏳...</small>';

        await toggleChoreCompletion(choreId, true);
        
        // Reload data
        await Promise.all([loadStats(), loadUpcomingChores()]);
        
        showSuccessMessage('Chore marked as complete! 🎉');
      } catch (error) {
        console.error('Error completing chore:', error);
        showErrorMessage('Failed to complete chore.');
        button.disabled = false;
        button.innerHTML = '<small>✓ Complete</small>';
      }
    }

    async function handleDeleteExpense(expenseId, button) {
      if (!expenseId) return;

      if (!confirm('Are you sure you want to delete this expense?')) {
        return;
      }

      try {
        button.disabled = true;
        button.innerHTML = '<small>⏳...</small>';

        await deleteExpense(expenseId);
        
        // Reload data
        await Promise.all([loadStats(), loadRecentExpenses()]);
        
        showSuccessMessage('Expense deleted successfully!');
      } catch (error) {
        console.error('Error deleting expense:', error);
        showErrorMessage('Failed to delete expense.');
        button.disabled = false;
        button.innerHTML = '<small>✗ Delete</small>';
      }
    }

    function showSuccessMessage(message) {
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

    function showErrorMessage(message) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
      alert.style.zIndex = '9999';
      alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      document.body.appendChild(alert);
      setTimeout(() => alert.remove(), 3000);
    }
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initHomePage = initHomePage;
})();
