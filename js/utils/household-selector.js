(async function() {
  // Wait for auth to be ready
  let auth, onAuthStateChanged, householdUtils;
  
  try {
    const firebaseModule = await import('../../firebase.js');
    auth = firebaseModule.auth;
    const authModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    onAuthStateChanged = authModule.onAuthStateChanged;
    householdUtils = await import('./household.js');
  } catch (error) {
    console.error('Error loading modules for household selector:', error);
    return;
  }

  const selectorContainer = document.getElementById('household-selector');
  const currentHouseholdName = document.getElementById('current-household-name');
  const dropdownMenu = document.getElementById('household-dropdown-menu');

  if (!selectorContainer || !currentHouseholdName || !dropdownMenu) return;

  let currentHouseholds = [];
  let activeHouseholdId = null;

  async function loadHouseholds() {
    try {
      const households = await householdUtils.getUserHouseholds();
      currentHouseholds = households;

      if (households.length === 0) {
        selectorContainer.style.display = 'none';
        return;
      }

      // Get current active household
      const currentHousehold = await householdUtils.getCurrentUserHousehold();
      activeHouseholdId = currentHousehold?.id || null;

      // Show selector if user has households
      selectorContainer.style.display = 'block';

      // Update current household name
      if (currentHousehold) {
        currentHouseholdName.textContent = currentHousehold.name;
      } else if (households.length > 0) {
        currentHouseholdName.textContent = households[0].name;
        activeHouseholdId = households[0].id;
      }

      // Populate dropdown
      renderDropdown();
    } catch (error) {
      console.error('Error loading households:', error);
      selectorContainer.style.display = 'none';
    }
  }

  function renderDropdown() {
    dropdownMenu.innerHTML = '';

    if (currentHouseholds.length === 0) {
      dropdownMenu.innerHTML = '<li><span class="dropdown-item-text text-muted small">No households</span></li>';
    } else {
      currentHouseholds.forEach(household => {
        const li = document.createElement('li');
        const isActive = household.id === activeHouseholdId;
        
        const a = document.createElement('a');
        a.className = 'dropdown-item' + (isActive ? ' active' : '');
        a.href = '#';
        a.textContent = household.name;
        
        if (isActive) {
          const checkmark = document.createElement('span');
          checkmark.className = 'ms-2';
          checkmark.innerHTML = '✓';
          a.appendChild(checkmark);
        }

        a.addEventListener('click', async (e) => {
          e.preventDefault();
          await switchToHousehold(household.id, household.name);
        });

        li.appendChild(a);
        dropdownMenu.appendChild(li);
      });
    }

    // Add divider
    const divider = document.createElement('li');
    divider.innerHTML = '<hr class="dropdown-divider">';
    dropdownMenu.appendChild(divider);

    // Add "Add Household" button
    const addLi = document.createElement('li');
    const addButton = document.createElement('a');
    addButton.className = 'dropdown-item text-primary fw-semibold';
    addButton.href = '#';
    addButton.setAttribute('data-bs-toggle', 'modal');
    addButton.setAttribute('data-bs-target', '#addHouseholdModal');
    addButton.innerHTML = '+ Add Household';
    addLi.appendChild(addButton);
    dropdownMenu.appendChild(addLi);
  }

  // Setup modal form handlers
  function setupModalHandlers() {
    // Create household form
    const createForm = document.getElementById('modal-create-household-form');
    if (createForm) {
      createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = createForm.name.value.trim();
        
        if (!name) return;
        
        const submitBtn = createForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
        
        try {
          const result = await householdUtils.createHousehold(name);
          
          // Close modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('addHouseholdModal'));
          if (modal) modal.hide();
          
          // Reset form
          createForm.reset();
          
          // Reload households
          await loadHouseholds();
          
          alert(`Household created! Invite code: ${result.inviteCode}`);
        } catch (error) {
          alert('Error creating household: ' + error.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
    }

    // Join household form
    const joinForm = document.getElementById('modal-join-household-form');
    if (joinForm) {
      joinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = joinForm.inviteCode.value.trim().toUpperCase();
        
        if (!code || code.length !== 6) {
          alert('Please enter a valid 6-character invite code');
          return;
        }
        
        const submitBtn = joinForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Joining...';
        
        try {
          await householdUtils.joinHousehold(code);
          
          // Close modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('addHouseholdModal'));
          if (modal) modal.hide();
          
          // Reset form
          joinForm.reset();
          
          // Reload households
          await loadHouseholds();
          
          alert('Successfully joined household!');
        } catch (error) {
          alert('Error joining household: ' + error.message);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
    }
  }

  async function switchToHousehold(householdId, householdName) {
    if (householdId === activeHouseholdId) return;

    try {
      await householdUtils.switchHousehold(householdId);
      activeHouseholdId = householdId;
      currentHouseholdName.textContent = householdName;
      renderDropdown();

      // Reload the current page to reflect new household data
      window.location.reload();
    } catch (error) {
      console.error('Error switching household:', error);
      alert('Error switching household: ' + error.message);
    }
  }

  // Initialize on auth state change
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await loadHouseholds();
      setupModalHandlers();
    } else {
      selectorContainer.style.display = 'none';
    }
  });

  // Expose function to reload households (useful after creating/joining)
  window.Cohabit = window.Cohabit || {};
  window.Cohabit.reloadHouseholdSelector = loadHouseholds;
})();
