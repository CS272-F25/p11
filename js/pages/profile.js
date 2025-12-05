(function(){
  const {escape: esc} = window.Cohabit || {escape: (s) => String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))};

  async function initProfilePage(){
    const page=document.getElementById('profile-page');
    if(!page) return;
    
    // Import Firebase modules dynamically
    const { auth, db } = await import('/firebase.js');
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const { doc, getDoc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const form=document.getElementById('profile-form');
    const preview=document.getElementById('profile-preview');
    let currentUser = null;
    let profile = null;
    
    // Wait for auth state
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = '/login.html';
        return;
      }
      
      currentUser = user;
      await loadProfile();
    });
    
    async function loadProfile() {
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          profile = docSnap.data();
          // Preload form
          form.name.value = profile.name || '';
          form.email.value = profile.email || currentUser.email;
          form.habits.value = profile.habits || '';
          form.noise.value = profile.noisePreference || 'moderate';
          form.availability.value = profile.availability || 'flexible';
          render();
        } else {
          // No profile yet, use defaults
          form.email.value = currentUser.email;
          profile = {name: '', email: currentUser.email, habits: '', noisePreference: 'moderate', availability: 'flexible'};
          render();
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        alert('Error loading profile data');
      }
    }
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const updatedProfile = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        habits: form.habits.value.trim(),
        noisePreference: form.noise.value,
        availability: form.availability.value,
        updatedAt: serverTimestamp()
      };
      
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), updatedProfile);
        profile = {...profile, ...updatedProfile};
        render();
        alert('Profile updated successfully!');
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error saving profile: ' + error.message);
      }
    });
    
    function render(){
      if (!profile) return;
      preview.innerHTML=`<div><div class='label'>Name</div>${esc(profile.name || 'Not set')}</div>
      <div class='mt-2'><div class='label'>Email</div><a href='mailto:${esc(profile.email)}'>${esc(profile.email)}</a></div>
      <div class='mt-2'><div class='label'>Habits</div>${esc(profile.habits||'—')}</div>
      <div class='mt-2'><div class='label'>Noise Preference</div>${esc(profile.noisePreference || profile.noise || 'moderate')}</div>
      <div class='mt-2'><div class='label'>Availability</div>${esc(profile.availability || 'flexible')}</div>`;
    }
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initProfilePage = initProfilePage;
})();
