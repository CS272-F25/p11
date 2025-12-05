# Google Calendar API Integration Setup

This guide will help you set up Google Calendar API integration for CoHabit.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "CoHabit" and click "Create"

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

## Step 3: Create API Credentials

### Create an API Key:
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API key
4. Click "Restrict Key" (recommended)
   - Under "API restrictions", select "Restrict key"
   - Choose "Google Calendar API"
   - Click "Save"

### Create OAuth 2.0 Client ID:
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" (unless you have a Google Workspace)
   - Fill in:
     - App name: "CoHabit"
     - User support email: your email
     - Developer contact: your email
   - Click "Save and Continue"
   - Skip "Scopes" section
   - Add test users (your email and any testers)
   - Click "Save and Continue"
4. Back at "Create OAuth client ID":
   - Application type: "Web application"
   - Name: "CoHabit Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:8000` (for local testing)
     - `https://cs272-f25.github.io` (for GitHub Pages)
     - Add your custom domain if applicable
   - Authorized redirect URIs: (leave blank for this implementation)
   - Click "Create"
5. Copy the Client ID (it looks like: `xxxxx.apps.googleusercontent.com`)

## Step 4: Configure Your Application

1. Open `/js/utils/calendar.js`
2. Replace the placeholder values at the top:

```javascript
const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'YOUR_API_KEY_HERE';
```

With your actual credentials:

```javascript
const GOOGLE_CLIENT_ID = '123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'AIzaSyAaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQq';
```

## Step 5: Test Locally

1. Start your local server:
   ```bash
   python3 -m http.server 8000
   ```

2. Open http://localhost:8000/chores.html

3. Click "Connect Calendar" in the blue banner

4. Sign in with your Google account and grant permissions

5. Try creating a chore with "Sync to Google Calendar" checked

6. Open your Google Calendar to verify the event was created!

## Step 6: Deploy to GitHub Pages

1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Add Google Calendar integration"
   git push origin main
   ```

2. Wait a few minutes for GitHub Pages to rebuild

3. Visit your site: `https://cs272-f25.github.io/p11/chores.html`

## Features

✅ **Connect/Disconnect** - One-click Google Calendar authentication  
✅ **Sync Chores** - Add chores directly to your Google Calendar  
✅ **Auto-Update** - Mark chores complete and see status reflected in calendar  
✅ **Visual Indicators** - 📅 badge shows which chores are synced  
✅ **Manual Sync** - Sync button on existing chores  
✅ **Reminders** - Automatic 1-hour and 1-day before reminders  

## Troubleshooting

**"Failed to initialize calendar integration"**
- Check that both API Key and Client ID are set correctly
- Verify Google Calendar API is enabled in Cloud Console

**"Not authorized" error**
- Click "Connect Calendar" to sign in
- Make sure you granted calendar permissions

**Chores not appearing in calendar**
- Check the checkbox "Sync to Google Calendar" when creating
- Or use the 📅 button on existing chores
- Verify you're connected (green checkmark in banner)

**OAuth consent screen warnings**
- During development, you'll see "This app isn't verified"
- Click "Advanced" → "Go to CoHabit (unsafe)" to proceed
- This is normal for apps in testing mode

## Security Notes

- Never commit your actual API keys to public repositories
- Consider using environment variables or a config file
- For production, restrict your API key to specific domains
- Keep your OAuth client ID restricted to your domains only

## Cost

Google Calendar API is **free** for typical usage:
- 1,000,000 requests per day
- Creating/updating a few chores uses minimal quota

Enjoy your integrated calendar! 📅🏠
