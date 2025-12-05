import { auth, db } from '/firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// DOM Elements
const loginView = document.getElementById('login-view');
const signupView = document.getElementById('signup-view');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup-btn');
const showLoginBtn = document.getElementById('show-login-btn');
const messageEl = document.getElementById('auth-message');

// Show/Hide views
function showLogin() {
  loginView.style.display = 'block';
  signupView.style.display = 'none';
  messageEl.textContent = '';
  messageEl.className = 'text-center mt-3';
}

function showSignup() {
  loginView.style.display = 'none';
  signupView.style.display = 'block';
  messageEl.textContent = '';
  messageEl.className = 'text-center mt-3';
}

// Toggle between views
showSignupBtn?.addEventListener('click', showSignup);
showLoginBtn?.addEventListener('click', showLogin);

// Set message with styling
function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.className = `text-center mt-3 ${isError ? 'text-danger' : 'text-success'}`;
}

function setLoading(loading, btn) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Processing...' : btn.dataset.originalText;
}

// Login Form Handler
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const loginBtn = document.getElementById('login-btn');
  loginBtn.dataset.originalText = loginBtn.textContent;
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  if (!email || !password) {
    setMessage('Please enter email and password.', true);
    return;
  }
  
  setLoading(true, loginBtn);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    setMessage('Signed in successfully. Redirecting...');
    setTimeout(() => window.location.href = '/index.html', 1000);
  } catch (err) {
    console.error('Login error:', err);
    let errorMessage = 'Failed to sign in.';
    if (err.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email.';
    } else if (err.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password.';
    } else if (err.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    } else if (err.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid email or password.';
    }
    setMessage(errorMessage, true);
  } finally {
    setLoading(false, loginBtn);
  }
});

// Signup Form Handler
signupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const signupBtn = document.getElementById('signup-btn');
  signupBtn.dataset.originalText = signupBtn.textContent;
  
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const habits = document.getElementById('signup-habits').value.trim();
  const noise = document.getElementById('signup-noise').value;
  const availability = document.getElementById('signup-availability').value;
  
  if (!name || !email || !password) {
    setMessage('Please fill in all required fields.', true);
    return;
  }
  
  if (password.length < 6) {
    setMessage('Password must be at least 6 characters.', true);
    return;
  }
  
  setLoading(true, signupBtn);
  let userCreated = false;
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    userCreated = true;
    
    console.log('User created in Auth:', user.uid);
    
    // Wait a moment for auth token to propagate
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Create user profile in Firestore
    console.log('Creating Firestore profile...');
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      habits: habits || '',
      noisePreference: noise,
      availability: availability,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('Profile created successfully');
    setMessage('Account created successfully! Redirecting...');
    setTimeout(() => window.location.href = '/index.html', 1000);
  } catch (err) {
    console.error('Signup error:', err);
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    
    let errorMessage = 'Sign up failed.';
    if (err.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already registered. Please sign in instead.';
    } else if (err.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    } else if (err.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Use at least 6 characters.';
    } else if (err.code === 'permission-denied' || err.message?.includes('permission')) {
      errorMessage = 'Permission error. Please try again or contact support.';
      // If user was created but profile failed, they can still sign in
      if (userCreated) {
        errorMessage += ' You can try signing in with your credentials.';
      }
    } else {
      errorMessage = err.message || 'Sign up failed.';
    }
    setMessage(errorMessage, true);
  } finally {
    setLoading(false, signupBtn);
  }
});

// Check if user is already signed in (only check, don't redirect during signup)
let isSigningUp = false;
signupForm?.addEventListener('submit', () => { isSigningUp = true; });

onAuthStateChanged(auth, async (user) => {
  // Don't interfere if we're in the middle of signup
  if (isSigningUp) return;
  
  if (user) {
    try {
      // Check if user profile exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setMessage('Already signed in. Redirecting...');
        setTimeout(() => window.location.href = '/index.html', 500);
      } else {
        // User exists in Auth but not in Firestore - stay on page to allow profile creation
        console.log('User found in Auth but not in Firestore');
      }
    } catch (err) {
      console.error('Error checking user profile:', err);
    }
  }
});
