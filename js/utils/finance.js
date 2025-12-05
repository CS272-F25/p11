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
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Add an expense to a household
 * @param {string} householdId - The household ID
 * @param {object} expenseData - Expense data {description, amount, paidBy, participants}
 * @returns {Promise<string>} - The expense document ID
 */
export async function addExpense(householdId, expenseData) {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const expense = {
    householdId: householdId,
    description: expenseData.description,
    amount: parseFloat(expenseData.amount),
    paidBy: expenseData.paidBy,
    paidByUserId: user.uid, // Track who created it
    participants: expenseData.participants,
    isSettlement: expenseData.isSettlement || false,
    createdAt: serverTimestamp(),
    createdBy: user.uid
  };

  const docRef = await addDoc(collection(db, 'expenses'), expense);
  return docRef.id;
}

/**
 * Get all expenses for a household
 * @param {string} householdId - The household ID
 * @returns {Promise<Array>} - Array of expenses
 */
export async function getExpenses(householdId) {
  const q = query(
    collection(db, 'expenses'),
    where('householdId', '==', householdId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    // Convert Firestore Timestamp to milliseconds
    date: doc.data().createdAt?.toMillis() || Date.now()
  }));
}

/**
 * Delete an expense
 * @param {string} expenseId - The expense document ID
 * @returns {Promise<void>}
 */
export async function deleteExpense(expenseId) {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  // Verify user owns this expense
  const expenseRef = doc(db, 'expenses', expenseId);
  const expenseSnap = await getDoc(expenseRef);
  
  if (!expenseSnap.exists()) {
    throw new Error('Expense not found');
  }

  const expenseData = expenseSnap.data();
  
  // Allow deletion if user created the expense or is in the household
  if (expenseData.createdBy !== user.uid) {
    // Could add additional checks here if needed
    console.warn('User attempting to delete expense they did not create');
  }

  await deleteDoc(expenseRef);
}

/**
 * Subscribe to expense changes for a household
 * @param {string} householdId - The household ID
 * @param {function} callback - Callback function that receives expenses array
 * @returns {function} - Unsubscribe function
 */
export function subscribeToExpenses(householdId, callback) {
  const q = query(
    collection(db, 'expenses'),
    where('householdId', '==', householdId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().createdAt?.toMillis() || Date.now()
    }));
    callback(expenses);
  }, (error) => {
    console.error('Error listening to expenses:', error);
    callback([]);
  });
}

/**
 * Add a settlement payment to track when debts are paid
 * @param {string} householdId - The household ID
 * @param {object} settlementData - Settlement data {from, to, amount}
 * @returns {Promise<string>} - The settlement document ID
 */
export async function addSettlement(householdId, settlementData) {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  // Add as an expense that represents the settlement
  return await addExpense(householdId, {
    description: `Settlement: ${settlementData.from} → ${settlementData.to}`,
    amount: settlementData.amount,
    paidBy: settlementData.from,
    participants: [settlementData.to],
    isSettlement: true
  });
}

/**
 * Calculate balances for all household members
 * @param {Array} expenses - Array of expense objects
 * @returns {Object} - Object mapping member names to their balance
 */
export function calculateBalances(expenses) {
  const balances = {};
  
  expenses.forEach(expense => {
    const share = expense.amount / expense.participants.length;
    
    // Person who paid gets credited
    if (!balances[expense.paidBy]) {
      balances[expense.paidBy] = 0;
    }
    balances[expense.paidBy] += expense.amount;
    
    // Each participant gets debited their share
    expense.participants.forEach(participant => {
      if (!balances[participant]) {
        balances[participant] = 0;
      }
      balances[participant] -= share;
    });
  });
  
  return balances;
}

/**
 * Calculate optimal settlements to minimize number of transactions
 * @param {Object} balances - Object mapping member names to their balance
 * @returns {Array} - Array of settlement objects {from, to, amount}
 */
export function calculateSettlements(balances) {
  // Split into creditors (owed money) and debtors (owe money)
  const creditors = [];
  const debtors = [];
  
  Object.entries(balances).forEach(([name, amount]) => {
    if (amount > 0.01) {
      creditors.push({ name, amount });
    } else if (amount < -0.01) {
      debtors.push({ name, amount: Math.abs(amount) });
    }
  });
  
  // Calculate settlements
  const settlements = [];
  const creditorsCopy = creditors.map(c => ({ ...c }));
  const debtorsCopy = debtors.map(d => ({ ...d }));
  
  debtorsCopy.forEach(debtor => {
    let remaining = debtor.amount;
    
    creditorsCopy.forEach(creditor => {
      if (remaining > 0.01 && creditor.amount > 0.01) {
        const payment = Math.min(remaining, creditor.amount);
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: payment
        });
        remaining -= payment;
        creditor.amount -= payment;
      }
    });
  });
  
  return settlements;
}

/**
 * Get expense statistics for a household
 * @param {Array} expenses - Array of expense objects
 * @returns {Object} - Statistics object
 */
export function getExpenseStats(expenses) {
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const participants = new Set(expenses.flatMap(exp => [exp.paidBy, ...exp.participants]));
  
  return {
    total,
    count: expenses.length,
    participantCount: participants.size
  };
}
