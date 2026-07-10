// Firebase Database Utilities
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

// Collections
const COLLECTIONS = {
  visitors: 'visitors',
  events: 'events',
  halls: 'halls',
  bookings: 'bookings',
  coworking: 'coworking'
};

// ==================== VISITORS ====================

export const addVisitor = async (visitorData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.visitors), {
      ...visitorData,
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...visitorData };
  } catch (error) {
    console.error('Error adding visitor:', error);
    throw error;
  }
};

export const getVisitors = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.visitors));
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting visitors:', error);
    throw error;
  }
};

export const updateVisitor = async (firebaseId, visitorData) => {
  try {
    const docRef = doc(db, COLLECTIONS.visitors, firebaseId);
    await updateDoc(docRef, {
      ...visitorData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating visitor:', error);
    throw error;
  }
};

export const deleteVisitor = async (firebaseId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.visitors, firebaseId));
  } catch (error) {
    console.error('Error deleting visitor:', error);
    throw error;
  }
};

// ==================== EVENTS ====================

export const addEvent = async (eventData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.events), {
      ...eventData,
      registrations: [],
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...eventData };
  } catch (error) {
    console.error('Error adding event:', error);
    throw error;
  }
};

export const getEvents = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.events));
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting events:', error);
    throw error;
  }
};

export const updateEvent = async (firebaseId, eventData) => {
  try {
    const docRef = doc(db, COLLECTIONS.events, firebaseId);
    await updateDoc(docRef, {
      ...eventData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

export const deleteEvent = async (firebaseId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.events, firebaseId));
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

// ==================== HALLS ====================

export const addHall = async (hallData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.halls), {
      ...hallData,
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...hallData };
  } catch (error) {
    console.error('Error adding hall:', error);
    throw error;
  }
};

export const getHalls = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.halls));
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting halls:', error);
    throw error;
  }
};

export const updateHall = async (firebaseId, hallData) => {
  try {
    const docRef = doc(db, COLLECTIONS.halls, firebaseId);
    await updateDoc(docRef, {
      ...hallData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating hall:', error);
    throw error;
  }
};

export const deleteHall = async (firebaseId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.halls, firebaseId));
  } catch (error) {
    console.error('Error deleting hall:', error);
    throw error;
  }
};

// ==================== BOOKINGS ====================

export const addBooking = async (bookingData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.bookings), {
      ...bookingData,
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...bookingData };
  } catch (error) {
    console.error('Error adding booking:', error);
    throw error;
  }
};

export const getBookings = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.bookings));
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting bookings:', error);
    throw error;
  }
};

export const updateBooking = async (firebaseId, bookingData) => {
  try {
    const docRef = doc(db, COLLECTIONS.bookings, firebaseId);
    await updateDoc(docRef, {
      ...bookingData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
};

export const deleteBooking = async (firebaseId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.bookings, firebaseId));
  } catch (error) {
    console.error('Error deleting booking:', error);
    throw error;
  }
};

// ==================== COWORKING ====================

export const addCoworking = async (coworkingData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.coworking), {
      ...coworkingData,
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...coworkingData };
  } catch (error) {
    console.error('Error adding coworking:', error);
    throw error;
  }
};

export const getCoworking = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.coworking));
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting coworking:', error);
    throw error;
  }
};

export const updateCoworking = async (firebaseId, coworkingData) => {
  try {
    const docRef = doc(db, COLLECTIONS.coworking, firebaseId);
    await updateDoc(docRef, {
      ...coworkingData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating coworking:', error);
    throw error;
  }
};

export const deleteCoworking = async (firebaseId) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.coworking, firebaseId));
  } catch (error) {
    console.error('Error deleting coworking:', error);
    throw error;
  }
};

// ==================== REAL-TIME LISTENERS ====================

export const listenToVisitors = (callback) => {
  const q = collection(db, COLLECTIONS.visitors);
  return onSnapshot(q, (snapshot) => {
    const visitors = snapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));
    callback(visitors);
  });
};

export const listenToEvents = (callback) => {
  const q = collection(db, COLLECTIONS.events);
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));
    callback(events);
  });
};

export const listenToBookings = (callback) => {
  const q = collection(db, COLLECTIONS.bookings);
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));
    callback(bookings);
  });
};

export const listenToCoworking = (callback) => {
  const q = collection(db, COLLECTIONS.coworking);
  return onSnapshot(q, (snapshot) => {
    const coworking = snapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));
    callback(coworking);
  });
};

// ==================== QUERY HELPERS ====================

export const getBookingsByHallAndDate = async (hallId, date) => {
  try {
    const q = query(
      collection(db, COLLECTIONS.bookings),
      where('hallId', '==', hallId),
      where('date', '==', date),
      where('status', '==', 'approved')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error querying bookings:', error);
    throw error;
  }
};

export const getUpcomingEvents = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, COLLECTIONS.events),
      where('date', '>=', today),
      orderBy('date', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting upcoming events:', error);
    throw error;
  }
  // ==================== COWORKING MEMBERS ====================

export const addCoworkingMember = async (memberData) => {
  try {
    const docRef = await addDoc(collection(db, 'coworkingMembers'), {
      ...memberData,
      createdAt: new Date().toISOString()
    });
    return { firebaseId: docRef.id, ...memberData };
  } catch (error) {
    console.error('Error adding coworking member:', error);
    throw error;
  }
};

export const getCoworkingMembers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'coworkingMembers'));
    return querySnapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting coworking members:', error);
    throw error;
  }
};

export const deleteCoworkingMember = async (firebaseId) => {
  try {
    await deleteDoc(doc(db, 'coworkingMembers', firebaseId));
  } catch (error) {
    console.error('Error deleting coworking member:', error);
    throw error;
  }
};
};
