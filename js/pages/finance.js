(function(){
  const {getJSON, setJSON, escape: esc, getTimeAgo} = window.Cohabit;
  let expenseChart = null;
  let balanceChart = null;

  function initFinancePage(){
    const page = document.getElementById('finance-page');
    if(!page) return;
    const form = document.getElementById('expense-form');
    const expenseList = document.getElementById('expense-list');
    const balanceList = document.getElementById('balance-list');
    let expenses = getJSON('cohabit_expenses', []);

    render();
    updateStats();
    updateCharts();
    renderSettlements();
    renderTransactions();

    form.addEventListener('submit', e => {
      e.preventDefault();
      const desc=form.description.value.trim();
      const amt=parseFloat(form.amount.value);
      const paidBy=form.paidBy.value.trim();
      const participants=form.participants.value.split(',').map(s=>s.trim()).filter(Boolean);
      if(!desc||!isFinite(amt)||amt<=0||!paidBy||participants.length===0){return;}
      expenses.push({id:uid(), desc, amt, paidBy, participants, date:Date.now()});
      setJSON('cohabit_expenses', expenses);
      form.reset();
      render();
      updateStats();
      updateCharts();
      renderSettlements();
      renderTransactions();
    });

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
          const share = exp.amt / exp.participants.length;
          return `
            <div class="expense-card" data-expense-id="${exp.id}">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="flex-grow-1">
                  <h6 class="mb-1">${esc(exp.desc)}</h6>
                  <small class="text-muted">Paid by ${esc(exp.paidBy)}</small>
                </div>
                <div class="d-flex align-items-center gap-2">
                  <div class="expense-amount">$${exp.amt.toFixed(2)}</div>
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
          btn.addEventListener('click', function() {
            const expenseId = this.getAttribute('data-expense-id');
            if(confirm('Delete this expense?')) {
              expenses = expenses.filter(e => e.id !== expenseId);
              setJSON('cohabit_expenses', expenses);
              render();
              updateStats();
              updateCharts();
              renderSettlements();
              renderTransactions();
            }
          });
        });
      }

      // Calculate and render balances
      const balances={};
      expenses.forEach(ex => {
        const share = ex.amt / ex.participants.length;
        if(!balances[ex.paidBy]) balances[ex.paidBy] = 0;
        balances[ex.paidBy] += ex.amt;
        ex.participants.forEach(p => {
          if(!balances[p]) balances[p] = 0;
          balances[p] -= share;
        });
      });

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
      setJSON('cohabit_balances_cache', balances);
    }

    function renderSettlements(){
      const list = document.getElementById('settlements-list');
      if(!list) return;
      // Calculate balances
      const balances = {};
      expenses.forEach(ex => {
        const share = ex.amt / ex.participants.length;
        if(!balances[ex.paidBy]) balances[ex.paidBy] = 0;
        balances[ex.paidBy] += ex.amt;
        ex.participants.forEach(p => {
          if(!balances[p]) balances[p] = 0;
          balances[p] -= share;
        });
      });
      // Split into creditors and debtors
      const creditors = [];
      const debtors = [];
      Object.entries(balances).forEach(([name, amount]) => {
        if(amount > 0.01) { creditors.push({name, amount}); }
        else if(amount < -0.01) { debtors.push({name, amount: Math.abs(amount)}); }
      });
      // Calculate settlements
      const settlements = [];
      const creditorsCopy = creditors.map(c => ({...c}));
      const debtorsCopy = debtors.map(d => ({...d}));
      debtorsCopy.forEach(debtor => {
        let remaining = debtor.amount;
        creditorsCopy.forEach(creditor => {
          if(remaining > 0.01 && creditor.amount > 0.01) {
            const payment = Math.min(remaining, creditor.amount);
            settlements.push({ from: debtor.name, to: creditor.name, amount: payment });
            remaining -= payment;
            creditor.amount -= payment;
          }
        });
      });
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
        btn.addEventListener('click', function() {
          const data = this.getAttribute('data-settlement');
          try{
            const parsed = JSON.parse(data);
            const settlement = { from: parsed.from, to: parsed.to, amount: parseFloat(parsed.amount) };
            if(confirm(`Mark payment of $${settlement.amount.toFixed(2)} from ${settlement.from} to ${settlement.to} as settled?`)) {
              expenses.push({
                id: uid(),
                desc: `Settlement: ${settlement.from} → ${settlement.to}`,
                amt: settlement.amount,
                paidBy: settlement.from,
                participants: [settlement.to],
                date: Date.now(),
                isSettlement: true
              });
              setJSON('cohabit_expenses', expenses);
              render();
              updateStats();
              updateCharts();
              renderSettlements();
              renderTransactions();
            }
          }catch(e){}
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
            const isSettlement = exp.isSettlement || (exp.desc && exp.desc.startsWith('Settlement:'));
            return `
              <div class="transaction-item ${isSettlement ? 'settlement-transaction' : ''}">
                <div class="transaction-icon">${isSettlement ? '✓' : '💳'}</div>
                <div class="transaction-details">
                  <div class="transaction-header">
                    <h6 class="transaction-title">${esc(exp.desc)}</h6>
                    <span class="transaction-amount">$${exp.amt.toFixed(2)}</span>
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
      const total = expenses.reduce((sum, exp) => sum + exp.amt, 0);
      const participants = new Set(expenses.flatMap(exp => [exp.paidBy, ...exp.participants]));
      const totalEl = document.getElementById('totalExpenses');
      const countEl = document.getElementById('expenseCount');
      const participantsEl = document.getElementById('activeParticipants');
      if(totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
      if(countEl) countEl.textContent = expenses.length;
      if(participantsEl) participantsEl.textContent = participants.size;
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
        expenseCategories[exp.desc] = (expenseCategories[exp.desc] || 0) + exp.amt;
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
      const balances = {};
      expenses.forEach(ex => {
        const share = ex.amt / ex.participants.length;
        if(!balances[ex.paidBy]) balances[ex.paidBy] = 0;
        balances[ex.paidBy] += ex.amt;
        ex.participants.forEach(p => {
          if(!balances[p]) balances[p] = 0;
          balances[p] -= share;
        });
      });
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
  }

  // Small shim for uid (uses helpers.js or local fallback)
  function uid(){ return (window.Cohabit && window.Cohabit.uid) ? window.Cohabit.uid() : Math.random().toString(36).slice(2,10); }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initFinancePage = initFinancePage;
})();
