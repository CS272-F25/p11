(function(){
  window.Cohabit = window.Cohabit || {};

  function uid(){ return Math.random().toString(36).slice(2,10); }
  function escapeHtml(str){
     return String(str).replace(/[&<>\"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#39;'}[s]));
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

  window.Cohabit.uid = uid;
  window.Cohabit.escape = escapeHtml;
  window.Cohabit.getTimeAgo = getTimeAgo;
})();
