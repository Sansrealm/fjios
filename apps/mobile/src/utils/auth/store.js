import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

export const authKey = `${process.env.EXPO_PUBLIC_PROJECT_GROUP_ID}-jwt`;

/**
 * This store manages the authentication state of the application.
 */
export const useAuthStore = create((set) => ({
  isReady: false,
  auth: null,
  setAuth: (auth) => {
    if (auth) {
      try {
        SecureStore.setItemAsync(authKey, JSON.stringify(auth));
      } catch (error) {
        console.error("💥 Failed to save auth to storage:", error);
      }
    } else {
      try {
        SecureStore.deleteItemAsync(authKey);
      } catch (error) {
        console.error("💥 Failed to clear auth from storage:", error);
      }
    }
    set({ auth });
  },
}));

/**
 * This store manages the state of the authentication modal.
 */
export const useAuthModal = create((set) => ({
  isOpen: false,
  mode: "signup",
  inviteCode: null,
  open: (options) => set({ 
    isOpen: true, 
    mode: options?.mode || "signup",
    inviteCode: options?.inviteCode || null
  }),
  close: () => set({ isOpen: false, inviteCode: null }),
}));
