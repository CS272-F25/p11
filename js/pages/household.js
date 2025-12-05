(function(){
  const {escape: esc} = window.Cohabit || {escape: (s) => String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))};

  let currentHousehold = null;
  let currentUser = null;
  let auth, onAuthStateChanged;
  let householdUtils;

function showLoading() {
  document.getElementById('loading-state').style.display = 'block';
  document.getElementById('no-household-state').style.display = 'none';
  document.getElementById('has-household-state').style.display = 'none';
  document.getElementById('error-state').style.display = 'none';
}

function showError(message) {
  const errorState = document.getElementById('error-state');
  document.getElementById('error-message').textContent = message;
  errorState.style.display = 'block';
  document.getElementById('loading-state').style.display = 'none';
}

function showNoHousehold() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('no-household-state').style.display = 'block';
  document.getElementById('has-household-state').style.display = 'none';
  document.getElementById('error-state').style.display = 'none';
}

function showHasHousehold() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('no-household-state').style.display = 'none';
  document.getElementById('has-household-state').style.display = 'block';
  document.getElementById('error-state').style.display = 'none';
}

async function loadHouseholdData() {
  showLoading();
  
  try {
    currentHousehold = await householdUtils.getCurrentUserHousehold();
    
    if (!currentHousehold) {
      showNoHousehold();
      return;
    }

    // Display household info
    document.getElementById('household-name-display').textContent = currentHousehold.name;
    document.getElementById('invite-code-display').value = currentHousehold.inviteCode;
    document.getElementById('update-household-name').value = currentHousehold.name;
    
    // Load members
    await loadMembers();
    
    showHasHousehold();
  } catch (error) {
    console.error('Error loading household:', error);
    showError(error.message);
  }
}

async function loadMembers() {
  const membersList = document.getElementById('members-list');
  const membersLoading = document.getElementById('members-loading');
  const memberCount = document.getElementById('member-count');
  
  membersLoading.style.display = 'block';
  membersList.innerHTML = '';
  
  try {
    const members = await householdUtils.getHouseholdMembers(currentHousehold.id);
    memberCount.textContent = members.length;
    membersLoading.style.display = 'none';
    
    if (members.length === 0) {
      membersList.innerHTML = '<p class="text-muted">No members found</p>';
      return;
    }

    members.forEach(member => {
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4 mb-3';
      
      const isCreator = member.id === currentHousehold.createdBy;
      const isCurrentUser = member.id === currentUser.uid;
      
      col.innerHTML = `
        <div class="card p-3">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <h3 class="h6 mb-1">
                ${esc(member.name || 'Unknown')}
                ${isCreator ? '<span class="badge bg-primary ms-2">Creator</span>' : ''}
                ${isCurrentUser ? '<span class="badge bg-secondary ms-2">You</span>' : ''}
              </h3>
              <p class="mb-1 small text-muted">${esc(member.email || '')}</p>
              ${member.habits ? `<p class="mb-0 small">${esc(member.habits)}</p>` : ''}
            </div>
            ${!isCurrentUser && currentUser.uid === currentHousehold.createdBy ? 
              `<button class="btn btn-sm btn-outline-danger remove-member-btn" data-user-id="${member.id}" data-user-name="${esc(member.name || 'this member')}">Remove</button>` : 
              ''}
          </div>
        </div>
      `;
      
      membersList.appendChild(col);
    });

    // Add event listeners for remove buttons
    document.querySelectorAll('.remove-member-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const userId = this.getAttribute('data-user-id');
        const userName = this.getAttribute('data-user-name');
        
        if (confirm(`Remove ${userName} from the household?`)) {
          try {
            await householdUtils.removeMemberFromHousehold(currentHousehold.id, userId);
            await loadMembers();
          } catch (error) {
            alert('Error removing member: ' + error.message);
          }
        }
      });
    });
    
  } catch (error) {
    console.error('Error loading members:', error);
    membersLoading.style.display = 'none';
    membersList.innerHTML = '<p class="text-danger">Error loading members</p>';
  }
}

async function initHouseholdPage() {
  const page = document.getElementById('household-page');
  if (!page) return;

  // Import Firebase and utilities
  try {
    const firebaseModule = await import('/firebase.js');
    auth = firebaseModule.auth;
    const authModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    onAuthStateChanged = authModule.onAuthStateChanged;
    householdUtils = await import('/js/utils/household.js');
  } catch (error) {
    console.error('Error loading modules:', error);
    showError('Failed to load required modules');
    return;
  }

  // Create household form
  const createForm = document.getElementById('create-household-form');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = createForm.name.value.trim();
      
      if (!name) return;
      
      try {
        const result = await householdUtils.createHousehold(name);
        alert(`Household created! Invite code: ${result.inviteCode}`);
        await loadHouseholdData();
      } catch (error) {
        alert('Error creating household: ' + error.message);
      }
    });
  }

  // Join household form
  const joinForm = document.getElementById('join-household-form');
  if (joinForm) {
    joinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = joinForm.inviteCode.value.trim().toUpperCase();
      
      if (!code || code.length !== 6) {
        alert('Please enter a valid 6-character invite code');
        return;
      }
      
      try {
        await householdUtils.joinHousehold(code);
        alert('Successfully joined household!');
        await loadHouseholdData();
      } catch (error) {
        alert('Error joining household: ' + error.message);
      }
    });
  }

  // Settings toggle
  const settingsBtn = document.getElementById('settings-btn');
  const settingsDiv = document.getElementById('household-settings');
  if (settingsBtn && settingsDiv) {
    settingsBtn.addEventListener('click', () => {
      const isHidden = settingsDiv.style.display === 'none';
      settingsDiv.style.display = isHidden ? 'block' : 'none';
      settingsBtn.textContent = isHidden ? 'Hide Settings' : 'Settings';
    });
  }

  // Copy invite code
  const copyBtn = document.getElementById('copy-invite-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const codeInput = document.getElementById('invite-code-display');
      try {
        await navigator.clipboard.writeText(codeInput.value);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
        }, 2000);
      } catch (error) {
        alert('Failed to copy code');
      }
    });
  }

  // Regenerate invite code
  const regenerateBtn = document.getElementById('regenerate-invite-btn');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', async () => {
      if (!confirm('Regenerate invite code? The old code will no longer work.')) return;
      
      try {
        const newCode = await householdUtils.regenerateInviteCode(currentHousehold.id);
        document.getElementById('invite-code-display').value = newCode;
        alert('New invite code generated!');
      } catch (error) {
        alert('Error regenerating code: ' + error.message);
      }
    });
  }

  // Update household name
  const updateForm = document.getElementById('update-household-form');
  if (updateForm) {
    updateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newName = updateForm.name.value.trim();
      
      if (!newName) return;
      
      try {
        await householdUtils.updateHouseholdName(currentHousehold.id, newName);
        currentHousehold.name = newName;
        document.getElementById('household-name-display').textContent = newName;
        alert('Household name updated!');
      } catch (error) {
        alert('Error updating name: ' + error.message);
      }
    });
  }

  // Leave household
  const leaveBtn = document.getElementById('leave-household-btn');
  if (leaveBtn) {
    leaveBtn.addEventListener('click', async () => {
      if (!confirm('Leave this household? You will need an invite code to rejoin.')) return;
      
      try {
        await householdUtils.leaveHousehold();
        alert('You have left the household');
        await loadHouseholdData();
      } catch (error) {
        alert('Error leaving household: ' + error.message);
      }
    });
  }

  // Auth state observer
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      loadHouseholdData();
    } else {
      window.location.href = 'login.html';
    }
  });
}

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initHouseholdPage = initHouseholdPage;
})();
