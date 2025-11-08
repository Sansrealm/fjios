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
import { useRouter, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import useAppFonts from "@/hooks/useAppFonts";
import { useMutation } from "@tanstack/react-query";
import { buildApiUrl } from "@/utils/api";
import { useAuthStore } from "@/utils/auth/store";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

export default function PasswordCreationScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();
  const { setAuth } = useAuthStore();

  const email = params.email;
  const inviteCode = params.inviteCode;

  // Create account mutation
  const createAccountMutation = useMutation({
    mutationFn: async (data) => {
      const url = buildApiUrl("/api/auth/signup");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          inviteCode: data.inviteCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create account");
      }

      const result = await response.json();
      return result;
    },
    onSuccess: async (data) => {
      // Set auth data
      setAuth({
        jwt: data.token || data.jwt,
        user: data.user,
      });

      // Navigate to splash/index, then to Profile tab
      // The splash screen will handle navigation based on whether user has a card
      router.replace("/");
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to create account. Please try again.");
    },
  });

  const handleCreateAccount = () => {
    if (!password.trim()) {
      Alert.alert("Error", "Please enter a password");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (!email || !inviteCode) {
      Alert.alert("Error", "Missing required information. Please start over.");
      router.replace("/invite/email");
      return;
    }

    createAccountMutation.mutate({
      email: email.trim().toLowerCase(),
      password: password.trim(),
      inviteCode: inviteCode.trim().toUpperCase(),
    });
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
              <Ionicons name="lock-closed" size={40} color="#8FAEA2" />
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
              Create Your Password
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
              Choose a secure password for your account. Make sure it's at least 8 characters long.
            </Text>

            {/* Password Input */}
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
                Password
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderWidth: 1,
                  borderColor: "#8FAEA2",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                }}
              >
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#7C7C7C"
                  secureTextEntry={!showPassword}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    color: "#FFF",
                    fontFamily: "Inter_400Regular",
                    fontSize: 16,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 8 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#8FAEA2"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
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
                Confirm Password
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderWidth: 1,
                  borderColor: "#8FAEA2",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                }}
              >
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor="#7C7C7C"
                  secureTextEntry={!showConfirmPassword}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    color: "#FFF",
                    fontFamily: "Inter_400Regular",
                    fontSize: 16,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ padding: 8 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#8FAEA2"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleCreateAccount}
              disabled={createAccountMutation.isPending}
              style={{
                backgroundColor: createAccountMutation.isPending ? "#5A7066" : "#8FAEA2",
                borderRadius: 12,
                paddingVertical: 16,
                paddingHorizontal: 32,
                alignItems: "center",
                width: "100%",
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              {createAccountMutation.isPending && (
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
                {createAccountMutation.isPending ? "Creating Account..." : "Create Account"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}

