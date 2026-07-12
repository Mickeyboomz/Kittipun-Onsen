import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    addDoc,
    updateDoc,
    where,
    orderBy,
    serverTimestamp
} from "firebase/firestore";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    updateProfile
} from "firebase/auth";
import { auth, db } from "./firebase.js";

const usersCol = collection(db, "users");
const bookingsCol = collection(db, "bookings");
const contactsCol = collection(db, "contacts");

function normalizeUserProfile(uid, data = {}) {
    return {
        uid,
        id: data.id || `FF-${uid.slice(0, 8).toUpperCase()}`,
        name: data.displayName || data.name || "ผู้ใช้",
        email: data.email || "",
        phone: data.phone || "",
        points: data.points ?? 0,
        role: data.role || "customer",
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null
    };
}

export async function getUserProfile(uid) {
    const userRef = doc(usersCol, uid);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) return null;
    return normalizeUserProfile(uid, snapshot.data());
}

export async function registerUser(userData) {
    const email = userData.email.trim().toLowerCase();
    const password = userData.password;

    if (!email || !password) {
        throw new Error("INVALID_CREDENTIALS");
    }

    if (password.length < 6) {
        throw new Error("PASSWORD_TOO_SHORT");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    await updateProfile(firebaseUser, {
        displayName: userData.name
    });

    const profile = {
        uid: firebaseUser.uid,
        id: userData.id || `FF-${firebaseUser.uid.slice(0, 8).toUpperCase()}`,
        displayName: userData.name,
        name: userData.name,
        phone: userData.phone || "",
        email,
        points: userData.points ?? 100,
        role: "customer",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await setDoc(doc(usersCol, firebaseUser.uid), profile, { merge: true });
    return normalizeUserProfile(firebaseUser.uid, profile);
}

export async function loginUser(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const firebaseUser = userCredential.user;
    const profile = await getUserProfile(firebaseUser.uid);

    if (!profile) {
        const fallbackProfile = {
            uid: firebaseUser.uid,
            id: `FF-${firebaseUser.uid.slice(0, 8).toUpperCase()}`,
            displayName: firebaseUser.displayName || email.split("@")[0],
            name: firebaseUser.displayName || email.split("@")[0],
            phone: "",
            email: firebaseUser.email,
            points: 0,
            role: "customer"
        };

        await setDoc(doc(usersCol, firebaseUser.uid), fallbackProfile, { merge: true });
        return normalizeUserProfile(firebaseUser.uid, fallbackProfile);
    }

    return profile;
}

export async function logoutUser() {
    await firebaseSignOut(auth);
}

export async function addUserPoints(uid, amount) {
    const userRef = doc(usersCol, uid);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) return null;

    const currentPoints = snapshot.data().points ?? 0;
    const newPoints = currentPoints + amount;
    await updateDoc(userRef, { points: newPoints, updatedAt: serverTimestamp() });
    return newPoints;
}

export async function createBooking(bookingData) {
    const docRef = await addDoc(bookingsCol, {
        ...bookingData,
        createdAt: serverTimestamp()
    });
    return docRef.id;
}

export async function getBookingsByUserId(userId) {
    const q = query(
        bookingsCol,
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ docId: d.id, ...d.data() }));
}

export async function createContact(contactData) {
    await addDoc(contactsCol, {
        ...contactData,
        createdAt: serverTimestamp()
    });
}
