(function(){
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

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initExpenseSplitter = initExpenseSplitter;
})();
