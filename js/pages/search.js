(function(){
  const {getJSON, uid, escape: esc} = window.Cohabit;

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
        col.innerHTML=`<div class='card p-3'><h3 class='h5'>${esc(p.name)}</h3><div>${p.tags.map(t=>`<span class='badge-tag'>${esc(t)}</span>`).join('')}</div><div class='small text-muted mt-2'>Availability: ${esc(p.availability)}</div></div>`;
        results.appendChild(col);
      });
    }
    perform();
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initSearchPage = initSearchPage;
})();
