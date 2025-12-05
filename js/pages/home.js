import { auth, db } from '../../firebase.js';
import { 
  getCurrentUserHousehold, 
  getHouseholdMembers 
} from '../utils/household.js';
import { 
  getIncompleteChores,
  getChoresDueSoon 
} from '../utils/chores.js';
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

    let currentHousehold = null;

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

          // Load all data
          await Promise.all([
            loadHouseholdInfo(),
            loadStats(),
            loadUpcomingChores(),
            loadRecentExpenses(),
            loadHouseholdMembers()
          ]);

        } catch (error) {
          console.error('Error loading home page:', error);
        }
      } else {
        window.location.href = '/login.html';
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
        const chores = await getChoresDueSoon(currentHousehold.id);
        
        if (chores.length === 0) {
          upcomingChoresEl.innerHTML = `
            <div class="card-body text-center text-muted py-4">
              <p class="mb-0">No upcoming chores. Great job! 🎉</p>
            </div>
          `;
          return;
        }

        const choresList = chores.slice(0, 5).map(chore => {
          const dueDate = new Date(chore.dueDate + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const isToday = dueDate.toDateString() === today.toDateString();
          const isTomorrow = dueDate.toDateString() === new Date(today.getTime() + 86400000).toDateString();
          
          let dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (isToday) dueDateStr = 'Today';
          else if (isTomorrow) dueDateStr = 'Tomorrow';

          return `
            <div class="d-flex align-items-center py-2 border-bottom">
              <div class="flex-grow-1">
                <div class="fw-semibold">${esc(chore.name)}</div>
                <small class="text-muted">
                  ${esc(chore.assigneeName)} • ${esc(chore.frequency)}
                </small>
              </div>
              <div class="text-end">
                <span class="badge ${isToday ? 'bg-danger' : isTomorrow ? 'bg-warning text-dark' : 'bg-secondary'}">${dueDateStr}</span>
              </div>
            </div>
          `;
        }).join('');

        upcomingChoresEl.innerHTML = `<div class="card-body">${choresList}</div>`;
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
          limit(5)
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
          const date = expense.createdAt?.toDate ? expense.createdAt.toDate() : new Date();
          expensesList.push(`
            <div class="d-flex align-items-center py-2 border-bottom">
              <div class="flex-grow-1">
                <div class="fw-semibold">${esc(expense.description || 'Expense')}</div>
                <small class="text-muted">
                  ${esc(expense.paidBy || 'Unknown')} • ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </small>
              </div>
              <div class="text-end">
                <span class="fw-bold text-success">$${(expense.amount || 0).toFixed(2)}</span>
              </div>
            </div>
          `);
        });

        recentExpensesEl.innerHTML = `<div class="card-body">${expensesList.join('')}</div>`;
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
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initHomePage = initHomePage;
})();
