import React, { useState, useEffect } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/utils/auth/useAuth";
import useAppFonts from "@/hooks/useAppFonts";
import { useMutation } from "@tanstack/react-query";
import { buildApiUrl } from "@/utils/api";

export default function InviteScreen() {
  const [inviteCode, setInviteCode] = useState("");
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();
  const { isAuthenticated, signIn } = useAuth();

  const verifiedEmail = params.email;
  const isVerified = params.verified === "true";

  // Check if email is verified, if not redirect to email entry
  useEffect(() => {
    if (!isVerified && !isAuthenticated) {
      // If not verified and not authenticated, redirect to email entry
      router.replace("/invite/email");
    }
  }, [isVerified, isAuthenticated, router]);

  // Validate invite code mutation
  const validateCodeMutation = useMutation({
    mutationFn: async (code) => {
      const url = buildApiUrl("/api/invite-codes/validate");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Invalid invite code");
      }

      const result = await response.json();
      return result;
    },
    onSuccess: async () => {
      // Code is valid, now check if user is authenticated
      if (isAuthenticated) {
        // User is already authenticated, can create card directly
        // Invite codes are reusable, no need to mark as used
        router.push("/create-card");
      } else {
        // User needs to create password - navigate to password screen
        // Pass verified email and invite code
        if (!verifiedEmail) {
          Alert.alert(
            "Error",
            "Email verification required. Please start over.",
            [
              {
                text: "OK",
                onPress: () => router.replace("/invite/email"),
              },
            ]
          );
          return;
        }
        const validatedCode = inviteCode.trim().toUpperCase();
        router.push({
          pathname: "/invite/password",
          params: {
            email: verifiedEmail,
            inviteCode: validatedCode,
          },
        });
      }
    },
    onError: (error) => {
      // Check if the error is about an existing user
      if (
        error.message.includes("already exists") ||
        error.message.includes("already registered")
      ) {
        Alert.alert(
          "Account Already Exists",
          "It looks like you already have an account. Please sign in instead.",
          [
            {
              text: "Sign In",
              onPress: () => router.push("/signin"),
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        );
      } else {
        // Invalid invite code - show error and allow re-entry
        Alert.alert(
          "Invalid Invite Code",
          error.message || "The invite code you entered is invalid. Please check and try again.",
          [
            {
              text: "Try Again",
              style: "default",
            },
          ]
        );
      }
    },
  });

  const handleValidateCode = () => {
    if (!inviteCode.trim()) {
      Alert.alert("Error", "Please enter an invite code");
      return;
    }

    validateCodeMutation.mutate(inviteCode.trim().toUpperCase());
  };

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
            <Ionicons name="key" size={40} color="#8FAEA2" />
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
            Invite Only
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
            Enter your invite code to join the digital visiting card community
          </Text>

          {/* Invite Code Input */}
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
              Invite Code
            </Text>

            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="Enter invite code"
              placeholderTextColor="#7C7C7C"
              autoCapitalize="characters"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderWidth: 1,
                borderColor: "#8FAEA2",
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 16,
                color: "#FFF",
                fontFamily: "Inter_500Medium",
                fontSize: 16,
                textAlign: "center",
                letterSpacing: 2,
              }}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleValidateCode}
            disabled={validateCodeMutation.isPending}
            style={{
              backgroundColor: validateCodeMutation.isPending ? "#5A7066" : "#8FAEA2",
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 32,
              alignItems: "center",
              width: "100%",
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            {validateCodeMutation.isPending && (
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
              {validateCodeMutation.isPending ? "Validating..." : "Validate Code"}
            </Text>
          </TouchableOpacity>

          {/* Waitlist Link */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/waitlist");
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
              Don't have an invite code? Join the waitlist
            </Text>
          </TouchableOpacity>

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
  );
}