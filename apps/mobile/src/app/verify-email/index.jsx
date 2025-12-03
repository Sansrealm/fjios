import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import useAppFonts from "@/hooks/useAppFonts";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import OTPInput from "@/components/OTPInput";
import { buildApiUrl } from "@/utils/api";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const email = params.email;

  // Send verification email when screen opens
  useEffect(() => {
    if (!email) {
      Alert.alert("Error", "Email is required");
      router.replace("/invite/email");
      return;
    }

    const sendVerificationEmail = async () => {
      setSendingEmail(true);
      try {
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

        console.log("📧 Sending verification email request:", { baseUrl, endpoint, email: payload.email });

        let lastError = null;
        let data = null;

        const allBases = bases.length > 0 ? bases.map(b => b.endsWith("/") ? b.slice(0, -1) : b) : [baseUrl];
        
        for (let i = 0; i < allBases.length; i++) {
          const base = allBases[i];
          const url = `${base}${endpoint}`;

          try {
            console.log(`🔄 Attempting request to: ${url}`);
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify(payload),
              redirect: "follow",
            });

            console.log(`📡 Response status: ${response.status} from ${url}`);

            const raw = await response.text();
            if (!raw) {
              lastError = new Error(`Empty response from ${url}`);
              console.error("❌ Empty response from server");
              continue;
            }

            try {
              data = JSON.parse(raw);
              console.log("✅ Response data:", data);
            } catch (e) {
              lastError = new Error(
                `Invalid JSON from ${url}: ${raw.substring(0, 200)}`,
              );
              console.error("❌ Invalid JSON response:", raw.substring(0, 200));
              continue;
            }

            if (!response.ok) {
              // If user already has an account, handle it specially
              if (data?.existingAccount) {
                lastError = {
                  message: data.error || "An account with this email already exists. Please sign in instead.",
                  existingAccount: true
                };
                console.error("❌ User already exists:", data.error);
                break; // Break out of loop to handle this error
              }
              lastError = new Error(
                data?.error || `Server error ${response.status}`,
              );
              console.error("❌ Server error:", data?.error || response.status);
              continue;
            }

            // Success path
            console.log("✅ Email send request successful");
            break;
          } catch (err) {
            console.error("❌ Network error:", err);
            lastError = err;
            continue;
          }
        }

        if (!data) {
          throw lastError || new Error("No data received from server after parsing");
        }

        // Check if error is about existing account
        if (lastError && lastError.existingAccount) {
          Alert.alert(
            "Account Already Exists",
            lastError.message || "An account with this email already exists. Please sign in instead.",
            [
              {
                text: "Sign In",
                onPress: () => router.replace("/signin"),
              },
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => router.replace("/invite/email"),
              },
            ]
          );
          return;
        }

        console.log("✅ Setting emailSent to true");
        setEmailSent(true);
      } catch (error) {
        console.error("❌ Error sending verification email:", error);
        
        // Check if error is about existing account
        if (error.existingAccount) {
          Alert.alert(
            "Account Already Exists",
            error.message || "An account with this email already exists. Please sign in instead.",
            [
              {
                text: "Sign In",
                onPress: () => router.replace("/signin"),
              },
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => router.replace("/invite/email"),
              },
            ]
          );
          return;
        }
        
        let userMessage = error.message || "Failed to send verification email. Please try again.";
        if (userMessage.includes("Network request failed")) {
          userMessage =
            "Cannot connect to server. Please check your internet connection.";
        }
        Alert.alert("Error", userMessage, [
          {
            text: "Go Back",
            onPress: () => router.replace("/invite/email"),
          },
          {
            text: "Retry",
            onPress: () => {
              setSendingEmail(false);
              setEmailSent(false);
              // Retry by calling the function again
              setTimeout(() => {
                sendVerificationEmail();
              }, 100);
            },
          },
        ]);
      } finally {
        setSendingEmail(false);
      }
    };

    sendVerificationEmail();
  }, [email, router]);

  const handleVerifyOTP = async (enteredOtp) => {
    if (!enteredOtp || enteredOtp.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP");
      return;
    }

    if (!email) {
      Alert.alert("Error", "Email is required");
      router.replace("/invite/email");
      return;
    }

    setLoading(true);
    try {
      const url = buildApiUrl("/api/auth/verify-email/otp");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          otp: enteredOtp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If user already has an account, redirect to sign in
        if (data.existingAccount) {
          Alert.alert(
            "Account Already Exists",
            data.error || "An account with this email already exists. Please sign in instead.",
            [
              {
                text: "Sign In",
                onPress: () => router.replace("/signin"),
              },
              {
                text: "Cancel",
                style: "cancel",
              },
            ]
          );
          return;
        }
        throw new Error(data.error || "Failed to verify OTP");
      }

      // Navigate to invite screen with verified email
      Alert.alert("Email Verified", "Your email has been verified successfully!", [
        {
          text: "Continue",
          onPress: () => {
            router.replace({
              pathname: "/invite",
              params: {
                email: data.email,
                verified: "true",
              },
            });
          },
        },
      ]);
    } catch (error) {
      console.error("Email OTP verification error:", error);
      Alert.alert(
        "Error",
        error.message || "Invalid OTP. Please try again.",
      );
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
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingVertical: 20,
            paddingBottom: 40,
            justifyContent: "center",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
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
              <Ionicons name="mail" size={40} color="#8FAEA2" />
            </View>

            <Text
              style={{
                color: "#FFF",
                fontFamily: "Inter_700Bold",
                fontSize: 28,
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Verify Email
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
              {sendingEmail
                ? "Sending verification email..."
                : emailSent
                ? `Enter the 6-digit OTP sent to\n${email}`
                : "Preparing to send verification email..."}
            </Text>

            {/* OTP Input - only show when email is sent */}
            {emailSent && (
              <OTPInput
                length={6}
                onComplete={handleVerifyOTP}
                disabled={loading || sendingEmail}
              />
            )}

            {sendingEmail && (
              <ActivityIndicator
                size="small"
                color="#8FAEA2"
                style={{ marginTop: 16 }}
              />
            )}

            {loading && (
              <ActivityIndicator
                size="small"
                color="#8FAEA2"
                style={{ marginTop: 16 }}
              />
            )}

            {/* Resend OTP Link - only show when email is sent */}
            {emailSent && (
              <TouchableOpacity
                onPress={async () => {
                  setSendingEmail(true);
                  setEmailSent(false);
                  try {
                    const proxyBase = process.env.EXPO_PUBLIC_PROXY_BASE_URL || "";
                    const appBase = process.env.EXPO_PUBLIC_BASE_URL || "";
                    const bases = [proxyBase, appBase].filter(Boolean);
                    const baseUrl = bases[0].endsWith("/") ? bases[0].slice(0, -1) : bases[0];
                    const url = `${baseUrl}/api/auth/verify-email/send`;
                    
                    const response = await fetch(url, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                      },
                      body: JSON.stringify({ email: email.trim().toLowerCase() }),
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || "Failed to resend OTP");
                    }

                    setEmailSent(true);
                    Alert.alert("Success", "OTP has been resent to your email.");
                  } catch (error) {
                    Alert.alert("Error", error.message || "Failed to resend OTP. Please try again.");
                  } finally {
                    setSendingEmail(false);
                  }
                }}
                disabled={sendingEmail}
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
                  {sendingEmail ? "Resending..." : "Didn't receive OTP? Resend"}
                </Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </ScrollView>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}

