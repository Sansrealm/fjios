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
import useAppFonts from "@/hooks/useAppFonts";
import { useMutation } from "@tanstack/react-query";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

export default function EmailEntryScreen() {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();

  // Request email verification mutation
  const requestVerificationMutation = useMutation({
    mutationFn: async (email) => {
      // Prefer platform proxy base URL for production/TestFlight; fallback to user base URL
      const proxyBase = process.env.EXPO_PUBLIC_PROXY_BASE_URL || "";
      const appBase = process.env.EXPO_PUBLIC_BASE_URL || "";
      const bases = [proxyBase, appBase].filter(Boolean);

      if (bases.length === 0) {
        throw new Error(
          "Server URL not configured. Please set EXPO_PUBLIC_PROXY_BASE_URL or EXPO_PUBLIC_BASE_URL environment variable."
        );
      }

      const baseUrl = bases[0].endsWith("/") ? bases[0].slice(0, -1) : bases[0];
      const endpoint = "/api/auth/verify-email/send";
      const payload = { email: email.trim().toLowerCase() };

      let lastError = null;
      let data = null;

      // Use baseUrl (which includes fallback) and also try all available bases
      const allBases = bases.length > 0 ? bases.map(b => b.endsWith("/") ? b.slice(0, -1) : b) : [baseUrl];
      
      for (let i = 0; i < allBases.length; i++) {
        const base = allBases[i];
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

      return data;
    },
    onSuccess: () => {
      Alert.alert(
        "Verification Email Sent",
        "Please check your email and click the verification link to continue.",
        [
          {
            text: "OK",
            onPress: () => {
              // User will be redirected via deep link when they click email link
            },
          },
        ]
      );
    },
    onError: (error) => {
      let userMessage = error.message || "Failed to send verification email. Please try again.";
      if (userMessage.includes("Network request failed")) {
        userMessage =
          "Cannot connect to server. Please check your internet connection.";
      }
      Alert.alert("Error", userMessage);
    },
  });

  const handleRequestVerification = () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    requestVerificationMutation.mutate(email.trim().toLowerCase());
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
              <Ionicons name="mail-outline" size={40} color="#8FAEA2" />
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
              Verify Your Email
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
              Enter your email address to receive a verification link. You'll need to verify your email before you can continue.
            </Text>

            {/* Email Input */}
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
                Email Address
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

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleRequestVerification}
              disabled={requestVerificationMutation.isPending}
              style={{
                backgroundColor: requestVerificationMutation.isPending ? "#5A7066" : "#8FAEA2",
                borderRadius: 12,
                paddingVertical: 16,
                paddingHorizontal: 32,
                alignItems: "center",
                width: "100%",
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              {requestVerificationMutation.isPending && (
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
                {requestVerificationMutation.isPending ? "Sending..." : "Send Verification Email"}
              </Text>
            </TouchableOpacity>

            {/* Help Text */}
            <Text
              style={{
                color: "#7C7C7C",
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                textAlign: "center",
                marginTop: 24,
                lineHeight: 20,
              }}
            >
              After clicking the link in your email, you'll be redirected back to the app to continue.
            </Text>

            {/* Sign In Link for Existing Users */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/signin");
              }}
              style={{
                marginTop: 24,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  color: "#8FAEA2",
                  fontFamily: "Inter_500Medium",
                  fontSize: 16,
                  textAlign: "center",
                }}
              >
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}

