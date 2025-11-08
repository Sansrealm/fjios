import { useAuth } from "@/utils/auth/useAuth";
import SimpleAuthModal from "@/components/SimpleAuthModal";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { initiate, isReady } = useAuth();

  useEffect(() => {
    initiate();
  }, [initiate]);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* Use full route names that include /index for directory routes */}
          <Stack.Screen
            name="card/[id]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="create-card/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="invite/index" options={{ headerShown: false }} />
          <Stack.Screen name="invite/email" options={{ headerShown: false }} />
          <Stack.Screen name="invite/password" options={{ headerShown: false }} />
          <Stack.Screen name="verify-email/index" options={{ headerShown: false }} />
          <Stack.Screen name="signin/index" options={{ headerShown: false }} />
          <Stack.Screen
            name="forgot-password/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="reset-password/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="waitlist/index" options={{ headerShown: false }} />
          {/* Also allow navigating to the edit page under /card/[id]/edit */}
          <Stack.Screen
            name="card/[id]/edit"
            options={{ headerShown: false }}
          />
          {/* Settings */}
          <Stack.Screen
            name="settings/index"
            options={{ headerShown: false }}
          />
        </Stack>

        {/* Simple Auth Modal for Testing */}
        <SimpleAuthModal />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
