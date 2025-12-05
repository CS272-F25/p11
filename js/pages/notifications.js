(function(){
  const {getJSON, escape: esc} = window.Cohabit || {escape: (s) => String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))};

  async function initNotificationsPage(){
    const page=document.getElementById('notifications-page');
    if(!page) return;
    
    // Import Firebase modules dynamically
    const { auth, db } = await import('/firebase.js');
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    const ul=document.getElementById('notification-list');
    let currentUserId = null;
    
    // Wait for auth state
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = '/login.html';
        return;
      }
      
      currentUserId = user.uid;
      await loadNotifications();
    });
    
    async function loadNotifications() {
      try {
        // Load Firebase notifications
        const q = query(
          collection(db, 'notifications'),
          where('recipientId', '==', currentUserId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        const liItems = [];
        
        // Add roommate requests from Firebase
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.type === 'roommate_request' && data.status === 'pending') {
            liItems.push({
              id: docSnap.id,
              type: 'roommate_request',
              text: data.message,
              senderId: data.senderId,
              senderName: data.senderName,
              status: data.status
            });
          }
        });
        
        // Add local chore notifications
        const chores=getJSON('cohabit_chores', []);
        const today=new Date();
        chores.forEach(c => {
          const dueDate=new Date(c.due+'T00:00:00');
          const diffDays=Math.round((dueDate - today)/(1000*60*60*24));
          if(!c.done && diffDays<=2){
            liItems.push({type:'chore', text:`Chore '${c.name}' due in ${diffDays} day(s).`});
          }
        });
        
        // Add local expense notifications
        const expenses=getJSON('cohabit_expenses', []);
        expenses.forEach(ex => {
          const ageDays=Math.round((Date.now()-ex.date)/(1000*60*60*24));
          if(ageDays>2){liItems.push({type:'expense', text:`Expense '${ex.desc}' added ${ageDays} days ago.`});}
        });
        
        renderNotifications(liItems);
      } catch (error) {
        console.error('Error loading notifications:', error);
        ul.innerHTML='<li class="list-group-item alert alert-danger">Error loading notifications</li>';
      }
    }
    
    async function handleRequest(notificationId, action) {
      try {
        const notifRef = doc(db, 'notifications', notificationId);
        
        if (action === 'accept') {
          await updateDoc(notifRef, {
            status: 'accepted'
          });
          alert('Roommate request accepted!');
        } else if (action === 'decline') {
          await updateDoc(notifRef, {
            status: 'declined'
          });
          alert('Roommate request declined.');
        }
        
        // Reload notifications
        await loadNotifications();
      } catch (error) {
        console.error('Error handling request:', error);
        alert('Error processing request. Please try again.');
      }
    }
    
    function renderNotifications(liItems) {
      ul.innerHTML='';
      if(liItems.length===0){
        ul.innerHTML='<li class="list-group-item">No notifications 🎉</li>';
        return;
      }
      
      liItems.forEach(n => {
        const li=document.createElement('li');
        li.className='list-group-item notification-item';
        
        if (n.type === 'roommate_request') {
          const icon = '🏠';
          li.innerHTML=`
            <div class='d-flex justify-content-between align-items-center'>
              <div>
                <span class='icon'>${icon}</span>
                <span>${esc(n.text)}</span>
              </div>
              <div>
                <button class='btn btn-sm btn-success me-2 accept-btn' data-id='${n.id}'>Accept</button>
                <button class='btn btn-sm btn-danger decline-btn' data-id='${n.id}'>Decline</button>
              </div>
            </div>
          `;
          
          // Add event listeners
          const acceptBtn = li.querySelector('.accept-btn');
          const declineBtn = li.querySelector('.decline-btn');
          
          acceptBtn.addEventListener('click', () => handleRequest(n.id, 'accept'));
          declineBtn.addEventListener('click', () => handleRequest(n.id, 'decline'));
        } else {
          const icon=n.type==='chore'?'🧹':'💵';
          li.innerHTML=`<span class='icon'>${icon}</span><span>${esc(n.text)}</span>`;
        }
        
        ul.appendChild(li);
      });
    }
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initNotificationsPage = initNotificationsPage;
})();
