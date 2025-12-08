import { auth } from '../../firebase.js';
import { signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const signoutBtn = document.getElementById('signout-btn');

// Handle sign out
signoutBtn?.addEventListener('click', async () => {
  const confirmed = confirm('Are you sure you want to sign out?');
  if (!confirmed) return;
  
  try {
    await signOut(auth);
    alert('Signed out successfully');
    window.location.href = 'login.html';
  } catch (err) {
    console.error('Sign out error:', err);
    alert('Failed to sign out: ' + (err?.message || 'Unknown error'));
  }
});

// Optional: Check if user is authenticated
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // User is not signed in, redirect to login
    window.location.href = 'login.html';
  } else {
    console.log('User authenticated:', user.email);
  }
});
