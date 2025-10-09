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
        console.log("💾 Auth saved to storage");
      } catch (error) {
        console.error("💥 Failed to save auth to storage:", error);
      }
    } else {
      try {
        SecureStore.deleteItemAsync(authKey);
        console.log("🗑️ Auth cleared from storage");
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
  open: (options) => set({ isOpen: true, mode: options?.mode || "signup" }),
  close: () => set({ isOpen: false }),
}));
