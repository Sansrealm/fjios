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
import { useMutation } from "@tanstack/react-query";

export default function InviteScreen() {
  const [inviteCode, setInviteCode] = useState("");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();
  const { signUp, isAuthenticated, signIn } = useAuth();

  // Validate invite code mutation
  const validateCodeMutation = useMutation({
    mutationFn: async (code) => {
      console.log("📡 Making API call to validate code:", code);
      const response = await fetch("/api/invite-codes/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      console.log("📡 API response status:", response.status);

      if (!response.ok) {
        const error = await response.json();
        console.log("❌ API error:", error);
        throw new Error(error.error || "Invalid invite code");
      }

      const result = await response.json();
      console.log("✅ API success:", result);
      return result;
    },
    onSuccess: async () => {
      console.log("🎉 onSuccess called, isAuthenticated:", isAuthenticated);
      // Code is valid, now check if user is authenticated
      if (isAuthenticated) {
        console.log("✅ User is authenticated, marking code as used...");
        // User is authenticated, mark code as used and redirect
        try {
          await fetch("/api/invite-codes/validate", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code: inviteCode.trim().toUpperCase() }),
          });
          console.log("✅ Code marked as used");
        } catch (error) {
          console.log(
            "Note: Could not mark invite code as used, but continuing...",
          );
        }

        console.log("🔄 Redirecting to create-card...");
        router.push("/create-card");
      } else {
        console.log("🔐 User not authenticated, opening sign up...");
        // User needs to sign up first, store the code for later
        // After they authenticate, we'll redirect them to create-card
        signUp();
      }
    },
    onError: (error) => {
      console.log("❌ onError called:", error.message);

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
          ],
        );
      } else {
        Alert.alert("Invalid Code", error.message);
      }
    },
  });

  const handleValidateCode = () => {
    console.log("🚀 handleValidateCode called!");

    if (!inviteCode.trim()) {
      Alert.alert("Error", "Please enter an invite code");
      return;
    }

    console.log(
      "🚀 Starting validation for code:",
      inviteCode.trim().toUpperCase(),
    );
    console.log("🔐 Current auth state:", { isAuthenticated });
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
            style={{
              backgroundColor: "#8FAEA2",
              borderRadius: 12,
              paddingVertical: 16,
              paddingHorizontal: 32,
              alignItems: "center",
              width: "100%",
            }}
          >
            <Text
              style={{
                color: "#000",
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
              }}
            >
              Validate Code
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
            Try one of these test codes:{"\n"}
            <Text style={{ color: "#8FAEA2", fontFamily: "Inter_500Medium" }}>
              BETA2025, STARTUP2025, DEMO2025, TEST2025
            </Text>
            {"\n\n"}
            Don't have an invite code?{"\n"}
            Reach out to existing members or follow us on social media for
            updates.
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
  );
}
