// CoHabit draft feature logic (client-side demo only)
(function(){
  const ls = window.localStorage;
  const getJSON = (key, fallback) => {try{const v = ls.getItem(key);return v?JSON.parse(v):fallback;}catch(e){return fallback;}};
  const setJSON = (key, value) => {try{ls.setItem(key, JSON.stringify(value));}catch(e){}}

  document.addEventListener('DOMContentLoaded', () => {
    initExpenseSplitter(); // existing home demo
    initDirectoryPage();
    initFinancePage();
    initChoresPage();
    initNotificationsPage();
    initSearchPage();
    initProfilePage();
  });

  // Home expense splitter
  function initExpenseSplitter(){
    const form = document.getElementById('split-form');
    const result = document.getElementById('split-result');
    if(!form || !result) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const total = parseFloat(form.total.value);
      const count = parseInt(form.count.value,10);
      if(!isFinite(total)||total<=0||!isFinite(count)||count<1){
        result.textContent='Enter a valid total and roommate count.';
        result.className='text-danger';
        return;
      }
      const share = Math.round((total/count)*100)/100;
      result.className='text-success';
      result.textContent=`Each pays $${share.toFixed(2)} (total $${total.toFixed(2)} split ${count}).`;
    });
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
        expenseList.innerHTML = expenses.map(exp => {
          const share = exp.amt / exp.participants.length;
          return `
            <div class="expense-card">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h6 class="mb-1">${escape(exp.desc)}</h6>
                  <small class="text-muted">Paid by ${escape(exp.paidBy)}</small>
                </div>
                <div class="expense-amount">$${exp.amt.toFixed(2)}</div>
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
