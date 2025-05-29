
"use client";

import type { User } from "firebase/auth";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "@/lib/firebase/config";
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, sendPasswordResetEmail as firebaseSendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { UserProfile, UserRole } from "@/types";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  addAppUser: (uid: string, email: string, displayName: string, role: UserRole) => Promise<void>; // Admin function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user profile from Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data() as UserProfile);
        } else {
          // This case should ideally not happen if users are created correctly by admin
          console.error("User profile not found in Firestore for UID:", firebaseUser.uid);
          setUserProfile(null); 
          // Optionally, sign out user if profile is missing critical role info
          // await firebaseSignOut(auth); 
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await firebaseSignInWithEmailAndPassword(auth, email, pass);
      // User state and profile will be updated by onAuthStateChanged
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
      setLoading(false);
    }
  };
  
  const sendPasswordResetEmail = async (email: string) => {
    await firebaseSendPasswordResetEmail(auth, email);
  };

  const addAppUser = async (uid: string, email: string, displayName: string, role: UserRole) => {
    // This function would typically be called from a server action or secured admin panel
    // For simplicity in client-side context, ensure this is role-protected
    if (userProfile?.role !== 'admin') {
      throw new Error("Unauthorized: Only admins can add users.");
    }
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, {
      uid,
      email,
      displayName,
      role,
      photoURL: null, // Default or generate avatar
    });
  };


  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signIn, signOut, sendPasswordResetEmail, addAppUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
