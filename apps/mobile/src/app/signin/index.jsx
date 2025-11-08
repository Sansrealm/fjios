import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/utils/auth/useAuth";
import useAppFonts from "@/hooks/useAppFonts";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { fetchWithAuth } from "@/utils/api";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();
  const { setAuth } = useAuth();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      // Prefer platform proxy base URL for production/TestFlight; fallback to user base URL
      const proxyBase = process.env.EXPO_PUBLIC_PROXY_BASE_URL || "";
      const appBase = process.env.EXPO_PUBLIC_BASE_URL || "";
      const bases = [proxyBase, appBase].filter(Boolean);

      if (bases.length === 0) {
        throw new Error(
          "Server URL not configured. Please set EXPO_PUBLIC_PROXY_BASE_URL or EXPO_PUBLIC_BASE_URL.",
        );
      }

      const endpoint = "/api/auth/credentials-signin";
      const payload = { email: email.trim(), password: password.trim() };

      let lastError = null;
      let data = null;

      for (let i = 0; i < bases.length; i++) {
        const base = bases[i].endsWith("/") ? bases[i].slice(0, -1) : bases[i];
        const url = `${base}${endpoint}`;

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
            redirect: "follow",
          });

          const raw = await response.text();
          if (!raw) {
            lastError = new Error(`Empty response from ${url}`);
            // try next base if available
            continue;
          }

          try {
            data = JSON.parse(raw);
          } catch (e) {
            lastError = new Error(
              `Invalid JSON from ${url}: ${raw.substring(0, 200)}`,
            );
            continue;
          }

          if (!response.ok) {
            lastError = new Error(
              data?.error || `Server error ${response.status}`,
            );
            continue;
          }

          // Success path
          break;
        } catch (err) {
          lastError = err;
          continue;
        }
      }

      if (!data) {
        throw (
          lastError || new Error("No data received from server after parsing")
        );
      }

      if (!data.token && !data.jwt) {
        throw new Error(
          `No authentication token in response. Keys: ${Object.keys(data).join(", ")}`,
        );
      }

      // Store the JWT token
      setAuth({ jwt: data.token || data.jwt, user: data.user });

      // Check if user has a card and navigate accordingly
      try {
        const user = data.user;
        if (user?.id) {
          const cardsResponse = await fetchWithAuth(`/api/cards?userId=${user.id}`);
          if (cardsResponse.ok) {
            const cardsData = await cardsResponse.json();
            const hasCard = cardsData?.cards?.length > 0;
            
            if (hasCard) {
              router.replace("/(tabs)/cards");
            } else {
              router.replace("/(tabs)/profile");
            }
          } else {
            // If cards fetch fails, default to profile tab
            router.replace("/(tabs)/profile");
          }
        } else {
          // If no user ID, default to profile tab
          router.replace("/(tabs)/profile");
        }
      } catch (error) {
        console.error("Error checking user cards:", error);
        // If error checking cards, default to profile tab
        router.replace("/(tabs)/profile");
      }
    } catch (error) {
      console.error("Sign in error:", error);
      let userMessage = error.message || "Failed to sign in. Please try again.";
      if (userMessage.includes("Network request failed")) {
        userMessage =
          "Cannot connect to server. Please check your internet connection.";
      }
      Alert.alert("Authentication Error", userMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          paddingTop: insets.top,
        }}
      >
        <StatusBar style="light" />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: "rgba(17, 17, 17, 0.8)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View
          style={{
            flex: 1,
            paddingHorizontal: 20,
            justifyContent: "center",
          }}
        >
          <LinearGradient
            colors={["#1A1A1A", "#121212"]}
            style={{
              borderRadius: 20,
              padding: 32,
              alignItems: "center",
            }}
          >
            {/* Icon */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "rgba(143, 174, 162, 0.2)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <Ionicons name="person" size={40} color="#8FAEA2" />
            </View>

            {/* Title */}
            <Text
              style={{
                color: "#FFF",
                fontFamily: "Inter_700Bold",
                fontSize: 28,
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Welcome to Founder Journeys
            </Text>

            <Text
              style={{
                color: "#CFCFCF",
                fontFamily: "Inter_400Regular",
                fontSize: 16,
                textAlign: "center",
                lineHeight: 24,
                marginBottom: 32,
              }}
            >
              Sign in to discover founders, builders, investors, and a world of
              possibilities!
            </Text>

            {/* Email Input */}
            <View
              style={{
                width: "100%",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: "#8FAEA2",
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                Email
              </Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#7C7C7C"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderWidth: 1,
                  borderColor: "#8FAEA2",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  color: "#FFF",
                  fontFamily: "Inter_400Regular",
                  fontSize: 16,
                }}
              />
            </View>

            {/* Password Input */}
            <View
              style={{
                width: "100%",
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  color: "#8FAEA2",
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                Password
              </Text>

              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#7C7C7C"
                secureTextEntry
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderWidth: 1,
                  borderColor: "#8FAEA2",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  color: "#FFF",
                  fontFamily: "Inter_400Regular",
                  fontSize: 16,
                }}
              />
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={loading}
              style={{
                backgroundColor: loading ? "#5A7066" : "#8FAEA2",
                borderRadius: 12,
                paddingVertical: 16,
                paddingHorizontal: 32,
                alignItems: "center",
                width: "100%",
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              {loading && (
                <ActivityIndicator
                  size="small"
                  color="#000"
                  style={{ marginRight: 8 }}
                />
              )}
              <Text
                style={{
                  color: "#000",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                }}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={() => router.push("/forgot-password")}
              style={{ marginTop: 16 }}
            >
              <Text
                style={{
                  color: "#8FAEA2",
                  fontFamily: "Inter_500Medium",
                  fontSize: 16,
                  textAlign: "center",
                }}
              >
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <TouchableOpacity
              onPress={() => router.push("/invite/email")}
              style={{ marginTop: 24 }}
            >
              <Text
                style={{
                  color: "#7C7C7C",
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                Don't have an account?{" "}
                <Text
                  style={{
                    color: "#8FAEA2",
                    fontFamily: "Inter_500Medium",
                  }}
                >
                  Get an invite code
                </Text>
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
