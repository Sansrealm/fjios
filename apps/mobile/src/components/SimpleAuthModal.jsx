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

export default function SimpleAuthModal() {
  const { isOpen, mode, close } = useAuthModal();
  const { setAuth, auth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const fontsLoaded = useAppFonts();

  const handleAuth = async () => {
    if (!email || !password || (mode === "signup" && !name)) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const endpoint =
        mode === "signin" ? "/api/auth/signin" : "/api/auth/signup";
      const body =
        mode === "signin" ? { email, password } : { email, password, name };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Authentication failed");
      }

      const data = await response.json();

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
    } catch (error) {
      Alert.alert("Error", error.message);
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
