import { useEffect } from 'react';
import { BackHandler, Alert } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/utils/auth/useAuth';

/**
 * Prevents hardware back button from navigating back to auth screens
 * when user is authenticated and on authenticated screens (tabs, etc.)
 * 
 * Since we reset the navigation stack after login, preventing back navigation
 * from authenticated screens ensures users can't navigate back to auth screens.
 */
export const usePreventAuthBack = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isReady } = useAuth();

  useEffect(() => {
    // Only prevent back if user is authenticated and on an authenticated screen
    if (!isReady || !isAuthenticated) {
      return;
    }

    // Check if current path is an authenticated screen (tabs, create-card, etc.)
    const isAuthenticatedScreen = 
      pathname?.startsWith('/(tabs)') || 
      pathname?.startsWith('/create-card') ||
      pathname?.startsWith('/card/') ||
      pathname?.startsWith('/settings');

    if (!isAuthenticatedScreen) {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Since we've reset the navigation stack after login,
      // prevent back navigation from authenticated screens to avoid
      // navigating back to auth screens
      if (router.canGoBack()) {
        // Prevent back navigation - user should use app navigation instead
        return true; // Prevent default back behavior
      }
      // If we can't go back (at root), show exit confirmation
      Alert.alert(
        'Exit App',
        'Do you want to exit the app?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', onPress: () => BackHandler.exitApp() },
        ]
      );
      return true; // Prevent default back behavior
    });

    return () => {
      backHandler.remove();
    };
  }, [isAuthenticated, isReady, pathname, router]);
};

export default usePreventAuthBack;

