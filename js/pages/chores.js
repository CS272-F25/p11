(function(){
  const {getJSON, setJSON, escape: esc} = window.Cohabit;

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
           <h3 class='h5'>${esc(c.name)}</h3>
           <p class='mb-1'><strong>${esc(c.assignee)}</strong> • ${esc(c.frequency)} • Due ${esc(c.due)}</p>
           <button class='btn btn-sm ${c.done?'btn-secondary':'btn-success'}'>${c.done?'Mark Incomplete':'Mark Done'}</button>
         </div>`;
        const btn=col.querySelector('button');
        btn.addEventListener('click', ()=>{c.done=!c.done;setJSON('cohabit_chores', chores);render();});
        list.appendChild(col);
      });
    }
  }

  function uid(){ return (window.Cohabit && window.Cohabit.uid) ? window.Cohabit.uid() : Math.random().toString(36).slice(2,10); }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initChoresPage = initChoresPage;
})();
