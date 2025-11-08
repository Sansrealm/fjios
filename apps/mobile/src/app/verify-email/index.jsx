import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import useAppFonts from "@/hooks/useAppFonts";
import { useMutation } from "@tanstack/react-query";
import { buildApiUrl } from "@/utils/api";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();
  const [status, setStatus] = useState("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  // Verify email token mutation
  const verifyEmailMutation = useMutation({
    mutationFn: async (token) => {
      const url = buildApiUrl("/api/auth/verify-email");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Email verification failed");
      }

      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      setStatus("success");
      // Redirect to invite screen with verified email
      setTimeout(() => {
        router.replace({
          pathname: "/invite",
          params: { email: data.email, verified: "true" },
        });
      }, 1500);
    },
    onError: (error) => {
      setStatus("error");
      setErrorMessage(error.message || "Email verification failed. Please try again.");
    },
  });

  useEffect(() => {
    const token = params.token;
    if (token) {
      verifyEmailMutation.mutate(token);
    } else {
      setStatus("error");
      setErrorMessage("No verification token provided.");
    }
  }, [params.token]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        paddingTop: insets.top,
      }}
    >
      <StatusBar style="light" />

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
            {status === "verifying" && (
              <ActivityIndicator size="large" color="#8FAEA2" />
            )}
            {status === "success" && (
              <Ionicons name="checkmark-circle" size={40} color="#8FAEA2" />
            )}
            {status === "error" && (
              <Ionicons name="close-circle" size={40} color="#FF6B6B" />
            )}
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
            {status === "verifying" && "Verifying Email"}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
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
            {status === "verifying" && "Please wait while we verify your email address..."}
            {status === "success" && "Your email has been verified successfully. Redirecting..."}
            {status === "error" && errorMessage}
          </Text>

          {/* Error Actions */}
          {status === "error" && (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.replace("/invite/email");
              }}
              style={{
                backgroundColor: "#8FAEA2",
                borderRadius: 12,
                paddingVertical: 16,
                paddingHorizontal: 32,
                alignItems: "center",
                width: "100%",
                marginTop: 16,
              }}
            >
              <Text
                style={{
                  color: "#000",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                }}
              >
                Try Again
              </Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    </View>
  );
}

