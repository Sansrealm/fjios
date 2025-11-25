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
import useAppFonts from "@/hooks/useAppFonts";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();

  const handleResetRequest = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
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
          "Server URL not configured. Please set EXPO_PUBLIC_PROXY_BASE_URL or EXPO_PUBLIC_BASE_URL environment variable."
        );
      }

      const baseUrl = bases[0].endsWith("/") ? bases[0].slice(0, -1) : bases[0];
      const endpoint = "/api/auth/forgot-password";
      const fullUrl = `${baseUrl}${endpoint}`;
      const payload = { email: email.trim() };

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

      setEmailSent(true);
    } catch (error) {
      console.error("Password reset error:", error);
      let userMessage = error.message || "Failed to send reset email. Please try again.";
      if (userMessage.includes("Network request failed")) {
        userMessage =
          "Cannot connect to server. Please check your internet connection.";
      }
      Alert.alert("Error", userMessage);
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
              <Ionicons
                name={emailSent ? "checkmark-circle" : "lock-closed"}
                size={40}
                color="#8FAEA2"
              />
            </View>

            {emailSent ? (
              // Success state
              <>
                <Text
                  style={{
                    color: "#FFF",
                    fontFamily: "Inter_700Bold",
                    fontSize: 28,
                    textAlign: "center",
                    marginBottom: 12,
                  }}
                >
                  Check Your Email
                </Text>

                <Text
                  style={{
                    color: "#CFCFCF",
                    fontFamily: "Inter_400Regular",
                    fontSize: 16,
                    textAlign: "center",
                    lineHeight: 24,
                    marginBottom: 24,
                  }}
                >
                  We've sent a password reset link to{"\n"}
                  <Text
                    style={{ color: "#8FAEA2", fontFamily: "Inter_500Medium" }}
                  >
                    {email}
                  </Text>
                  {"\n\n"}
                  Click the link in the email to reset your password. The link
                  will expire in 1 hour.
                </Text>

                <TouchableOpacity
                  onPress={() => router.push("/signin")}
                  style={{
                    backgroundColor: "#8FAEA2",
                    borderRadius: 12,
                    paddingVertical: 16,
                    paddingHorizontal: 32,
                    alignItems: "center",
                    width: "100%",
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      color: "#000",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 16,
                    }}
                  >
                    Back to Sign In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                  style={{ marginTop: 8 }}
                >
                  <Text
                    style={{
                      color: "#8FAEA2",
                      fontFamily: "Inter_500Medium",
                      fontSize: 16,
                      textAlign: "center",
                    }}
                  >
                    Send to different email
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              // Form state
              <>
                <Text
                  style={{
                    color: "#FFF",
                    fontFamily: "Inter_700Bold",
                    fontSize: 28,
                    textAlign: "center",
                    marginBottom: 12,
                  }}
                >
                  Forgot Password
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
                  Enter your email address and we'll send you a link to reset
                  your password
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
                    Email
                  </Text>

                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor="#7C7C7C"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
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

                {/* Send Reset Email Button */}
                <TouchableOpacity
                  onPress={handleResetRequest}
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
                    {loading ? "Sending..." : "Send Reset Email"}
                  </Text>
                </TouchableOpacity>

                {/* Back to Sign In Link */}
                <TouchableOpacity
                  onPress={() => router.push("/signin")}
                  style={{ marginTop: 24 }}
                >
                  <Text
                    style={{
                      color: "#8FAEA2",
                      fontFamily: "Inter_500Medium",
                      fontSize: 16,
                      textAlign: "center",
                    }}
                  >
                    Back to Sign In
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </LinearGradient>
        </View>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
