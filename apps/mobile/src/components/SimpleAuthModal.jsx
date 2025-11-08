import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuthModal, useAuthStore } from "@/utils/auth/store";
import useAppFonts from "@/hooks/useAppFonts";
import { useRouter } from "expo-router";
import { buildApiUrl } from "@/utils/api";

export default function SimpleAuthModal() {
  const { isOpen, mode, close, inviteCode } = useAuthModal();
  const { setAuth, auth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const fontsLoaded = useAppFonts();
  const router = useRouter();

  const handleAuth = async () => {
    if (!email || !password || (mode === "signup" && !name)) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const endpoint =
        mode === "signin" ? "/api/auth/credentials-signin" : "/api/auth/signup";
      
      // Include invite code in signup request if available
      const body =
        mode === "signin"
          ? { email, password }
          : { email, password, name, ...(inviteCode ? { inviteCode } : {}) };

      const url = buildApiUrl(endpoint);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        redirect: "follow",
      });

      const raw = await response.text();
      if (!raw) {
        throw new Error(`Empty response from ${url}`);
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        throw new Error(
          `Invalid JSON from ${url}: ${raw.substring(0, 200)}`,
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error || `Server error ${response.status}`,
        );
      }

      if (!data.token && !data.jwt) {
        throw new Error(
          `No authentication token in response. Keys: ${Object.keys(data).join(", ")}`,
        );
      }

      // Set auth data
      setAuth({
        jwt: data.token || data.jwt,
        user: data.user,
      });

      // Clear form
      setEmail("");
      setPassword("");
      setName("");

      close();

      // Navigate after successful auth
      if (mode === "signup") {
        // After signup, navigate to create card screen
        router.replace("/create-card");
      } else {
        // After sign in, check if user has card and navigate accordingly
        // For now, navigate to cards tab (can be enhanced later to check for card)
        router.replace("/(tabs)/cards");
      }
    } catch (error) {
      console.error("Auth error:", error);
      let userMessage = error.message || "Authentication failed";
      if (userMessage.includes("Network request failed")) {
        userMessage =
          "Cannot connect to server. Please check your internet connection.";
      }
      Alert.alert("Authentication Error", userMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#1E1E1E",
          }}
        >
          <TouchableOpacity onPress={close}>
            <Ionicons name="close" size={24} color="#8FAEA2" />
          </TouchableOpacity>

          <Text
            style={{
              color: "#FFF",
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
            }}
          >
            {mode === "signin" ? "Sign In" : "Sign Up"}
          </Text>

          <View style={{ width: 24 }} />
        </View>

        <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
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
              {mode === "signin" ? "Welcome Back" : "Join the Community"}
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
              {mode === "signin"
                ? "Sign in to access your digital cards"
                : "Create your account to start networking"}
            </Text>

            {/* Form */}
            <View style={{ width: "100%", gap: 16 }}>
              {mode === "signup" && (
                <View>
                  <Text
                    style={{
                      color: "#8FAEA2",
                      fontFamily: "Inter_500Medium",
                      fontSize: 14,
                      marginBottom: 8,
                    }}
                  >
                    Full Name
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    placeholderTextColor="#7C7C7C"
                    autoCapitalize="words"
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
              )}

              <View>
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
                  keyboardType="email-address"
                  autoCapitalize="none"
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

              <View>
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

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleAuth}
                disabled={loading}
                style={{
                  backgroundColor: "#8FAEA2",
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: "center",
                  marginTop: 16,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text
                    style={{
                      color: "#000",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 16,
                    }}
                  >
                    {mode === "signin" ? "Sign In" : "Sign Up"}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Forgot Password */}
              {mode === "signin" && (
                <TouchableOpacity
                  onPress={() => {
                    close();
                    router.push("/forgot-password");
                  }}
                  style={{ alignItems: "center", marginTop: 12 }}
                >
                  <Text
                    style={{
                      color: "#8FAEA2",
                      fontFamily: "Inter_500Medium",
                      fontSize: 16,
                    }}
                  >
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}

              {/* Switch Mode */}
              <TouchableOpacity
                onPress={() => {
                  // Toggle between signin and signup
                  const newMode = mode === "signin" ? "signup" : "signin";
                  close();
                  setTimeout(() => {
                    useAuthModal.setState({ isOpen: true, mode: newMode });
                  }, 100);
                }}
                style={{
                  alignItems: "center",
                  marginTop: 16,
                }}
              >
                <Text
                  style={{
                    color: "#CFCFCF",
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                  }}
                >
                  {mode === "signin"
                    ? "Don't have an account? "
                    : "Already have an account? "}
                  <Text
                    style={{
                      color: "#8FAEA2",
                      fontFamily: "Inter_500Medium",
                    }}
                  >
                    {mode === "signin" ? "Sign Up" : "Sign In"}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}
