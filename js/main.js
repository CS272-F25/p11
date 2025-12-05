// Cohabit bootstrap: call all initializers; each will no-op if not on page
(function(){
  document.addEventListener('DOMContentLoaded', () => {
    const C = window.Cohabit || {};
    if(C.initExpenseSplitter) C.initExpenseSplitter();
    if(C.initDirectoryPage) C.initDirectoryPage();
    if(C.initFinancePage) C.initFinancePage();
    if(C.initChoresPage) C.initChoresPage();
    if(C.initNotificationsPage) C.initNotificationsPage();
    if(C.initSearchPage) C.initSearchPage();
    if(C.initProfilePage) C.initProfilePage();
    if(C.initHouseholdPage) C.initHouseholdPage();
  });
})();
