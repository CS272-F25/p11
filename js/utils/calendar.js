/**
 * Google Calendar API Integration
 * Syncs chores with Google Calendar
 */

// TODO: Replace with your Google API credentials
// Get these from: https://console.cloud.google.com/
const GOOGLE_CLIENT_ID = '347331573044-id53gsee2jopautlrb3sj2bsrgc6l6t3.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyA9_ooAECCF0oyFsooEHUsQ18CW-tBq7N8';
const CALENDAR_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let gapiInited = false;
let gisInited = false;
let tokenClient;
let accessToken = null;

// Storage keys
const CALENDAR_TOKEN_KEY = 'cohabit_calendar_token';
const CALENDAR_EXPIRY_KEY = 'cohabit_calendar_expiry';

/**
 * Initialize Google API client
 */
export async function initGoogleCalendar() {
  return new Promise((resolve, reject) => {
    // Load Google API script if not already loaded
    if (!window.gapi) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => loadGapi(resolve, reject);
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.body.appendChild(script);
    } else {
      loadGapi(resolve, reject);
    }
  });
}

function loadGapi(resolve, reject) {
  gapi.load('client', async () => {
    try {
      await gapi.client.init({
        apiKey: GOOGLE_API_KEY,
        discoveryDocs: [CALENDAR_DISCOVERY_DOC],
      });
      gapiInited = true;
      
      // Restore token from localStorage if available
      const storedToken = localStorage.getItem(CALENDAR_TOKEN_KEY);
      const expiry = localStorage.getItem(CALENDAR_EXPIRY_KEY);
      
      if (storedToken && expiry) {
        const expiryTime = parseInt(expiry);
        if (Date.now() < expiryTime) {
          gapi.client.setToken({ access_token: storedToken });
          accessToken = storedToken;
        } else {
          // Token expired, clear it
          localStorage.removeItem(CALENDAR_TOKEN_KEY);
          localStorage.removeItem(CALENDAR_EXPIRY_KEY);
        }
      }
      
      maybeEnableButtons(resolve);
    } catch (error) {
      reject(error);
    }
  });

  // Load Google Identity Services
  if (!window.google?.accounts?.oauth2) {
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
      });
      gisInited = true;
      maybeEnableButtons(resolve);
    };
    gisScript.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.body.appendChild(gisScript);
  } else {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: '',
    });
    gisInited = true;
    maybeEnableButtons(resolve);
  }
}

function maybeEnableButtons(resolve) {
  if (gapiInited && gisInited) {
    resolve();
  }
}

/**
 * Request Google Calendar authorization
 */
export function requestCalendarAuthorization() {
  return new Promise((resolve, reject) => {
    tokenClient.callback = async (resp) => {
      if (resp.error !== undefined) {
        reject(resp);
        return;
      }
      accessToken = resp.access_token;
      
      // Persist token to localStorage (expires in 1 hour)
      const expiryTime = Date.now() + (3600 * 1000); // 1 hour
      localStorage.setItem(CALENDAR_TOKEN_KEY, resp.access_token);
      localStorage.setItem(CALENDAR_EXPIRY_KEY, expiryTime.toString());
      
      resolve(resp);
    };

    if (gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

/**
 * Check if user is authorized
 */
export function isAuthorized() {
  // Check memory first
  if (accessToken !== null || gapi.client.getToken() !== null) {
    return true;
  }
  
  // Check localStorage
  const storedToken = localStorage.getItem(CALENDAR_TOKEN_KEY);
  const expiry = localStorage.getItem(CALENDAR_EXPIRY_KEY);
  
  if (storedToken && expiry) {
    const expiryTime = parseInt(expiry);
    if (Date.now() < expiryTime) {
      // Token is still valid, restore it
      gapi.client.setToken({ access_token: storedToken });
      accessToken = storedToken;
      return true;
    } else {
      // Token expired, clear it
      localStorage.removeItem(CALENDAR_TOKEN_KEY);
      localStorage.removeItem(CALENDAR_EXPIRY_KEY);
    }
  }
  
  return false;
}

/**
 * Sign out from Google Calendar
 */
export function signOutCalendar() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
    accessToken = null;
  }
  
  // Clear from localStorage
  localStorage.removeItem(CALENDAR_TOKEN_KEY);
  localStorage.removeItem(CALENDAR_EXPIRY_KEY);
}

/**
 * Create a calendar event for a chore
 * @param {Object} chore - The chore object
 * @returns {Promise<Object>} The created event
 */
export async function createCalendarEvent(chore) {
  if (!isAuthorized()) {
    throw new Error('Not authorized. Please connect Google Calendar first.');
  }

  const dueDate = new Date(chore.dueDate);
  const endDate = new Date(dueDate);
  endDate.setHours(endDate.getHours() + 1); // 1-hour event

  const event = {
    summary: `🏠 ${chore.name}`,
    description: `CoHabit Chore\nAssigned to: ${chore.assigneeName}\nFrequency: ${chore.frequency}`,
    start: {
      dateTime: dueDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 24 * 60 }, // 1 day before
      ],
    },
    colorId: '2', // Sage green color for chores
  };

  try {
    const response = await gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });
    return response.result;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

/**
 * Update a calendar event
 * @param {string} eventId - The Google Calendar event ID
 * @param {Object} chore - The updated chore object
 * @returns {Promise<Object>} The updated event
 */
export async function updateCalendarEvent(eventId, chore) {
  if (!isAuthorized()) {
    throw new Error('Not authorized. Please connect Google Calendar first.');
  }

  const dueDate = new Date(chore.dueDate);
  const endDate = new Date(dueDate);
  endDate.setHours(endDate.getHours() + 1);

  const event = {
    summary: `🏠 ${chore.name}`,
    description: `CoHabit Chore\nAssigned to: ${chore.assigneeName}\nFrequency: ${chore.frequency}${chore.completed ? '\n✓ Completed' : ''}`,
    start: {
      dateTime: dueDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: chore.completed ? '8' : '2', // Gray if completed, green otherwise
  };

  try {
    const response = await gapi.client.calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: event,
    });
    return response.result;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

/**
 * Delete a calendar event
 * @param {string} eventId - The Google Calendar event ID
 * @returns {Promise<void>}
 */
export async function deleteCalendarEvent(eventId) {
  if (!isAuthorized()) {
    throw new Error('Not authorized. Please connect Google Calendar first.');
  }

  try {
    await gapi.client.calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

/**
 * Sync a chore with Google Calendar
 * @param {Object} chore - The chore object
 * @returns {Promise<string>} The event ID
 */
export async function syncChoreToCalendar(chore) {
  if (chore.calendarEventId) {
    // Update existing event
    await updateCalendarEvent(chore.calendarEventId, chore);
    return chore.calendarEventId;
  } else {
    // Create new event
    const event = await createCalendarEvent(chore);
    return event.id;
  }
}

/**
 * Get calendar connection status message
 */
export function getConnectionStatus() {
  if (!gapiInited || !gisInited) {
    return 'Initializing...';
  }
  if (isAuthorized()) {
    return 'Connected';
  }
  return 'Not connected';
}
