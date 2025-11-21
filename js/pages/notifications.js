(function(){
  const {getJSON, escape: esc} = window.Cohabit;

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
      li.innerHTML=`<span class='icon'>${icon}</span><span>${esc(n.text)}</span>`;
      ul.appendChild(li);
    });
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initNotificationsPage = initNotificationsPage;
})();
