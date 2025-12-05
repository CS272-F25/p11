# Firebase Household Setup - Deployment Guide

## Files Created

1. **firestore.rules** - Firebase security rules for all collections
2. **js/utils/household.js** - Household management utilities
3. **household.html** - Household management page UI
4. **js/pages/household.js** - Household page logic

## Files Updated

1. **firebase.js** - Added Firestore import and db export
2. **js/main.js** - Added household page initialization
3. **components/navbar.html** - Added "Household" navigation link

## Deployment Steps

### 1. Deploy Firestore Rules

Run this command in your terminal:

```bash
firebase deploy --only firestore:rules
```

Or manually copy the contents of `firestore.rules` to your Firebase Console:
- Go to: https://console.firebase.google.com/project/cohabit-c5737/firestore/rules
- Replace the existing rules with the content from `firestore.rules`
- Click "Publish"

### 2. Test the Application

1. Open your application and navigate to the login page
2. Sign in with your account
3. Navigate to the new "Household" page
4. Try creating a new household or joining with an invite code

## Features Implemented

### Household Management
- ✅ Create new household with unique invite code
- ✅ Join existing household using invite code
- ✅ View household members with their profiles
- ✅ Update household name (creator only)
- ✅ Remove members (creator only)
- ✅ Leave household (any member)
- ✅ Regenerate invite code (creator only)
- ✅ Copy invite code to clipboard

### Security Features
- ✅ Only authenticated users can access households
- ✅ Users can only see households they're members of
- ✅ Only household creators can remove members and change settings
- ✅ All household data operations require membership verification

## API Functions Available

From `js/utils/household.js`:

```javascript
// Create a new household
await createHousehold(name)

// Get current user's household
await getCurrentUserHousehold()

// Join a household with invite code
await joinHousehold(inviteCode)

// Get all members of a household
await getHouseholdMembers(householdId)

// Remove a member from household
await removeMemberFromHousehold(householdId, userId)

// Leave current household
await leaveHousehold()

// Update household name
await updateHouseholdName(householdId, newName)

// Regenerate invite code
await regenerateInviteCode(householdId)
```

## Next Steps

To integrate households with other features:

1. **Chores** - Add householdId to chore creation and filter by household
2. **Finances** - Add householdId to expenses and settlements
3. **Directory** - Show only household members or filter roommate searches by household
4. **Notifications** - Send notifications to all household members

## Database Schema Reference

```
households/{householdId}
  - name: string
  - createdBy: string (userId)
  - createdAt: timestamp
  - members: array of userIds
  - inviteCode: string (6 chars)

users/{userId}
  - householdId: string (optional)
  - name, email, habits, etc.
```
