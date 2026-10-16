import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  query, 
  where,
  orderBy, 
  setDoc,
  deleteDoc
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { Transaction, StaffContract, LeaveRequest } from "../types";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

import { getAuth } from "firebase/auth";
export const auth = getAuth(app);

export interface FirebaseBooking {
  id?: string;
  salonId: string;
  salonName: string;
  serviceId: string;
  serviceName: string;
  price: number;
  duration: number;
  artistId: string;
  artistName: string;
  date: string; // YYYY/MM/DD
  time: string; // HH:MM
  status: "Confirmed" | "Completed" | "Cancelled";
  userName: string;
  userPhone: string;
  createdAt: string;
  rating?: number;
}

// Helper to remove undefined values from objects as Firestore doesn't support them
function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  Object.keys(result).forEach((key) => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result;
}

// Firestore Error handler matching the firebase-integration skill requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Collection reference
const BOOKINGS_COLLECTION = "bookings";

// Save booking to Firebase
export async function saveBookingToDb(booking: Omit<FirebaseBooking, "id">): Promise<string> {
  try {
    const dataToSave = cleanUndefined({
      ...booking,
      createdAt: booking.createdAt || new Date().toISOString()
    });
    const docRef = await addDoc(collection(db, BOOKINGS_COLLECTION), dataToSave);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, BOOKINGS_COLLECTION);
    throw error;
  }
}

// Fetch all bookings from Firebase
export async function fetchBookingsFromDb(): Promise<FirebaseBooking[]> {
  try {
    const q = query(collection(db, BOOKINGS_COLLECTION), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const bookings: FirebaseBooking[] = [];
    querySnapshot.forEach((doc) => {
      bookings.push({
        id: doc.id,
        ...doc.data()
      } as FirebaseBooking);
    });
    return bookings;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, BOOKINGS_COLLECTION);
    throw error;
  }
}

// Update booking status in Firebase
export async function updateBookingStatusInDb(id: string, status: "Confirmed" | "Completed" | "Cancelled"): Promise<void> {
  const path = `${BOOKINGS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, BOOKINGS_COLLECTION, id);
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Update booking rating in Firebase
export async function updateBookingRatingInDb(id: string, rating: number): Promise<void> {
  const path = `${BOOKINGS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, BOOKINGS_COLLECTION, id);
    await updateDoc(docRef, { rating });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Collections
const TRANSACTIONS_COLLECTION = "transactions";
const CONTRACTS_COLLECTION = "contracts";
const LEAVE_REQUESTS_COLLECTION = "leave_requests";

// Transaction Reads/Writes
export async function saveTransactionToDb(transaction: Omit<Transaction, "id">): Promise<string> {
  try {
    const cleanData = cleanUndefined(transaction);
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), cleanData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, TRANSACTIONS_COLLECTION);
    throw error;
  }
}

export async function fetchTransactionsFromDb(salonId?: string): Promise<Transaction[]> {
  try {
    let q = query(collection(db, TRANSACTIONS_COLLECTION));
    if (salonId) {
      q = query(collection(db, TRANSACTIONS_COLLECTION), where("salonId", "==", salonId));
    }
    const querySnapshot = await getDocs(q);
    const list: Transaction[] = [];
    querySnapshot.forEach((doc) => {
      list.push({
        id: doc.id,
        ...doc.data()
      } as Transaction);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, TRANSACTIONS_COLLECTION);
    throw error;
  }
}

// Contract Reads/Writes
export async function saveContractToDb(userId: string, contract: StaffContract): Promise<void> {
  const path = `${CONTRACTS_COLLECTION}/${userId}`;
  try {
    const cleanData = cleanUndefined(contract);
    await setDoc(doc(db, CONTRACTS_COLLECTION, userId), cleanData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function fetchContractFromDb(userId: string): Promise<StaffContract | null> {
  const path = `${CONTRACTS_COLLECTION}/${userId}`;
  try {
    const docSnap = await getDoc(doc(db, CONTRACTS_COLLECTION, userId));
    if (docSnap.exists()) {
      return docSnap.data() as StaffContract;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    throw error;
  }
}

// Leave Request Reads/Writes
export async function saveLeaveRequestToDb(leaveReq: Omit<LeaveRequest, "id">): Promise<string> {
  try {
    const cleanData = cleanUndefined(leaveReq);
    const docRef = await addDoc(collection(db, LEAVE_REQUESTS_COLLECTION), cleanData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, LEAVE_REQUESTS_COLLECTION);
    throw error;
  }
}

export async function fetchLeaveRequestsFromDb(staffId?: string): Promise<LeaveRequest[]> {
  try {
    let q = query(collection(db, LEAVE_REQUESTS_COLLECTION));
    if (staffId) {
      q = query(collection(db, LEAVE_REQUESTS_COLLECTION), where("staffId", "==", staffId));
    }
    const querySnapshot = await getDocs(q);
    const list: LeaveRequest[] = [];
    querySnapshot.forEach((doc) => {
      list.push({
        id: doc.id,
        ...doc.data()
      } as LeaveRequest);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, LEAVE_REQUESTS_COLLECTION);
    throw error;
  }
}

export async function updateLeaveStatusInDb(id: string, status: LeaveRequest["status"]): Promise<void> {
  const path = `${LEAVE_REQUESTS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, LEAVE_REQUESTS_COLLECTION, id);
    await updateDoc(docRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}
