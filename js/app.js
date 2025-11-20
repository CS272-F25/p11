// CoHabit draft feature logic (client-side demo only)
(function(){
  const ls = window.localStorage;
  const getJSON = (key, fallback) => {try{const v = ls.getItem(key);return v?JSON.parse(v):fallback;}catch(e){return fallback;}};
  const setJSON = (key, value) => {try{ls.setItem(key, JSON.stringify(value));}catch(e){}}

  document.addEventListener('DOMContentLoaded', () => {
    initExpenseSplitter(); // existing home demo
    initChoreRotationDemo();
    initDirectoryPage();
    initFinancePage();
    initChoresPage();
    initNotificationsPage();
    initSearchPage();
    initProfilePage();
  });

  // Chore Rotation Demo (home page)
  function initChoreRotationDemo(){
    const container = document.getElementById('chore-rotation-list');
    if(!container) return;
    const btn = document.getElementById('rotate-chores-btn');
    const resetBtn = document.getElementById('reset-chores-btn');
    const defaultChores = ['Dishes','Trash','Vacuum','Laundry'];
    const defaultRoommates = ['Roommate A','Roommate B','Roommate C'];

    let state = getJSON('cohabit_chore_rotation', {chores: defaultChores, roommates: defaultRoommates, assignments: []});
    if(!state.assignments || state.assignments.length !== state.chores.length){
      state.assignments = assign(state.chores, state.roommates);
      setJSON('cohabit_chore_rotation', state);
    }

    render();

    btn.addEventListener('click', () => {
      state.assignments = assign(state.chores, state.roommates);
      setJSON('cohabit_chore_rotation', state);
      btn.disabled = true; btn.textContent = 'Rotating…';
      setTimeout(() => { render(); btn.disabled = false; btn.textContent = 'Rotate chores'; }, 350);
    });

    resetBtn.addEventListener('click', () => {
      state = {chores: defaultChores, roommates: defaultRoommates, assignments: assign(defaultChores, defaultRoommates)};
      setJSON('cohabit_chore_rotation', state);
      render();
    });

    function assign(chores, roommates){
  
      const pool = shuffle(roommates.slice());
      const assignments = chores.map((c,i) => pool[i % pool.length]);
      return assignments;
    }

    function render(){
      while(container.firstChild) container.removeChild(container.firstChild);
      state.chores.forEach((chore, i) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center chore-item';

        const choreSpan = document.createElement('span');
        choreSpan.textContent = chore;

        const badge = document.createElement('span');
        badge.className = 'badge bg-primary rounded-pill';
        badge.textContent = state.assignments[i] || '—';

        li.appendChild(choreSpan);
        li.appendChild(badge);
        container.appendChild(li);
      });
    }

    function shuffle(arr){
      for(let i = arr.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  }

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
    const tbody = document.querySelector('#expense-table tbody');
    const balanceList = document.getElementById('balance-list');
    let expenses = getJSON('cohabit_expenses', []);
    render();
    form.addEventListener('submit', e => {
      e.preventDefault();
      const desc=form.description.value.trim();
      const amt=parseFloat(form.amount.value);
      const participants=form.participants.value.split(',').map(s=>s.trim()).filter(Boolean);
      if(!desc||!isFinite(amt)||amt<=0||participants.length===0){return;}
      expenses.push({id:uid(), desc, amt, participants, date:Date.now()});
      setJSON('cohabit_expenses', expenses);
      form.reset();
      render();
    });
    function render(){
      tbody.innerHTML='';
      const balances={};
      expenses.forEach(ex => {
        const share = ex.amt/ex.participants.length;
        ex.participants.forEach(p => {balances[p]=(balances[p]||0)+share;});
        const tr=document.createElement('tr');
        tr.innerHTML=`<td>${escape(ex.desc)}</td><td>$${ex.amt.toFixed(2)}</td><td>${ex.participants.map(escape).join(', ')}</td><td>$${share.toFixed(2)}</td>`;
        tbody.appendChild(tr);
      });
      balanceList.innerHTML='';
      Object.keys(balances).forEach(name => {
        const div=document.createElement('div');div.className='col-sm-6 col-lg-4';
        div.innerHTML=`<div class='balance-box'><strong>${escape(name)}</strong><br><span class='text-muted'>Owes</span> $${balances[name].toFixed(2)}</div>`;
        balanceList.appendChild(div);
      });
      setJSON('cohabit_balances_cache', balances);
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
