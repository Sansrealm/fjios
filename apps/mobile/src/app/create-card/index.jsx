import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import useAppFonts from "@/hooks/useAppFonts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import {
  fetchWithAuth,
  createAuthenticatedQueryFn,
  createAuthenticatedMutationFn,
} from "@/utils/api";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function CreateCardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();
  const { isAuthenticated } = useAuth();
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const cameraRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState("form"); // 'form', 'camera', 'recording'
  const [isRecording, setIsRecording] = useState(false);
  const [facing, setFacing] = useState("front");

  // Form data
  const [formData, setFormData] = useState({
    name: user?.name || "",
    startup_name: "",
    startup_website: "",
    role: "",
    description: "",
    profile_video_url: "",
    industry_tag_ids: [],
  });

  // Fetch industry tags
  const { data: tagsData } = useQuery({
    queryKey: ["industry-tags"],
    queryFn: async () => {
      const response = await fetch("/api/industry-tags");
      if (!response.ok) {
        throw new Error("Failed to fetch industry tags");
      }
      return response.json();
    },
  });

  // Create card mutation
  const createCardMutation = useMutation({
    mutationFn: async (cardData) => {
      console.log("🚀 Starting card creation...");
      console.log("👤 Current user:", user);
      console.log("🔐 Is authenticated:", isAuthenticated);
      console.log("📝 Sending card data:", JSON.stringify(cardData, null, 2));

      try {
        const response = await fetchWithAuth("/api/cards", {
          method: "POST",
          body: JSON.stringify(cardData),
        });

        console.log("📡 Response status:", response.status);
        console.log("📡 Response statusText:", response.statusText);
        console.log("📡 Response ok:", response.ok);
        console.log(
          "📡 Response headers:",
          Object.fromEntries(response.headers.entries()),
        );

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
            console.error("❌ API Error JSON:", errorData);
          } catch (jsonError) {
            errorData = await response.text();
            console.error("❌ API Error Text:", errorData);
          }
          throw new Error(
            `API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
          );
        }

        const result = await response.json();
        console.log("✅ Success result:", result);
        return result;
      } catch (fetchError) {
        console.error("💥 Fetch error:", fetchError);
        throw fetchError;
      }
    },
    onSuccess: (data) => {
      console.log("🎉 Card created successfully:", data);
      queryClient.invalidateQueries(["cards"]);
      queryClient.invalidateQueries(["user-cards"]);
      Alert.alert("Success", "Your digital card has been created!", [
        {
          text: "View Card",
          onPress: () => router.replace(`/card/${data.card.id}`),
        },
      ]);
    },
    onError: (error) => {
      console.error("💥 Create card error:", error);
      Alert.alert("Error", `Failed to create card: ${error.message}`);
    },
  });

  const handleRecordVideo = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Permission Required",
          "Camera permission is needed to record videos.",
        );
        return;
      }
    }

    setStep("camera");
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;

    setIsRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 30, // 30 seconds max
        quality: "high",
      });

      // In a real app, you would upload this video to your server
      // For now, we'll just use a placeholder URL
      setFormData((prev) => ({
        ...prev,
        profile_video_url: video.uri, // This would be the uploaded URL
      }));

      setStep("form");
      Alert.alert("Success", "Video recorded! Now complete your card details.");
    } catch (error) {
      console.error("Recording failed:", error);
      Alert.alert("Error", "Failed to record video. Please try again.");
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const handleTagToggle = (tagId) => {
    setFormData((prev) => ({
      ...prev,
      industry_tag_ids: prev.industry_tag_ids.includes(tagId)
        ? prev.industry_tag_ids.filter((id) => id !== tagId)
        : [...prev.industry_tag_ids, tagId],
    }));
  };

  const handleCreateCard = () => {
    console.log("🚀 Create card button pressed!");
    console.log("📱 Form data:", formData);

    if (!formData.name.trim()) {
      console.log("❌ Name validation failed");
      Alert.alert("Error", "Name is required");
      return;
    }

    if (formData.description.length > 124) {
      console.log("❌ Description validation failed");
      Alert.alert("Error", "Description must be 124 characters or less");
      return;
    }

    console.log("✅ Validation passed, creating card...");
    createCardMutation.mutate(formData);
  };

  if (!fontsLoaded) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 40,
        }}
      >
        <Text
          style={{
            color: "#FFF",
            fontFamily: "Inter_600SemiBold",
            fontSize: 24,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Sign In Required
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/invite")}
          style={{
            backgroundColor: "#8FAEA2",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
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
            Get Started
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera view
  if (step === "camera") {
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
            position: "absolute",
            top: insets.top + 16,
            left: 20,
            right: 20,
            zIndex: 10,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => setStep("form")}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleCameraFacing}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="camera-reverse" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing={facing}
          mode="video"
        />

        {/* Recording Controls */}
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 40,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isRecording ? "#FF6B6B" : "#8FAEA2",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}
          >
            <Ionicons
              name={isRecording ? "stop" : "videocam"}
              size={32}
              color="#000"
            />
          </TouchableOpacity>

          {isRecording && (
            <Text
              style={{
                color: "#FFF",
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                marginTop: 16,
              }}
            >
              Recording... (30s max)
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Form view
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
            justifyContent: "space-between",
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

          <Text
            style={{
              color: "#FFF",
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
            }}
          >
            Create Card
          </Text>

          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Video Section */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: "#FFF",
                fontFamily: "Inter_600SemiBold",
                fontSize: 18,
                marginBottom: 16,
              }}
            >
              Profile Video
            </Text>

            <TouchableOpacity
              onPress={handleRecordVideo}
              style={{
                backgroundColor: formData.profile_video_url
                  ? "#8FAEA2"
                  : "rgba(17, 17, 17, 0.8)",
                borderWidth: 1,
                borderColor: "#8FAEA2",
                borderRadius: 12,
                padding: 20,
                alignItems: "center",
                borderStyle: formData.profile_video_url ? "solid" : "dashed",
              }}
            >
              <Ionicons
                name={
                  formData.profile_video_url ? "checkmark-circle" : "videocam"
                }
                size={32}
                color={formData.profile_video_url ? "#000" : "#8FAEA2"}
              />
              <Text
                style={{
                  color: formData.profile_video_url ? "#000" : "#8FAEA2",
                  fontFamily: "Inter_500Medium",
                  fontSize: 16,
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                {formData.profile_video_url
                  ? "Video Recorded"
                  : "Record 30s Profile Video"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Basic Info */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: "#FFF",
                fontFamily: "Inter_600SemiBold",
                fontSize: 18,
                marginBottom: 16,
              }}
            >
              Basic Information
            </Text>

            <View style={{ gap: 16 }}>
              <View>
                <Text
                  style={{
                    color: "#8FAEA2",
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  Name *
                </Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, name: text }))
                  }
                  placeholder="Your full name"
                  placeholderTextColor="#7C7C7C"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
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
                  Startup/Company Name
                </Text>
                <TextInput
                  value={formData.startup_name}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, startup_name: text }))
                  }
                  placeholder="Your company name"
                  placeholderTextColor="#7C7C7C"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
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
                  Website
                </Text>
                <TextInput
                  value={formData.startup_website}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, startup_website: text }))
                  }
                  placeholder="https://your-website.com"
                  placeholderTextColor="#7C7C7C"
                  keyboardType="url"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
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
                  Role
                </Text>
                <TextInput
                  value={formData.role}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, role: text }))
                  }
                  placeholder="Founder, CEO, CTO, etc."
                  placeholderTextColor="#7C7C7C"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
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
                  Description ({formData.description.length}/124)
                </Text>
                <TextInput
                  value={formData.description}
                  onChangeText={(text) => {
                    if (text.length <= 124) {
                      setFormData((prev) => ({ ...prev, description: text }));
                    }
                  }}
                  placeholder="Brief description about yourself or your startup"
                  placeholderTextColor="#7C7C7C"
                  multiline
                  numberOfLines={3}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: "#FFF",
                    fontFamily: "Inter_400Regular",
                    fontSize: 16,
                    textAlignVertical: "top",
                  }}
                />
              </View>
            </View>
          </View>

          {/* Industry Tags */}
          {tagsData?.tags && (
            <View style={{ marginBottom: 32 }}>
              <Text
                style={{
                  color: "#FFF",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 18,
                  marginBottom: 16,
                }}
              >
                Industry Tags
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {tagsData.tags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    onPress={() => handleTagToggle(tag.id)}
                    style={{
                      backgroundColor: formData.industry_tag_ids.includes(
                        tag.id,
                      )
                        ? `${tag.color}30`
                        : "rgba(255, 255, 255, 0.1)",
                      borderWidth: 1,
                      borderColor: formData.industry_tag_ids.includes(tag.id)
                        ? tag.color
                        : "#333",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: formData.industry_tag_ids.includes(tag.id)
                          ? tag.color
                          : "#CFCFCF",
                        fontFamily: "Inter_500Medium",
                        fontSize: 14,
                      }}
                    >
                      {tag.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Create Button */}
          <TouchableOpacity
            onPress={handleCreateCard}
            disabled={createCardMutation.isPending}
            style={{
              backgroundColor: "#8FAEA2",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              opacity: createCardMutation.isPending ? 0.7 : 1,
            }}
          >
            {createCardMutation.isPending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text
                style={{
                  color: "#000",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                }}
              >
                Create Digital Card
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
