(function(){
  const cohabit = window.Cohabit || {};
  const defaultEsc = (s) => String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  const defaultTimeAgo = (ts) => {
    const diff = Date.now() - (ts || Date.now());
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    return 'Just now';
  };
  const esc = cohabit.escape || defaultEsc;
  const getTimeAgo = cohabit.getTimeAgo || defaultTimeAgo;

  async function initNotificationsPage(){
    const page = document.getElementById('notifications-page');
    if (!page) return;

    const listEl = document.getElementById('notification-list');
    if (!listEl) return;

    let firebaseModule, authModule, firestoreModule, householdModule, financeModule;

    try {
      [firebaseModule, authModule, firestoreModule, householdModule, financeModule] = await Promise.all([
        import('./firebase.js'),
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'),
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'),
        import('./js/utils/household.js'),
        import('./js/utils/finance.js')
      ]);
    } catch (error) {
      console.error('Error loading modules:', error);
      renderStatusMessage('Error loading application modules. Please refresh the page.');
      return;
    }

    const { auth, db } = firebaseModule;
    const { onAuthStateChanged } = authModule;
    const { collection, query, where, getDocs, doc, updateDoc, orderBy, onSnapshot } = firestoreModule;
    const { getCurrentUserHousehold } = householdModule;
    const { subscribeToExpenses } = financeModule;

    let currentUserId = null;
    let currentHousehold = null;
    let roommateRequests = [];
    let choreNotifications = [];
    let expenseNotifications = [];
    let unsubscribeExpenses = null;
    let unsubscribeChores = null;

    const cleanup = () => {
      if (unsubscribeExpenses) {
        unsubscribeExpenses();
        unsubscribeExpenses = null;
      }
      if (unsubscribeChores) {
        unsubscribeChores();
        unsubscribeChores = null;
      }
    };

    window.addEventListener('beforeunload', cleanup);

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        cleanup();
        window.location.href = 'login.html';
        return;
      }

      currentUserId = user.uid;

      try {
        currentHousehold = await getCurrentUserHousehold();

        if (!currentHousehold) {
          cleanup();
          renderStatusMessage('Join or create a household to start receiving notifications.');
          return;
        }

        await loadRoommateRequests();
        setupChoreSubscription();
        setupExpenseSubscription();
      } catch (error) {
        console.error('Error initializing notifications:', error);
        renderStatusMessage('Unable to load notifications right now.');
      }
    });

    async function loadRoommateRequests() {
      if (!currentUserId) return;

      try {
        const q = query(
          collection(db, 'notifications'),
          where('recipientId', '==', currentUserId),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        roommateRequests = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            if (data.type !== 'roommate_request' || data.status !== 'pending') {
              return null;
            }
            const timestamp = toMillis(data.createdAt) || Date.now();
            return {
              id: docSnap.id,
              type: 'roommate_request',
              message: data.message || 'New roommate request',
              senderName: data.senderName || 'Roommate',
              status: data.status,
              timestamp,
              relativeTime: formatRelativeTime(timestamp)
            };
          })
          .filter(Boolean);

        renderNotifications();
      } catch (error) {
        console.error('Error loading roommate requests:', error);
      }
    }

    function setupChoreSubscription() {
      if (!currentHousehold || !currentUserId) return;
      if (unsubscribeChores) unsubscribeChores();

      const choresQuery = query(
        collection(db, 'chores'),
        where('householdId', '==', currentHousehold.id),
        where('assigneeId', '==', currentUserId)
      );

      unsubscribeChores = onSnapshot(choresQuery, (snapshot) => {
        choreNotifications = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            if (data.done) return null;
            const timestamp = toMillis(data.updatedAt) || toMillis(data.createdAt) || Date.now();
            return {
              id: docSnap.id,
              type: 'chore',
              icon: '🧹',
              title: data.name || 'Chore assigned to you',
              message: buildChoreMessage(data),
              timestamp,
              relativeTime: formatRelativeTime(timestamp)
            };
          })
          .filter(Boolean);

        renderNotifications();
      }, (error) => {
        console.error('Error listening to chores:', error);
      });
    }

    function setupExpenseSubscription() {
      if (!currentHousehold) return;
      if (unsubscribeExpenses) unsubscribeExpenses();

      unsubscribeExpenses = subscribeToExpenses(currentHousehold.id, (expenses) => {
        expenseNotifications = expenses.map((exp) => {
          const timestamp = exp.date || Date.now();
          return {
            id: exp.id,
            type: 'expense',
            icon: '💸',
            title: exp.description || 'Household expense added',
            message: buildExpenseMessage(exp),
            amountFormatted: formatCurrency(exp.amount),
            timestamp,
            relativeTime: formatRelativeTime(timestamp)
          };
        });

        renderNotifications();
      });
    }

    async function handleRequest(notificationId, action) {
      try {
        const notifRef = doc(db, 'notifications', notificationId);
        if (action === 'accept') {
          await updateDoc(notifRef, { status: 'accepted' });
          alert('Roommate request accepted!');
        } else if (action === 'decline') {
          await updateDoc(notifRef, { status: 'declined' });
          alert('Roommate request declined.');
        }
        await loadRoommateRequests();
      } catch (error) {
        console.error('Error handling roommate request:', error);
        alert('Error processing request. Please try again.');
      }
    }

    function renderNotifications() {
      const combined = [...roommateRequests, ...choreNotifications, ...expenseNotifications]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      if (combined.length === 0) {
        renderStatusMessage('No notifications 🎉');
        return;
      }

      listEl.innerHTML = '';

      combined.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'list-group-item notification-item';

        if (item.type === 'roommate_request') {
          li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center gap-3">
              <div>
                <div class="fw-semibold">${esc(item.senderName)}</div>
                <div class="text-muted small">${esc(item.message)}</div>
                <small class="text-muted">${esc(item.relativeTime)}</small>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-success accept-btn" data-id="${item.id}">Accept</button>
                <button class="btn btn-sm btn-outline-danger decline-btn" data-id="${item.id}">Decline</button>
              </div>
            </div>
          `;

          const acceptBtn = li.querySelector('.accept-btn');
          const declineBtn = li.querySelector('.decline-btn');
          acceptBtn?.addEventListener('click', () => handleRequest(item.id, 'accept'));
          declineBtn?.addEventListener('click', () => handleRequest(item.id, 'decline'));
        } else {
          li.innerHTML = `
            <div class="d-flex justify-content-between align-items-start gap-3">
              <div class="d-flex gap-3">
                <span class="icon">${item.icon || '🔔'}</span>
                <div>
                  <div class="fw-semibold">${esc(item.title)}</div>
                  ${item.message ? `<div class="text-muted small">${esc(item.message)}</div>` : ''}
                </div>
              </div>
              <div class="text-end">
                ${item.amountFormatted ? `<div class="fw-semibold text-success">${esc(item.amountFormatted)}</div>` : ''}
                <small class="text-muted">${esc(item.relativeTime || '')}</small>
              </div>
            </div>
          `;
        }

        listEl.appendChild(li);
      });
    }

    function renderStatusMessage(message) {
      listEl.innerHTML = `<li class="list-group-item text-muted">${esc(message)}</li>`;
    }

    function buildChoreMessage(data) {
      const dueSummary = formatDueSummary(data?.dueDate);
      const frequency = data?.frequency ? capitalize(data.frequency) : '';
      const parts = [dueSummary];
      if (frequency) parts.push(`${frequency} schedule`);
      return `${parts.join(' • ')} • Assigned to you`;
    }

    function buildExpenseMessage(expense) {
      const payer = expense.paidBy || 'Unknown member';
      const splitLabel = formatParticipantLabel(expense.participants);
      return `Paid by ${payer} • Split with ${splitLabel}`;
    }

    function formatParticipantLabel(participants) {
      if (!Array.isArray(participants) || participants.length === 0) {
        return 'no one';
      }
      if (participants.length <= 3) {
        return participants.join(', ');
      }
      return `${participants.length} people`;
    }

    function formatCurrency(value) {
      const num = Number(value);
      if (!Number.isFinite(num)) return '$0.00';
      return `$${num.toFixed(2)}`;
    }

    function formatRelativeTime(timestamp) {
      if (!timestamp) return '';
      return getTimeAgo(timestamp);
    }

    function formatDueSummary(dueDateStr) {
      if (!dueDateStr) return 'No due date set';
      const due = new Date(`${dueDateStr}T00:00:00`);
      if (Number.isNaN(due.getTime())) return 'No due date set';
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.round((due - today) / 86400000);
      const absolute = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      if (diffDays === 0) return `Due today (${absolute})`;
      if (diffDays === 1) return `Due tomorrow (${absolute})`;
      if (diffDays === -1) return `Was due yesterday (${absolute})`;
      if (diffDays < -1) {
        const daysLate = Math.abs(diffDays);
        return `Overdue by ${daysLate} day${daysLate === 1 ? '' : 's'} (${absolute})`;
      }
      return `Due in ${diffDays} day${diffDays === 1 ? '' : 's'} (${absolute})`;
    }

    function capitalize(text) {
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function toMillis(value) {
      if (!value) return null;
      if (typeof value.toMillis === 'function') return value.toMillis();
      if (typeof value === 'number') return value;
      return null;
    }
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initNotificationsPage = initNotificationsPage;
})();
