// CoHabit draft feature logic (client-side demo only)
(function(){
  const ls = window.localStorage;
  const getJSON = (key, fallback) => {try{const v = ls.getItem(key);return v?JSON.parse(v):fallback;}catch(e){return fallback;}};
  const setJSON = (key, value) => {try{ls.setItem(key, JSON.stringify(value));}catch(e){}}

  document.addEventListener('DOMContentLoaded', () => {
   
    initDirectoryPage();
    initFinancePage();
    initChoresPage();
    initNotificationsPage();
    initSearchPage();
    initProfilePage();
    // update dashboard counts on load
    updateDashboardCounts();
  });


  function updateDashboardCounts(){
    try{
      const chores = getJSON('cohabit_chores', []);
      const expenses = getJSON('cohabit_expenses', []);
      const roommates = getJSON('cohabit_roommates', []);
      const mdChores = document.getElementById('md-chores');
      const mdBills = document.getElementById('md-bills');
      const mdRoommates = document.getElementById('md-roommates');
      if(mdChores) mdChores.textContent = String(chores.filter(c => !c.done).length);
      if(mdBills) mdBills.textContent = String(expenses.length);
      if(mdRoommates) mdRoommates.textContent = String(roommates.length);
    }catch(e){/* ignore if dashboard not present */}
  }

  // Directory
  function initDirectoryPage(){
    const page = document.getElementById('directory-page');
    if(!page) return;
    const form = document.getElementById('add-roommate-form');
    const container = document.getElementById('roommate-cards');
    let roommates = getJSON('cohabit_roommates', [
      {id: uid(), name:'Alice', email:'alice@example.com', tags:['early riser','non-smoker'], availability:'immediate'},
      {id: uid(), name:'Ben', email:'ben@example.com', tags:['night owl','gamer'], availability:'flexible'},
      {id: uid(), name:'Camila', email:'camila@example.com', tags:['tidy','cooks often'], availability:'next-month'}
    ]);
    render();
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name=form.name.value.trim();
      const email=form.email.value.trim();
      const tags=form.tags.value.split(',').map(t=>t.trim()).filter(Boolean);
      if(!name||!email){return;}
      roommates.push({id:uid(), name,email,tags,availability:'flexible'});
      setJSON('cohabit_roommates', roommates);
      form.reset();
      render();
    });
    function render(){
      container.innerHTML='';
      roommates.forEach(r => {
        const col = document.createElement('div');col.className='col-sm-6 col-lg-4';
        col.innerHTML=`<div class="card roommate-card p-3" data-id="${r.id}">
          <h3 class="h5">${escape(r.name)}</h3>
          <p class="mb-1"><a href="mailto:${escape(r.email)}">${escape(r.email)}</a></p>
          <div>${r.tags.map(t=>`<span class='badge-tag'>${escape(t)}</span>`).join('')}</div>
          <div class='mt-2 small text-muted'>Availability: ${escape(r.availability)}</div>
          <button class="btn btn-outline-danger btn-sm mt-2" aria-label="Remove ${escape(r.name)}">Remove</button>
        </div>`;
        const btn = col.querySelector('button');
        btn.addEventListener('click', () => {roommates = roommates.filter(x=>x.id!==r.id);setJSON('cohabit_roommates', roommates);render();});
        container.appendChild(col);
      });
      // update dashboard counts when roommates change
      updateDashboardCounts();
    }
  }

  // Finance
  function initFinancePage(){
    const page = document.getElementById('finance-page');
    if(!page) return;
    const form = document.getElementById('expense-form');
    const expenseList = document.getElementById('expense-list');
    const balanceList = document.getElementById('balance-list');
    let expenses = getJSON('cohabit_expenses', []);
    let expenseChart = null;
    let balanceChart = null;
    
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
        expenseList.innerHTML = expenses.map((exp, idx) => {
          const share = exp.amt / exp.participants.length;
          return `
            <div class="expense-card" data-expense-id="${exp.id}">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="flex-grow-1">
                  <h6 class="mb-1">${escape(exp.desc)}</h6>
                  <small class="text-muted">Paid by ${escape(exp.paidBy)}</small>
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
                ${exp.participants.map(p => `<span class="participant-badge">${escape(p)}</span>`).join('')}
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
              <div class="balance-name">${escape(name)}</div>
              <div class="balance-amount ${statusClass}">$${Math.abs(bal).toFixed(2)}</div>
              <small class="text-muted">${statusText}</small>
            </div>
          `;
        }).join('');
      }
      
      setJSON('cohabit_balances_cache', balances);
      // update dashboard counts when expenses change
      updateDashboardCounts();
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
      
      // Split into creditors (owed) and debtors (owe)
      const creditors = [];
      const debtors = [];
      
      Object.entries(balances).forEach(([name, amount]) => {
        if(amount > 0.01) {
          creditors.push({name, amount});
        } else if(amount < -0.01) {
          debtors.push({name, amount: Math.abs(amount)});
        }
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
            settlements.push({
              from: debtor.name,
              to: creditor.name,
              amount: payment
            });
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
            <div class="settlement-from">${escape(s.from)}</div>
            <div class="settlement-arrow">→</div>
            <div class="settlement-to">${escape(s.to)}</div>
          </div>
          <div class="settlement-amount">$${s.amount.toFixed(2)}</div>
          <button class="btn btn-sm btn-success settle-payment-btn" data-settlement='${JSON.stringify(s)}' aria-label="Mark as settled">
            ✓ Settle
          </button>
        </div>
      `).join('');
      
      // Add settle event listeners
      document.querySelectorAll('.settle-payment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const settlement = JSON.parse(this.getAttribute('data-settlement'));
          if(confirm(`Mark payment of $${settlement.amount.toFixed(2)} from ${settlement.from} to ${settlement.to} as settled?`)) {
            // Create a settlement expense entry
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
      
      // Sort expenses by date (most recent first)
      const sortedExpenses = [...expenses].sort((a, b) => b.date - a.date);
      
      // Show only the 10 most recent transactions
      const recentExpenses = sortedExpenses.slice(0, 10);
      
      list.innerHTML = `
        <div class="transaction-timeline">
          ${recentExpenses.map(exp => {
            const date = new Date(exp.date);
            const timeAgo = getTimeAgo(exp.date);
            const isSettlement = exp.isSettlement || exp.desc.startsWith('Settlement:');
            
            return `
              <div class="transaction-item ${isSettlement ? 'settlement-transaction' : ''}">
                <div class="transaction-icon">${isSettlement ? '✓' : '💳'}</div>
                <div class="transaction-details">
                  <div class="transaction-header">
                    <h6 class="transaction-title">${escape(exp.desc)}</h6>
                    <span class="transaction-amount">$${exp.amt.toFixed(2)}</span>
                  </div>
                  <div class="transaction-meta">
                    <span class="transaction-payer">Paid by ${escape(exp.paidBy)}</span>
                    <span class="transaction-separator">•</span>
                    <span class="transaction-participants">${exp.participants.map(escape).join(', ')}</span>
                  </div>
                  <div class="transaction-time">${timeAgo}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${sortedExpenses.length > 10 ? `<div class="text-center mt-3 text-muted small">Showing 10 most recent of ${sortedExpenses.length} transactions</div>` : ''}
      `;
    }
    
    function getTimeAgo(timestamp){
      const now = Date.now();
      const diff = now - timestamp;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if(days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
      if(hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      if(minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      return 'Just now';
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
        data: {
          labels: expenseLabels,
          datasets: [{
            data: expenseData,
            backgroundColor: expenseColors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 15,
                font: {size: 12}
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.label + ': $' + context.parsed.toFixed(2);
                }
              }
            }
          }
        }
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
      const balanceColors = balanceData.map(val => 
        val > 0.01 ? '#22c55e' : val < -0.01 ? '#ef4444' : '#6366f1'
      );
      
      if(balanceChart) balanceChart.destroy();
      balanceChart = new Chart(balanceCanvas, {
        type: 'bar',
        data: {
          labels: balanceLabels,
          datasets: [{
            label: 'Balance ($)',
            data: balanceData,
            backgroundColor: balanceColors,
            borderWidth: 0,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {display: false},
            tooltip: {
              callbacks: {
                label: function(context) {
                  const val = context.parsed.y;
                  const status = val > 0 ? 'Is owed' : val < 0 ? 'Owes' : 'Settled';
                  return status + ': $' + Math.abs(val).toFixed(2);
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {color: '#e2e8f0'},
              ticks: {
                callback: function(value) {
                  return '$' + value.toFixed(0);
                }
              }
            },
            x: {
              grid: {display: false}
            }
          }
        }
      });
    }
    
    function generateColors(count){
      const colors = [
        '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
      ];
      return Array.from({length: count}, (_, i) => colors[i % colors.length]);
    }
  }

  // Chores
  function initChoresPage(){
    const page=document.getElementById('chores-page');
    if(!page) return;
    const form=document.getElementById('chore-form');
    const list=document.getElementById('chore-list');
    let chores = getJSON('cohabit_chores', []);
    render();
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name=form.name.value.trim();
      const assignee=form.assignee.value.trim();
      const frequency=form.frequency.value;
      const due=form.due.value;
      if(!name||!assignee||!frequency||!due){return;}
      chores.push({id:uid(), name, assignee, frequency, due, done:false});
      setJSON('cohabit_chores', chores);
      form.reset();render();
    });
    function render(){
      list.innerHTML='';
      chores.forEach(c => {
        const col=document.createElement('div');col.className='col-md-6 col-lg-4';
        col.innerHTML=`<div class='card chore-card p-3 ${c.done?'done':''}' data-id='${c.id}'>
           <h3 class='h5'>${escape(c.name)}</h3>
           <p class='mb-1'><strong>${escape(c.assignee)}</strong> • ${escape(c.frequency)} • Due ${escape(c.due)}</p>
           <button class='btn btn-sm ${c.done?'btn-secondary':'btn-success'}'>${c.done?'Mark Incomplete':'Mark Done'}</button>
         </div>`;
        const btn=col.querySelector('button');
        btn.addEventListener('click', ()=>{c.done=!c.done;setJSON('cohabit_chores', chores);render();});
        list.appendChild(col);
      });
      // update dashboard counts when chores change
      updateDashboardCounts();
    }
  }

  // Notifications
  function initNotificationsPage(){
    const page=document.getElementById('notifications-page');
    if(!page) return;
    const ul=document.getElementById('notification-list');
    const chores=getJSON('cohabit_chores', []);
    const expenses=getJSON('cohabit_expenses', []);
    const liItems=[];
    const today=new Date();
    chores.forEach(c => {
      const dueDate=new Date(c.due+'T00:00:00');
      const diffDays=Math.round((dueDate - today)/(1000*60*60*24));
      if(!c.done && diffDays<=2){
        liItems.push({type:'chore', text:`Chore '${c.name}' due in ${diffDays} day(s).`});
      }
    });
    expenses.forEach(ex => {
      const ageDays=Math.round((Date.now()-ex.date)/(1000*60*60*24));
      if(ageDays>2){liItems.push({type:'expense', text:`Expense '${ex.desc}' added ${ageDays} days ago.`});}
    });
    ul.innerHTML='';
    if(liItems.length===0){ul.innerHTML='<li class="list-group-item">No notifications 🎉</li>';return;}
    liItems.forEach(n => {
      const li=document.createElement('li');li.className='list-group-item notification-item';
      const icon=n.type==='chore'?'🧹':'💵';
      li.innerHTML=`<span class='icon'>${icon}</span><span>${escape(n.text)}</span>`;
      ul.appendChild(li);
    });
  }

  // Search
  function initSearchPage(){
    const page=document.getElementById('search-page');
    if(!page) return;
    const form=document.getElementById('search-form');
    const results=document.getElementById('search-results');
    const base = getJSON('cohabit_roommates', []);
    const prospects = base.concat([
      {id:uid(), name:'Emma', tags:['quiet','early riser'], availability:'next-month'},
      {id:uid(), name:'Liam', tags:['gamer','night owl'], availability:'flexible'}
    ]);
    form.addEventListener('submit', e => {e.preventDefault(); perform();});
    function perform(){
      const q=form.query.value.trim().toLowerCase();
      const avail=form.availability.value;
      const filtered=prospects.filter(p => {
        const tagMatch = !q || p.tags.some(t=>t.toLowerCase().includes(q));
        const availMatch = !avail || p.availability===avail;
        return tagMatch && availMatch;
      });
      render(filtered);
    }
    function render(list){
      results.innerHTML='';
      if(list.length===0){results.innerHTML='<div class="col-12">No matches.</div>';return;}
      list.forEach(p => {
        const col=document.createElement('div');col.className='col-sm-6 col-lg-4';
        col.innerHTML=`<div class='card p-3'><h3 class='h5'>${escape(p.name)}</h3><div>${p.tags.map(t=>`<span class='badge-tag'>${escape(t)}</span>`).join('')}</div><div class='small text-muted mt-2'>Availability: ${escape(p.availability)}</div></div>`;
        results.appendChild(col);
      });
    }
    perform();
  }

  // Profile
  function initProfilePage(){
    const page=document.getElementById('profile-page');
    if(!page) return;
    const form=document.getElementById('profile-form');
    const preview=document.getElementById('profile-preview');
    let profile=getJSON('cohabit_profile', {name:'Your Name', email:'you@example.com', habits:'', noise:'moderate', availability:'flexible'});
    // preload
    form.name.value=profile.name;form.email.value=profile.email;form.habits.value=profile.habits;form.noise.value=profile.noise;form.availability.value=profile.availability;
    render();
    form.addEventListener('submit', e => {e.preventDefault();
      profile={name:form.name.value.trim(), email:form.email.value.trim(), habits:form.habits.value.trim(), noise:form.noise.value, availability:form.availability.value};
      setJSON('cohabit_profile', profile);render();
    });
    function render(){
      preview.innerHTML=`<div><div class='label'>Name</div>${escape(profile.name)}</div>
      <div class='mt-2'><div class='label'>Email</div><a href='mailto:${escape(profile.email)}'>${escape(profile.email)}</a></div>
      <div class='mt-2'><div class='label'>Habits</div>${escape(profile.habits||'—')}</div>
      <div class='mt-2'><div class='label'>Noise</div>${escape(profile.noise)}</div>
      <div class='mt-2'><div class='label'>Availability</div>${escape(profile.availability)}</div>`;
    }
  }

  // Utilities
  function uid(){return Math.random().toString(36).slice(2,10);} // not cryptographically secure
  function escape(str){return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));}
})();
