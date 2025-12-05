// Cohabit bootstrap: call all initializers; each will no-op if not on page
(function(){
  document.addEventListener('DOMContentLoaded', () => {
    const C = window.Cohabit || {};
    if(C.initHomePage) C.initHomePage();
    if(C.initExpenseSplitter) C.initExpenseSplitter();
    if(C.initFinancePage) C.initFinancePage();
    if(C.initChoresPage) C.initChoresPage();
    if(C.initNotificationsPage) C.initNotificationsPage();
    if(C.initProfilePage) C.initProfilePage();
    if(C.initHouseholdPage) C.initHouseholdPage();
    if(C.initHouseholdSetupPage) C.initHouseholdSetupPage();
  });
})();
