import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useMemo } from "react";
import { create } from "zustand";
import { Modal, View } from "react-native";
import { useAuthModal, useAuthStore, authKey } from "./store";

/**
 * This hook provides authentication functionality.
 * It may be easier to use the `useAuthModal` or `useRequireAuth` hooks
 * instead as those will also handle showing authentication to the user
 * directly.
 */
export const useAuth = () => {
  const { isReady, auth, setAuth } = useAuthStore();
  const { isOpen, close, open } = useAuthModal();

  const initiate = useCallback(() => {
    SecureStore.getItemAsync(authKey)
      .then((auth) => {
        let parsedAuth = null;

        if (auth) {
          try {
            parsedAuth = JSON.parse(auth);
          } catch (error) {
            console.error(
              "💥 Failed to parse stored auth data, clearing it:",
              error,
            );
            console.error("🗑️ Corrupted auth data:", auth);
            // Clear the corrupted data
            SecureStore.deleteItemAsync(authKey);
          }
        }

        useAuthStore.setState({
          auth: parsedAuth,
          isReady: true,
        });
      })
      .catch((error) => {
        console.error("💥 Failed to read auth from storage:", error);
        useAuthStore.setState({
          auth: null,
          isReady: true,
        });
      });
  }, []);

  // Initialize auth state when hook is first used
  useEffect(() => {
    if (!isReady) {
      initiate();
    }
  }, [initiate, isReady]);

  const signIn = useCallback(() => {
    open({ mode: "signin" });
  }, [open]);
  const signUp = useCallback((options) => {
    open({ mode: "signup", inviteCode: options?.inviteCode });
  }, [open]);

  const signOut = useCallback(() => {
    setAuth(null);
    close();
  }, [close, setAuth]);

  return {
    isReady,
    isAuthenticated: isReady ? !!auth : null,
    signIn,
    signOut,
    signUp,
    auth,
    setAuth,
    initiate,
  };
};

/**
 * This hook will automatically open the authentication modal if the user is not authenticated.
 */
export const useRequireAuth = (options) => {
  const { isAuthenticated, isReady } = useAuth();
  const { open } = useAuthModal();

  useEffect(() => {
    if (!isAuthenticated && isReady) {
      open({ mode: options?.mode });
    }
  }, [isAuthenticated, open, options?.mode, isReady]);
};

export default useAuth;
