import React, { useRef, useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import useAppFonts from "@/hooks/useAppFonts";
import { useAuth } from "@/utils/auth/useAuth";
import { useEditCard } from "@/hooks/useEditCard.js"; // Add .js extension
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useCameraRecording } from "@/hooks/useCameraRecording";
import { EditCardHeader } from "@/components/EditCard/EditCardHeader";
import { ProfileVideoSection } from "@/components/EditCard/ProfileVideoSection";
import { CardFormFields } from "@/components/EditCard/CardFormFields";
import { AsksSection } from "@/components/EditCard/AsksSection";
import { SaveButton } from "@/components/EditCard/SaveButton";

export default function EditCardScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();
  const { isAuthenticated } = useAuth();

  const {
    cardData,
    isLoading,
    formData,
    setFormData,
    updateMutation,
    updateAskMutation,
    deleteAskMutation,
  } = useEditCard(id);

  const {
    uploading,
    updatingProfileVideo,
    uploadProfileVideo,
    recordAndUploadVideo, // used for replacing ask videos
  } = useVideoUpload();

  // Simplified: only need addingAsk + handleRecordAsk from camera hook
  const { addingAsk, handleRecordAsk } = useCameraRecording(id);

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    if (formData.description && formData.description.length > 124) {
      Alert.alert("Error", "Description must be 124 characters or less");
      return;
    }
    updateMutation.mutate(formData, {
      onSuccess: () => {
        // After saving, return to Profile tab to show the updated card
        router.replace("/(tabs)/profile");
      },
    });
  };

  const handleSaveAsk = (askId, payload) => {
    // After saving an ask, go back to Profile tab to avoid old card detail view
    updateAskMutation.mutate(
      { askId, payload },
      {
        onSuccess: () => {
          router.replace("/(tabs)/profile");
        },
      },
    );
  };

  const handleDeleteAsk = (askId) => {
    deleteAskMutation.mutate({ askId });
  };

  // --- Auto-scroll to Asks section on open --- (ADD)
  const scrollRef = useRef(null);
  const asksAnchorY = useRef(0);
  const didInitialScroll = useRef(false);
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    if (!isLoading && fontsLoaded) {
      const t = setTimeout(() => setContentReady(true), 100);
      return () => clearTimeout(t);
    }
  }, [isLoading, fontsLoaded]);

  useEffect(() => {
    if (contentReady && !didInitialScroll.current && asksAnchorY.current > 0) {
      didInitialScroll.current = true;
      try {
        scrollRef.current?.scrollTo({
          y: Math.max(asksAnchorY.current - 12, 0),
          animated: true,
        });
      } catch (e) {}
    }
  }, [contentReady]);

  if (!fontsLoaded) return null;

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
            fontSize: 20,
            textAlign: "center",
          }}
        >
          Sign in required
        </Text>
      </View>
    );
  }

  // Removed camera step screen; we always stay on the edit form and use native camera overlay

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <View
        style={{ flex: 1, backgroundColor: "#000", paddingTop: insets.top }}
      >
        <StatusBar style="light" />
        <EditCardHeader onBack={() => router.back()} />
        {isLoading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color="#8FAEA2" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef} // ADD
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 20,
            }}
            showsVerticalScrollIndicator={false}
          >
            <ProfileVideoSection
              profileVideoUrl={formData.profile_video_url}
              onUpload={() => uploadProfileVideo(setFormData)}
              uploading={uploading}
              updatingProfileVideo={updatingProfileVideo}
            />

            <CardFormFields formData={formData} setFormData={setFormData} />

            {/* Anchor for Asks section to auto-scroll (ADD) */}
            <View
              onLayout={(e) => {
                asksAnchorY.current = e.nativeEvent.layout.y;
              }}
            >
              <AsksSection
                asks={cardData?.card?.asks}
                onRecordAsk={handleRecordAsk}
                addingAsk={addingAsk}
                onSaveAsk={handleSaveAsk}
                onDeleteAsk={handleDeleteAsk}
                onReplaceVideo={recordAndUploadVideo}
                uploading={uploading}
                updateAskMutation={updateAskMutation}
                deleteAskMutation={deleteAskMutation}
              />
            </View>

            <SaveButton
              onSave={handleSave}
              isSaving={updateMutation.isPending}
            />
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
