import { db, auth } from '../../firebase.js';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  arrayUnion,
  arrayRemove,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Generate a random 6-character invite code
 */
function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Create a new household
 * @param {string} name - Household name
 * @returns {Promise<{id: string, inviteCode: string}>}
 */
export async function createHousehold(name) {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const inviteCode = generateInviteCode();
  
  const householdData = {
    name: name,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    members: [user.uid],
    inviteCode: inviteCode
  };

  const docRef = await addDoc(collection(db, 'households'), householdData);
  
  // Store household ID in user's profile
  await updateDoc(doc(db, 'users', user.uid), {
    householdId: docRef.id,
    updatedAt: serverTimestamp()
  });

  return {
    id: docRef.id,
    inviteCode: inviteCode
  };
}

/**
 * Get household by ID
 * @param {string} householdId
 * @returns {Promise<object>}
 */
export async function getHousehold(householdId) {
  const docRef = doc(db, 'households', householdId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Household not found');
  }
  
  return {
    id: docSnap.id,
    ...docSnap.data()
  };
}

/**
 * Get current user's household
 * @returns {Promise<object|null>}
 */
export async function getCurrentUserHousehold() {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists() || !userDoc.data().householdId) {
    return null;
  }

  return await getHousehold(userDoc.data().householdId);
}

/**
 * Join household by invite code
 * @param {string} inviteCode
 * @returns {Promise<string>} householdId
 */
export async function joinHousehold(inviteCode) {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const q = query(
    collection(db, 'households'), 
    where('inviteCode', '==', inviteCode.toUpperCase())
  );
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error('Invalid invite code');
  }

  const householdDoc = querySnapshot.docs[0];
  const householdId = householdDoc.id;

  // Add user to household members
  await updateDoc(doc(db, 'households', householdId), {
    members: arrayUnion(user.uid)
  });

  // Update user's profile
  await updateDoc(doc(db, 'users', user.uid), {
    householdId: householdId,
    updatedAt: serverTimestamp()
  });

  return householdId;
}

/**
 * Remove a member from household
 * @param {string} householdId
 * @param {string} userId
 */
export async function removeMemberFromHousehold(householdId, userId) {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const household = await getHousehold(householdId);
  
  // Check if current user is household creator or removing themselves
  if (household.createdBy !== user.uid && userId !== user.uid) {
    throw new Error('Only household creator can remove members');
  }

  // Remove from household
  await updateDoc(doc(db, 'households', householdId), {
    members: arrayRemove(userId)
  });

  // Update user's profile
  await updateDoc(doc(db, 'users', userId), {
    householdId: null,
    updatedAt: serverTimestamp()
  });
}

/**
 * Leave current household
 */
export async function leaveHousehold() {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists() || !userDoc.data().householdId) {
    throw new Error('User is not in a household');
  }

  const householdId = userDoc.data().householdId;
  await removeMemberFromHousehold(householdId, user.uid);
}

/**
 * Update household name
 * @param {string} householdId
 * @param {string} newName
 */
export async function updateHouseholdName(householdId, newName) {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const household = await getHousehold(householdId);
  
  if (household.createdBy !== user.uid) {
    throw new Error('Only household creator can update name');
  }

  await updateDoc(doc(db, 'households', householdId), {
    name: newName
  });
}

/**
 * Regenerate invite code for household
 * @param {string} householdId
 * @returns {Promise<string>} new invite code
 */
export async function regenerateInviteCode(householdId) {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const household = await getHousehold(householdId);
  
  if (household.createdBy !== user.uid) {
    throw new Error('Only household creator can regenerate invite code');
  }

  const newInviteCode = generateInviteCode();
  await updateDoc(doc(db, 'households', householdId), {
    inviteCode: newInviteCode
  });

  return newInviteCode;
}

/**
 * Get all households the user is a member of
 * @returns {Promise<Array>}
 */
export async function getUserHouseholds() {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const q = query(
    collection(db, 'households'),
    where('members', 'array-contains', user.uid)
  );
  
  const querySnapshot = await getDocs(q);
  const households = [];
  
  querySnapshot.forEach((doc) => {
    households.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return households;
}

/**
 * Switch to a different household
 * @param {string} householdId
 */
export async function switchHousehold(householdId) {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  // Verify user is a member of this household
  const household = await getHousehold(householdId);
  if (!household.members.includes(user.uid)) {
    throw new Error('User is not a member of this household');
  }

  // Update user's active household
  await updateDoc(doc(db, 'users', user.uid), {
    householdId: householdId,
    updatedAt: serverTimestamp()
  });
}

/**
 * Get household members with their details
 * @param {string} householdId
 * @returns {Promise<Array>} Array of member objects with uid, displayName, and email
 */
export async function getHouseholdMembers(householdId) {
  const household = await getHousehold(householdId);
  const memberDetails = [];

  // Fetch details for each member
  for (const memberId of household.members) {
    try {
      const userDoc = await getDoc(doc(db, 'users', memberId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        memberDetails.push({
          uid: memberId,
          displayName: userData.displayName || userData.email?.split('@')[0] || 'Unknown User',
          email: userData.email || ''
        });
      }
    } catch (error) {
      console.error(`Error fetching user ${memberId}:`, error);
      memberDetails.push({
        uid: memberId,
        displayName: 'Unknown User',
        email: ''
      });
    }
  }

  return memberDetails;
}
