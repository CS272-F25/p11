(function(){
  const {getJSON, setJSON, uid, escape: esc} = window.Cohabit;

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
          <h3 class="h5">${esc(r.name)}</h3>
          <p class="mb-1"><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></p>
          <div>${r.tags.map(t=>`<span class='badge-tag'>${esc(t)}</span>`).join('')}</div>
          <div class='mt-2 small text-muted'>Availability: ${esc(r.availability)}</div>
          <button class="btn btn-outline-danger btn-sm mt-2" aria-label="Remove ${esc(r.name)}">Remove</button>
        </div>`;
        const btn = col.querySelector('button');
        btn.addEventListener('click', () => {roommates = roommates.filter(x=>x.id!==r.id);setJSON('cohabit_roommates', roommates);render();});
        container.appendChild(col);
      });
    }
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initDirectoryPage = initDirectoryPage;
})();
