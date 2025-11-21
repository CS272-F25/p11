(function(){
  window.Cohabit = window.Cohabit || {};
  const ls = window.localStorage;
  function getJSON(key, fallback){
    try{ const v = ls.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; }
  }
  function setJSON(key, value){
    try{ ls.setItem(key, JSON.stringify(value)); }catch(e){}
  }
  window.Cohabit.getJSON = getJSON;
  window.Cohabit.setJSON = setJSON;
})();
