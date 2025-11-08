import React, { useState, useEffect } from "react";
import { View, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated from "react-native-reanimated";

import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import useAppFonts from "@/hooks/useAppFonts";
import { useCard } from "@/hooks/useCard";
import { useCardAnimation } from "@/hooks/useCardAnimation";

import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import MessageModal from "@/components/card/MessageModal.jsx";
import LoadingView from "@/components/card/LoadingView.jsx";
import CardNotFoundView from "@/components/card/CardNotFoundView.jsx";
import CardHeader from "@/components/card/CardHeader.jsx";
import CardFront from "@/components/card/CardFront.jsx";
import CardBack from "@/components/card/CardBack.jsx";

const { height: screenHeight } = Dimensions.get("window");

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();
  const { isAuthenticated } = useAuth();
  const { data: currentUser } = useUser();

  const {
    card,
    isLoading,
    savedStatus,
    saveCardMutation,
    sendMessageMutation,
  } = useCard(id);

  const {
    currentAsk,
    handleFlipToAsk,
    handleFlipToFront,
    frontAnimatedStyle,
    backAnimatedStyle,
    flipRotation,
    isFlipped, // NEW: get flipped state to control header buttons
  } = useCardAnimation();

  const [showMessageModal, setShowMessageModal] = useState(false);

  useEffect(() => {
    if (sendMessageMutation.isSuccess) {
      setShowMessageModal(false);
      if (flipRotation.value !== 0) {
        handleFlipToFront();
      }
    }
  }, [sendMessageMutation.isSuccess, handleFlipToFront, flipRotation.value]);

  const handleMessagePress = () => {
    setShowMessageModal(true);
  };

  if (!fontsLoaded || isLoading) {
    return <LoadingView />;
  }

  if (!card) {
    return <CardNotFoundView />;
  }

  const isOwner = !!(isAuthenticated && currentUser?.id === card.user_id);

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

        <CardHeader
          card={card}
          savedStatus={savedStatus}
          onSave={() => saveCardMutation.mutate()}
          isAuthenticated={isAuthenticated}
          isOwner={isOwner}
          onEdit={() => router.push(`/card/${card.id}/edit`)}
          showEdit={!isFlipped} // NEW: hide edit icon on back face
        />

        {/* Card Container */}
        <View
          style={{
            flex: 1,
            paddingHorizontal: 20,
            justifyContent: "center",
            paddingTop: 80,
          }}
        >
          <View
            style={{
              width: "100%",
              height: screenHeight * 0.75,
              position: "relative",
            }}
          >
            {/* Front of Card */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  borderRadius: 24,
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  elevation: 8,
                },
                frontAnimatedStyle,
              ]}
            >
              <CardFront
                card={card}
                handleFlipToAsk={handleFlipToAsk}
                // no message on front; owners should not see Add Ask here
                isAuthenticated={isAuthenticated}
                isOwner={isOwner}
                pauseVideo={isFlipped} // strictly pause front video when back is shown
                // REMOVE: onAddAsk (owner adds/edits asks from the edit screen)
                // onAddAsk={() => router.push(`/card/${card.id}/edit`)}
              />
            </Animated.View>

            {/* Back of Card */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  borderRadius: 24,
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  elevation: 8,
                },
                backAnimatedStyle,
              ]}
            >
              <CardBack
                currentAsk={currentAsk}
                handleFlipToFront={handleFlipToFront}
                handleMessagePress={handleMessagePress}
                isAuthenticated={isAuthenticated}
                isOwner={isOwner}
                mountVideo={isFlipped} // only mount/play ask video when back is visible
              />
            </Animated.View>
          </View>
        </View>

        <MessageModal
          visible={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          asks={card.asks}
          onSendMessage={(data) => sendMessageMutation.mutate(data)}
          loading={sendMessageMutation.isPending}
          isAuthenticated={isAuthenticated}
        />
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
