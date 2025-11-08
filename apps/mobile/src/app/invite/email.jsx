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
import { buildApiUrl } from "@/utils/api";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

export default function EmailEntryScreen() {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();

  // Request email verification mutation
  const requestVerificationMutation = useMutation({
    mutationFn: async (email) => {
      const url = buildApiUrl("/api/auth/request-email-verification");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send verification email");
      }

      const result = await response.json();
      return result;
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
      Alert.alert("Error", error.message || "Failed to send verification email. Please try again.");
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

