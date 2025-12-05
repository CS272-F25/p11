import { auth } from '../../firebase.js';
import { 
  createHousehold, 
  joinHousehold, 
  getCurrentUserHousehold,
  leaveHousehold
} from '../utils/household.js';

(function() {
  async function initHouseholdSetupPage() {
    const page = document.getElementById('household-setup-page');
    if (!page) return;

    const createForm = document.getElementById('create-household-form');
    const joinForm = document.getElementById('join-household-form');
    const createSuccess = document.getElementById('create-success');
    const joinSuccess = document.getElementById('join-success');
    const inviteCodeDisplay = document.getElementById('invite-code-display');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    const alreadyInHousehold = document.getElementById('already-in-household');
    const currentHouseholdName = document.getElementById('current-household-name');
    const leaveHouseholdBtn = document.getElementById('leave-household-btn');

    // Wait for auth state
    await new Promise((resolve) => {
      const unsubscribeAuth = auth.onAuthStateChanged((user) => {
        unsubscribeAuth();
        resolve(user);
      });
    });

    const user = auth.currentUser;
    if (!user) {
      window.location.href = '/login.html';
      return;
    }

    // Check if user is already in a household
    try {
      const currentHousehold = await getCurrentUserHousehold();
      
      if (currentHousehold) {
        // User is already in a household
        alreadyInHousehold.style.display = 'block';
        currentHouseholdName.textContent = currentHousehold.name;
        
        // Hide the forms
        createForm.closest('.card-custom').style.display = 'none';
        joinForm.closest('.card-custom').style.display = 'none';
        
        // Handle leave household
        leaveHouseholdBtn.addEventListener('click', async () => {
          if (confirm('Are you sure you want to leave this household? This cannot be undone.')) {
            try {
              leaveHouseholdBtn.disabled = true;
              leaveHouseholdBtn.textContent = 'Leaving...';
              
              await leaveHousehold(currentHousehold.id);
              
              // Reload page to show forms again
              window.location.reload();
            } catch (error) {
              console.error('Error leaving household:', error);
              alert('Failed to leave household: ' + error.message);
              leaveHouseholdBtn.disabled = false;
              leaveHouseholdBtn.textContent = 'Leave Household';
            }
          }
        });
        
        return;
      }
    } catch (error) {
      console.error('Error checking household status:', error);
    }

    // Handle create household form
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const householdName = createForm.householdName.value.trim();
      
      if (!householdName) {
        alert('Please enter a household name');
        return;
      }

      const submitBtn = createForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';

      try {
        const result = await createHousehold(householdName);
        
        // Show success message with invite code
        createSuccess.style.display = 'block';
        inviteCodeDisplay.textContent = result.inviteCode;
        
        // Hide the form
        createForm.style.display = 'none';
        
        // Redirect to home page to reload with new household data
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 2000);
        
      } catch (error) {
        console.error('Error creating household:', error);
        alert('Failed to create household: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });

    // Handle copy invite code
    copyCodeBtn.addEventListener('click', async () => {
      const code = inviteCodeDisplay.textContent;
      try {
        await navigator.clipboard.writeText(code);
        copyCodeBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyCodeBtn.textContent = 'Copy';
        }, 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
        alert('Failed to copy code');
      }
    });

    // Handle join household form
    joinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const inviteCode = joinForm.inviteCode.value.trim().toUpperCase();
      
      if (!inviteCode || inviteCode.length !== 6) {
        alert('Please enter a valid 6-character invite code');
        return;
      }

      const submitBtn = joinForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Joining...';

      try {
        await joinHousehold(inviteCode);
        
        // Show success message
        joinSuccess.style.display = 'block';
        
        // Hide the form
        joinForm.style.display = 'none';
        
        // Redirect to home page to reload with new household data
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 1500);
        
      } catch (error) {
        console.error('Error joining household:', error);
        alert('Failed to join household: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });

    // Auto-uppercase invite code as user types
    const inviteCodeInput = document.getElementById('inviteCode');
    inviteCodeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  }

  window.Cohabit = window.Cohabit || {};
  window.Cohabit.initHouseholdSetupPage = initHouseholdSetupPage;
})();
