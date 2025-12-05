import { db, auth } from '../../firebase.js';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Create a new chore
 * @param {Object} choreData - { name, assigneeId, frequency, dueDate, householdId }
 * @returns {Promise<string>} choreId
 */
export async function createChore(choreData) {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const chore = {
    name: choreData.name,
    assigneeId: choreData.assigneeId,
    assigneeName: choreData.assigneeName || '',
    frequency: choreData.frequency,
    dueDate: choreData.dueDate, // Store as string (YYYY-MM-DD)
    householdId: choreData.householdId,
    done: false,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'chores'), chore);
  return docRef.id;
}

/**
 * Get all chores for a household
 * @param {string} householdId
 * @returns {Promise<Array>}
 */
export async function getHouseholdChores(householdId) {
  const q = query(
    collection(db, 'chores'),
    where('householdId', '==', householdId),
    orderBy('dueDate', 'asc')
  );

  const querySnapshot = await getDocs(q);
  const chores = [];

  querySnapshot.forEach((doc) => {
    chores.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return chores;
}

/**
 * Get incomplete chores for a household
 * @param {string} householdId
 * @returns {Promise<Array>}
 */
export async function getIncompleteChores(householdId) {
  const q = query(
    collection(db, 'chores'),
    where('householdId', '==', householdId),
    where('done', '==', false),
    orderBy('dueDate', 'asc')
  );

  const querySnapshot = await getDocs(q);
  const chores = [];

  querySnapshot.forEach((doc) => {
    chores.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return chores;
}

/**
 * Get completed chores for a household
 * @param {string} householdId
 * @returns {Promise<Array>}
 */
export async function getCompletedChores(householdId) {
  const q = query(
    collection(db, 'chores'),
    where('householdId', '==', householdId),
    where('done', '==', true),
    orderBy('dueDate', 'desc')
  );

  const querySnapshot = await getDocs(q);
  const chores = [];

  querySnapshot.forEach((doc) => {
    chores.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return chores;
}

/**
 * Toggle chore completion status
 * @param {string} choreId
 * @param {boolean} done
 */
export async function toggleChoreCompletion(choreId, done) {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  await updateDoc(doc(db, 'chores', choreId), {
    done: done,
    completedAt: done ? serverTimestamp() : null,
    completedBy: done ? user.uid : null,
    updatedAt: serverTimestamp()
  });
}

/**
 * Update a chore
 * @param {string} choreId
 * @param {Object} updates - fields to update
 */
export async function updateChore(choreId, updates) {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  await updateDoc(doc(db, 'chores', choreId), {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Delete a chore
 * @param {string} choreId
 */
export async function deleteChore(choreId) {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  await deleteDoc(doc(db, 'chores', choreId));
}

/**
 * Delete all completed chores for a household
 * @param {string} householdId
 */
export async function deleteCompletedChores(householdId) {
  const completedChores = await getCompletedChores(householdId);
  
  const deletePromises = completedChores.map(chore => 
    deleteDoc(doc(db, 'chores', chore.id))
  );

  await Promise.all(deletePromises);
}

/**
 * Get chores assigned to a specific user
 * @param {string} householdId
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getUserChores(householdId, userId) {
  const q = query(
    collection(db, 'chores'),
    where('householdId', '==', householdId),
    where('assigneeId', '==', userId),
    orderBy('dueDate', 'asc')
  );

  const querySnapshot = await getDocs(q);
  const chores = [];

  querySnapshot.forEach((doc) => {
    chores.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return chores;
}

/**
 * Get chores due soon (within next 3 days)
 * @param {string} householdId
 * @returns {Promise<Array>}
 */
export async function getChoresDueSoon(householdId) {
  const today = new Date();
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  const todayStr = today.toISOString().split('T')[0];
  const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

  const allChores = await getIncompleteChores(householdId);
  
  return allChores.filter(chore => {
    return chore.dueDate >= todayStr && chore.dueDate <= threeDaysStr;
  });
}

/**
 * Get overdue chores
 * @param {string} householdId
 * @returns {Promise<Array>}
 */
export async function getOverdueChores(householdId) {
  const today = new Date().toISOString().split('T')[0];
  const allChores = await getIncompleteChores(householdId);
  
  return allChores.filter(chore => chore.dueDate < today);
}
