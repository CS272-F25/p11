(function(){
  const {getJSON, setJSON, escape: esc} = window.Cohabit;

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
      preview.innerHTML=`<div><div class='label'>Name</div>${esc(profile.name)}</div>
      <div class='mt-2'><div class='label'>Email</div><a href='mailto:${esc(profile.email)}'>${esc(profile.email)}</a></div>
      <div class='mt-2'><div class='label'>Habits</div>${esc(profile.habits||'—')}</div>
      <div class='mt-2'><div class='label'>Noise</div>${esc(profile.noise)}</div>
      <div class='mt-2'><div class='label'>Availability</div>${esc(profile.availability)}</div>`;
    }
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initProfilePage = initProfilePage;
})();
