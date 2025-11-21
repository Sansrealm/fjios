import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import AppBackground from "@/components/AppBackground";
import useAppFonts from "@/hooks/useAppFonts";
import { useAuth } from "@/utils/auth/useAuth";
import { buildApiUrl } from "@/utils/api";

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();
  const { isAuthenticated, auth } = useAuth();

  // Animation refs for logo
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;

  // Typing effect state
  const [typedText, setTypedText] = useState("");
  const timeoutsRef = useRef([]);

  // UPDATE: Splash logo to latest provided icon
  const LOGO_URI =
    "https://ucarecdn.com/aca0985f-601f-48d2-a603-529b0f0cd38f/-/format/auto/"; // replaced with latest provided logo

  const MAIN = "Let's make Serendipity happen";
  const SUFFIX = "..."; // 500ms pause for each of these dots
  const FULL_TEXT = `${MAIN}${SUFFIX}`;

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, []);

  // Run logo animation, then type text, then navigate
  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      startTyping(async () => {
        const t = setTimeout(async () => {
          // After signup, check if user has a card
          if (isAuthenticated && auth?.jwt) {
            try {
              // Check if environment is configured before making API call
              const baseUrl = process.env.EXPO_PUBLIC_BASE_URL || process.env.EXPO_PUBLIC_PROXY_BASE_URL;
              if (!baseUrl) {
                console.warn('⚠️ API URL not configured, skipping card check');
                router.replace("/(tabs)/cards");
                return;
              }

              const url = buildApiUrl(`/api/cards?userId=${auth.user?.id}`);
              const response = await fetch(url, {
                headers: {
                  Authorization: `Bearer ${auth.jwt}`,
                },
              });
              
              if (response.ok) {
                const data = await response.json();
                const hasCard = data?.cards?.length > 0;
                
                if (hasCard) {
                  router.replace("/(tabs)/cards");
                } else {
                  router.replace("/(tabs)/profile");
                }
              } else {
                // If check fails, default to cards tab
                router.replace("/(tabs)/cards");
              }
            } catch (error) {
              console.error('Error checking user cards:', error);
              // If check fails, default to cards tab
              router.replace("/(tabs)/cards");
            }
          } else {
            // Not authenticated, go to cards tab
            router.replace("/(tabs)/cards");
          }
        }, 300);
        timeoutsRef.current.push(t);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, isAuthenticated, auth]);

  const startTyping = (onDone) => {
    setTypedText("");
    const chars = FULL_TEXT.split("");
    let i = 0;

    const typeNext = () => {
      if (i >= chars.length) {
        onDone?.();
        return;
      }

      const ch = chars[i];
      if (typeof ch === "undefined") {
        onDone?.();
        return;
      }

      setTypedText((prev) => prev + ch);

      // Base speed for normal characters
      let delay = 28;

      // If we're in the trailing suffix dots, pause 500ms before each dot
      const inTrailingDots = i >= chars.length - SUFFIX.length;
      if (inTrailingDots && ch === ".") {
        delay = 500;
      }

      i += 1;
      const t = setTimeout(typeNext, delay);
      timeoutsRef.current.push(t);
    };

    // Small delay to feel natural after logo anim
    const first = setTimeout(typeNext, 120);
    timeoutsRef.current.push(first);
  };

  // Show splash immediately; no need to block on fonts, but if fonts are ready, we use them
  return (
    <AppBackground variant="default">
      <StatusBar style="light" />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: 24,
        }}
      >
        {/* Animated Logo */}
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          <ExpoImage
            source={{ uri: LOGO_URI }}
            style={{ width: 180, height: 180, marginBottom: 16 }}
            contentFit="contain"
            transition={100}
          />
        </Animated.View>

        {/* Typed Text: center under the logo so both are visually centered together */}
        <View
          style={{
            alignSelf: "center",
            width: "80%",
            maxWidth: 360,
          }}
        >
          <Text
            style={{
              color: "#8FAEA2",
              fontFamily: fontsLoaded ? "Inter_500Medium" : undefined,
              fontSize: 16,
              textAlign: "center", // center text to align with the logo above
            }}
          >
            {typedText}
          </Text>
        </View>
      </View>
    </AppBackground>
  );
}
