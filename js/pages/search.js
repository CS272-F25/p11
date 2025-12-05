(function(){
  const {escape: esc} = window.Cohabit || {escape: (s) => String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))};

  async function initSearchPage(){
    const page=document.getElementById('search-page');
    if(!page) return;
    
    // Import Firebase modules dynamically
    const { auth, db } = await import('/firebase.js');
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const { collection, getDocs, query } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const form=document.getElementById('search-form');
    const results=document.getElementById('search-results');
    let allProfiles = [];
    let currentUserId = null;
    
    // Wait for auth state
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = '/login.html';
        return;
      }
      
      currentUserId = user.uid;
      await loadProfiles();
      perform(); // Initial render
    });
    
    async function loadProfiles() {
      try {
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        
        allProfiles = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Exclude current user from search results
          if (doc.id !== currentUserId) {
            allProfiles.push({
              id: doc.id,
              name: data.name || 'Anonymous',
              email: data.email || '',
              habits: data.habits || '',
              noisePreference: data.noisePreference || 'moderate',
              availability: data.availability || 'flexible'
            });
          }
        });
      } catch (error) {
        console.error('Error loading profiles:', error);
        results.innerHTML = '<div class="col-12 alert alert-danger">Error loading profiles. Please try again.</div>';
      }
    }
    
    form.addEventListener('submit', e => {e.preventDefault(); perform();});
    
    // Also search as user types
    form.query.addEventListener('input', () => {
      perform();
    });
    
    function perform(){
      const q=form.query.value.trim().toLowerCase();
      const avail=form.availability.value;
      
      const filtered=allProfiles.filter(p => {
        // Search by name
        const nameMatch = !q || p.name.toLowerCase().includes(q);
        // Search by habits
        const habitsMatch = !q || p.habits.toLowerCase().includes(q);
        // Match if either name or habits match
        const searchMatch = nameMatch || habitsMatch;
        
        const availMatch = !avail || p.availability===avail;
        return searchMatch && availMatch;
      });
      render(filtered);
    }
    
    async function sendRoommateRequest(recipientId, recipientName) {
      try {
        const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // Get current user's name
        const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
        const currentUserName = currentUserDoc.exists() ? currentUserDoc.data().name : 'Someone';
        
        // Create notification for recipient
        await addDoc(collection(db, 'notifications'), {
          type: 'roommate_request',
          recipientId: recipientId,
          senderId: currentUserId,
          senderName: currentUserName,
          message: `${currentUserName} sent you a roommate request`,
          status: 'pending',
          createdAt: serverTimestamp(),
          read: false
        });
        
        alert(`Request sent to ${recipientName}!`);
      } catch (error) {
        console.error('Error sending request:', error);
        alert('Error sending request. Please try again.');
      }
    }
    
    function render(list){
      results.innerHTML='';
      if(list.length===0){
        results.innerHTML='<div class="col-12"><div class="alert alert-info">No matches found. Try different search terms.</div></div>';
        return;
      }
      list.forEach(p => {
        const col=document.createElement('div');
        col.className='col-sm-6 col-lg-4';
        
        // Parse habits into tags
        const tags = p.habits ? p.habits.split(',').map(h => h.trim()).filter(h => h) : [];
        const tagsHtml = tags.length > 0 
          ? tags.map(t=>`<span class='badge bg-secondary me-1 mb-1'>${esc(t)}</span>`).join('') 
          : '<span class="text-muted">No habits listed</span>';
        
        col.innerHTML=`<div class='card p-3 h-100'>
          <h3 class='h5 mb-2'>${esc(p.name)}</h3>
          <div class='mb-2'><strong>Habits:</strong><br>${tagsHtml}</div>
          <div class='small text-muted'><strong>Noise Preference:</strong> ${esc(p.noisePreference)}</div>
          <div class='small text-muted'><strong>Availability:</strong> ${esc(p.availability)}</div>
          <div class='mt-2'>
            <button class='btn btn-sm btn-primary send-request-btn' data-user-id='${p.id}' data-user-name='${esc(p.name)}'>
              Send Request
            </button>
          </div>
        </div>`;
        results.appendChild(col);
        
        // Add event listener to the button
        const btn = col.querySelector('.send-request-btn');
        btn.addEventListener('click', () => {
          sendRoommateRequest(p.id, p.name);
        });
      });
    }
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initSearchPage = initSearchPage;
})();
