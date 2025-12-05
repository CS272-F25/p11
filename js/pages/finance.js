import { auth } from '../../firebase.js';
import { getCurrentUserHousehold, getHouseholdMembers } from '../utils/household.js';
import {
  addExpense,
  deleteExpense,
  subscribeToExpenses,
  addSettlement,
  calculateBalances,
  calculateSettlements,
  getExpenseStats
} from '../utils/finance.js';

(function(){
  const {escape: esc, getTimeAgo} = window.Cohabit;
  let expenseChart = null;
  let balanceChart = null;
  let currentHousehold = null;
  let unsubscribe = null;
  let expenses = [];

  async function initFinancePage(){
    const page = document.getElementById('finance-page');
    if(!page) return;
    
    // Show loading state
    const originalContent = page.innerHTML;
    page.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3 text-muted">Loading finance data...</p>
      </div>
    `;

    // Wait for auth state to be ready
    await new Promise((resolve) => {
      const unsubscribeAuth = auth.onAuthStateChanged((user) => {
        unsubscribeAuth();
        resolve(user);
      });
    });

    // Check authentication
    const user = auth.currentUser;
    if (!user) {
      window.location.href = '/login.html';
      return;
    }

    try {
      // Get current household
      currentHousehold = await getCurrentUserHousehold();
      
      if (!currentHousehold) {
        page.innerHTML = `
          <div class="alert alert-warning">
            <h5>No Household Found</h5>
            <p>You need to create or join a household first.</p>
            <a href="/household-setup.html" class="btn btn-primary">Go to Household Setup</a>
          </div>
        `;
        return;
      }

      // Restore original content
      page.innerHTML = originalContent;

      // Get form references after restoring content
      const form = document.getElementById('expense-form');
      const expenseList = document.getElementById('expense-list');
      const balanceList = document.getElementById('balance-list');
      const paidBySelect = document.getElementById('exPaidBy');
      const participantsSelect = document.getElementById('exParticipants');

      // Load household members and populate dropdowns
      const householdMembers = await getHouseholdMembers(currentHousehold.id);
      
      // Populate Paid By dropdown
      paidBySelect.innerHTML = '<option value="">Select member...</option>' +
        householdMembers.map(member => 
          `<option value="${esc(member.displayName)}">${esc(member.displayName)}</option>`
        ).join('');
      
      // Populate Participants dropdown
      participantsSelect.innerHTML = 
        householdMembers.map(member => 
          `<option value="${esc(member.displayName)}">${esc(member.displayName)}</option>`
        ).join('');
      
      // Set default: select all participants
      Array.from(participantsSelect.options).forEach(option => option.selected = true);

      // Define all the rendering functions with access to DOM elements
      function render(){
        // Render expenses
        if(expenses.length === 0){
          expenseList.innerHTML=`
            <div class="empty-state">
              <div class="empty-state-icon">💸</div>
              <h5>No expenses yet</h5>
              <p>Add your first expense to get started</p>
            </div>
          `;
        } else {
          expenseList.innerHTML = expenses.map((exp) => {
            const share = exp.amount / exp.participants.length;
            return `
              <div class="expense-card" data-expense-id="${exp.id}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div class="flex-grow-1">
                    <h6 class="mb-1">${esc(exp.description)}</h6>
                    <small class="text-muted">Paid by ${esc(exp.paidBy)}</small>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <div class="expense-amount">$${exp.amount.toFixed(2)}</div>
                    <button class="btn btn-sm btn-outline-danger delete-expense-btn" data-expense-id="${exp.id}" aria-label="Delete expense">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="expense-participants">
                  ${exp.participants.map(p => `<span class="participant-badge">${esc(p)}</span>`).join('')}
                </div>
                <div class="mt-2 text-muted" style="font-size: 0.85rem;">
                  Each owes: <strong>$${share.toFixed(2)}</strong>
                </div>
              </div>
            `;
          }).join('');
          // Add delete event listeners
          document.querySelectorAll('.delete-expense-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
              const expenseId = this.getAttribute('data-expense-id');
              if (confirm('Delete this expense?')) {
                this.disabled = true;
                try {
                  await deleteExpense(expenseId);
                } catch (error) {
                  console.error('Error deleting expense:', error);
                  alert('Failed to delete expense: ' + error.message);
                  this.disabled = false;
                }
              }
            });
          });
        }

        // Calculate and render balances
        const balances = calculateBalances(expenses);
        const balanceEntries = Object.entries(balances);

        if(balanceEntries.length === 0){
          balanceList.innerHTML=`
            <div class="empty-state">
              <div class="empty-state-icon">💰</div>
              <p>Balances will appear here</p>
            </div>
          `;
        } else {
          balanceList.innerHTML = balanceEntries.map(([name, bal]) => {
            const isPositive = bal > 0.01;
            const isNegative = bal < -0.01;
            const statusClass = isPositive ? 'positive' : isNegative ? 'negative' : '';
            const statusText = isPositive ? 'Is owed' : isNegative ? 'Owes' : 'Settled';
            return `
              <div class="balance-card ${statusClass} mb-3">
                <div class="balance-name">${esc(name)}</div>
                <div class="balance-amount ${statusClass}">$${Math.abs(bal).toFixed(2)}</div>
                <small class="text-muted">${statusText}</small>
              </div>
            `;
          }).join('');
        }
      }

      function renderSettlements(){
        const list = document.getElementById('settlements-list');
        if(!list) return;
        
        // Calculate balances and settlements
        const balances = calculateBalances(expenses);
        const settlements = calculateSettlements(balances);
        
        // Render settlements
        if(settlements.length === 0) {
          list.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">✅</div>
              <h5>All Settled!</h5>
              <p>No outstanding payments needed</p>
            </div>
          `;
          return;
        }
        list.innerHTML = settlements.map((s, idx) => `
          <div class="settlement-card" data-settlement-idx="${idx}">
            <div class="settlement-icon">💳</div>
            <div class="settlement-content">
              <div class="settlement-from">${esc(s.from)}</div>
              <div class="settlement-arrow">→</div>
              <div class="settlement-to">${esc(s.to)}</div>
            </div>
            <div class="settlement-amount">$${s.amount.toFixed(2)}</div>
            <button class="btn btn-sm btn-success settle-payment-btn" data-settlement='${JSON.stringify({from:"__FROM__",to:"__TO__",amount:"__AMT__"})}' aria-label="Mark as settled">
              ✓ Settle
            </button>
          </div>
        `.replace('__FROM__', s.from).replace('__TO__', s.to).replace('__AMT__', s.amount)).join('');
        // Add settle event listeners
        document.querySelectorAll('.settle-payment-btn').forEach(btn => {
          btn.addEventListener('click', async function() {
            const data = this.getAttribute('data-settlement');
            try {
              const parsed = JSON.parse(data);
              const settlement = { from: parsed.from, to: parsed.to, amount: parseFloat(parsed.amount) };
              if (confirm(`Mark payment of $${settlement.amount.toFixed(2)} from ${settlement.from} to ${settlement.to} as settled?`)) {
                this.disabled = true;
                this.textContent = 'Settling...';
                try {
                  await addSettlement(currentHousehold.id, settlement);
                } catch (error) {
                  console.error('Error adding settlement:', error);
                  alert('Failed to record settlement: ' + error.message);
                  this.disabled = false;
                  this.textContent = '✓ Settle';
                }
              }
            } catch (e) {
              console.error('Error parsing settlement data:', e);
            }
          });
        });
      }

      function renderTransactions(){
        const list = document.getElementById('transactions-list');
        if(!list) return;
        if(expenses.length === 0) {
          list.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">📜</div>
              <p>Transaction history will appear here</p>
            </div>
          `;
          return;
        }
        const sortedExpenses = [...expenses].sort((a, b) => b.date - a.date);
        const recentExpenses = sortedExpenses.slice(0, 10);
        list.innerHTML = `
          <div class="transaction-timeline">
            ${recentExpenses.map(exp => {
              const isSettlement = exp.isSettlement || (exp.description && exp.description.startsWith('Settlement:'));
              return `
                <div class="transaction-item ${isSettlement ? 'settlement-transaction' : ''}">
                  <div class="transaction-icon">${isSettlement ? '✓' : '💳'}</div>
                  <div class="transaction-details">
                    <div class="transaction-header">
                      <h6 class="transaction-title">${esc(exp.description)}</h6>
                      <span class="transaction-amount">$${exp.amount.toFixed(2)}</span>
                    </div>
                    <div class="transaction-meta">
                      <span class="transaction-payer">Paid by ${esc(exp.paidBy)}</span>
                      <span class="transaction-separator">•</span>
                      <span class="transaction-participants">${exp.participants.map(esc).join(', ')}</span>
                    </div>
                    <div class="transaction-time">${getTimeAgo(exp.date)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          ${sortedExpenses.length > 10 ? `<div class="text-center mt-3 text-muted small">Showing 10 most recent of ${sortedExpenses.length} transactions</div>` : ''}
        `;
      }

      function updateStats(){
        const stats = getExpenseStats(expenses);
        const totalEl = document.getElementById('totalExpenses');
        const countEl = document.getElementById('expenseCount');
        const participantsEl = document.getElementById('activeParticipants');
        if(totalEl) totalEl.textContent = `$${stats.total.toFixed(2)}`;
        if(countEl) countEl.textContent = stats.count;
        if(participantsEl) participantsEl.textContent = stats.participantCount;
      }

      function updateCharts(){
        if(typeof Chart === 'undefined') return;
        const expenseCanvas = document.getElementById('expenseChart');
        const expenseEmpty = document.getElementById('expenseChartEmpty');
        const balanceCanvas = document.getElementById('balanceChart');
        const balanceEmpty = document.getElementById('balanceChartEmpty');
        if(!expenseCanvas || !balanceCanvas) return;
        // Show/hide empty states
        if(expenses.length === 0){
          if(expenseCanvas) expenseCanvas.style.display = 'none';
          if(expenseEmpty) expenseEmpty.style.display = 'block';
          if(balanceCanvas) balanceCanvas.style.display = 'none';
          if(balanceEmpty) balanceEmpty.style.display = 'block';
          return;
        }
        if(expenseCanvas) expenseCanvas.style.display = 'block';
        if(expenseEmpty) expenseEmpty.style.display = 'none';
        if(balanceCanvas) balanceCanvas.style.display = 'block';
        if(balanceEmpty) balanceEmpty.style.display = 'none';
        // Expense Breakdown Chart (Doughnut)
        const expenseCategories = {};
        expenses.forEach(exp => {
          expenseCategories[exp.description] = (expenseCategories[exp.description] || 0) + exp.amount;
        });
        const expenseLabels = Object.keys(expenseCategories);
        const expenseData = Object.values(expenseCategories);
        const expenseColors = generateColors(expenseLabels.length);
        if(expenseChart) expenseChart.destroy();
        expenseChart = new Chart(expenseCanvas, {
          type: 'doughnut',
          data: { labels: expenseLabels, datasets: [{ data: expenseData, backgroundColor: expenseColors, borderWidth: 2, borderColor: '#ffffff' }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 15, font: {size: 12} } }, tooltip: { callbacks: { label: c => c.label + ': $' + c.parsed.toFixed(2) } } } }
        });
        // Balance Chart (Bar)
        const balances = calculateBalances(expenses);
        const balanceLabels = Object.keys(balances);
        const balanceData = Object.values(balances);
        const balanceColors = balanceData.map(val => val > 0.01 ? '#22c55e' : val < -0.01 ? '#ef4444' : '#6366f1');
        if(balanceChart) balanceChart.destroy();
        balanceChart = new Chart(balanceCanvas, {
          type: 'bar',
          data: { labels: balanceLabels, datasets: [{ label: 'Balance ($)', data: balanceData, backgroundColor: balanceColors, borderWidth: 0, borderRadius: 6 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: {display: false}, tooltip: { callbacks: { label: function(context){ const val = context.parsed.y; const status = val > 0 ? 'Is owed' : val < 0 ? 'Owes' : 'Settled'; return status + ': $' + Math.abs(val).toFixed(2); } } } }, scales: { y: { beginAtZero: true, grid: {color: '#e2e8f0'}, ticks: { callback: value => '$' + value.toFixed(0) } }, x: { grid: {display: false} } } }
        });
      }

      function generateColors(count){
        const colors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
        return Array.from({length: count}, (_, i) => colors[i % colors.length]);
      }

      // Initial render
      render();
      updateStats();
      updateCharts();
      renderSettlements();
      renderTransactions();

      // Subscribe to real-time expense updates
      unsubscribe = subscribeToExpenses(currentHousehold.id, (updatedExpenses) => {
        expenses = updatedExpenses;
        render();
        updateStats();
        updateCharts();
        renderSettlements();
        renderTransactions();
      });

      // Form submission handler
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const desc = form.description.value.trim();
        const amt = parseFloat(form.amount.value);
        const paidBy = paidBySelect.value;
        
        // Get selected participants from multi-select
        const selectedOptions = Array.from(participantsSelect.selectedOptions);
        const participants = selectedOptions.map(option => option.value);
        
        if (!desc || !isFinite(amt) || amt <= 0 || !paidBy || participants.length === 0) {
          alert('Please fill in all fields correctly and select at least one participant');
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';

        try {
          await addExpense(currentHousehold.id, {
            description: desc,
            amount: amt,
            paidBy: paidBy,
            participants: participants
          });
          
          // Reset form but keep participants selected
          form.description.value = '';
          form.amount.value = '';
          // Keep the paidBy and participants selections
        } catch (error) {
          console.error('Error adding expense:', error);
          alert('Failed to add expense: ' + error.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });

    } catch (error) {
      console.error('Error initializing finance page:', error);
      page.innerHTML = `
        <div class="alert alert-danger">
          <h5>Error Loading Finance Data</h5>
          <p>${error.message}</p>
        </div>
      `;
      return;
    }
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initFinancePage = initFinancePage;
})();
