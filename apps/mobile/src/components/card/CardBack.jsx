import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
  AppState,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useIsFocused } from "@react-navigation/native";
import { useCardCompletion } from "@/hooks/useCardCompletion";
import { useRouter } from "expo-router";

// Normalize Uploadcare video URLs to MP4 progressive to avoid HEAD 400 issues
function normalizeVideoUrl(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("ucarecdn.com")) return url;
    const path = u.pathname.endsWith("/") ? u.pathname : `${u.pathname}/`;
    // If no explicit video transforms present, add them
    if (!path.includes("/video/")) {
      u.pathname = `${path}video/-/format/mp4/-/progressive/yes/-/inline/yes/`;
    } else if (!path.includes("-/format/mp4/")) {
      u.pathname = path.replace("/video/", "/video/-/format/mp4/");
      if (!u.pathname.includes("-/progressive/yes/")) {
        u.pathname = `${u.pathname}-/progressive/yes/`;
      }
      if (!u.pathname.includes("-/inline/yes/")) {
        u.pathname = `${u.pathname}-/inline/yes/`;
      }
    } else {
      // has format; ensure progressive and inline
      let p = path;
      if (!p.includes("-/progressive/yes/")) {
        p = `${p}-/progressive/yes/`;
      }
      if (!p.includes("-/inline/yes/")) {
        p = `${p}-/inline/yes/`;
      }
      u.pathname = p;
    }
    return u.toString();
  } catch (_) {
    return url;
  }
}

export default function CardBack({
  currentAsk,
  handleFlipToFront,
  handleMessagePress,
  isAuthenticated,
  // added new prop to control visibility of message button for owners
  isOwner,
  // NEW: only mount video when back face is fully shown to avoid crashes during flip
  mountVideo = true,
  // NEW: optional onScroll to drive header effects
  onScroll,
}) {
  const router = useRouter();
  const { isComplete, card: userCard, isLoading: isLoadingCard } = useCardCompletion();

  const handleMessageButtonPress = () => {
    if (!isAuthenticated) {
      handleMessagePress(currentAsk);
      return;
    }

    // Check card completion before opening message modal
    if (!isComplete) {
      Alert.alert(
        "Complete Your Card First",
        "To send messages, you need to complete your card with a profile video, name, and description.",
        [
          {
            text: userCard ? "Edit Card" : "Create Card",
            onPress: () => {
              if (userCard) {
                router.push(`/card/${userCard.id}/edit`);
              } else {
                router.push("/create-card");
              }
            },
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
      return;
    }

    handleMessagePress(currentAsk);
  };
  // Keep player hook usage inside a child mounted only when a URL exists
  const AskVideo = ({ url }) => {
    const isScreenFocused = useIsFocused();
    const [appState, setAppState] = useState(AppState.currentState);
    const [isLoading, setIsLoading] = useState(true);
    const normalizedUrl = useMemo(() => normalizeVideoUrl(url), [url]);
    const player = useVideoPlayer(normalizedUrl, (p) => {
      p.loop = false; // play once
      p.muted = false;
    });

    // track foreground/background
    useEffect(() => {
      const sub = AppState.addEventListener("change", setAppState);
      return () => sub?.remove?.();
    }, []);

    // Strict focus-based playback for back side
    const shouldPlay =
      isScreenFocused && appState === "active" && mountVideo && !isLoading;
    useEffect(() => {
      if (!normalizedUrl) return;
      try {
        if (shouldPlay) {
          player.play();
        } else {
          player.pause();
        }
      } catch (e) {}
      return () => {
        try {
          player.pause();
        } catch (e) {}
      };
    }, [normalizedUrl, shouldPlay, player]);

    return (
      <View
        style={{
          height: 280,
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 20,
          backgroundColor: "#000",
        }}
      >
        {/* Loader overlay until first frame */}
        {isLoading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
              backgroundColor: "rgba(0,0,0,0.2)",
            }}
          >
            <ActivityIndicator size="large" color="#8FAEA2" />
          </View>
        )}
        <TouchableWithoutFeedback
          onPress={() => {
            try {
              player.play();
            } catch (e) {}
          }}
        >
          <View style={{ flex: 1 }}>
            <VideoView
              key={normalizedUrl}
              player={player}
              allowsFullscreen={false}
              nativeControls={true}
              style={{ flex: 1 }}
              onFirstFrameRender={() => setIsLoading(false)}
            />
          </View>
        </TouchableWithoutFeedback>
      </View>
    );
  };

  return (
    <LinearGradient colors={["#1A1A1A", "#0D0D0D"]} style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Back Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={handleFlipToFront}
            style={{ flexDirection: "row", alignItems: "center" }}
            accessibilityLabel="Back to card"
          >
            <Ionicons name="arrow-back" size={20} color="#8FAEA2" />
          </TouchableOpacity>
        </View>

        {/* Ask Video */}
        {mountVideo && currentAsk?.video_url ? (
          <AskVideo url={currentAsk.video_url} />
        ) : null}

        {/* Ask Info */}
        {currentAsk && (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: "#FFF",
                fontFamily: "Inter_700Bold",
                fontSize: 24,
                marginBottom: 12,
              }}
            >
              {currentAsk.title}
            </Text>

            {currentAsk.description && (
              <Text
                style={{
                  color: "#CFCFCF",
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  lineHeight: 22,
                  marginBottom: 20,
                }}
              >
                {currentAsk.description}
              </Text>
            )}
          </View>
        )}

        {/* Message Button: hide for owners viewing their own card */}
        {currentAsk && !isOwner && (
          <TouchableOpacity
            onPress={handleMessageButtonPress}
            disabled={isAuthenticated && isLoadingCard}
            style={{
              backgroundColor:
                isAuthenticated && isComplete
                  ? "#8FAEA2"
                  : isAuthenticated && !isComplete
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(255, 255, 255, 0.1)",
              borderWidth: isAuthenticated && isComplete ? 0 : 1,
              borderColor: "#8FAEA2",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 8,
              opacity: isAuthenticated && isLoadingCard ? 0.5 : 1,
            }}
          >
            {isAuthenticated && isLoadingCard ? (
              <ActivityIndicator size="small" color="#8FAEA2" />
            ) : (
              <>
                <Ionicons
                  name={
                    isAuthenticated && isComplete
                      ? "mail"
                      : isAuthenticated && !isComplete
                        ? "alert-circle"
                        : "lock-closed"
                  }
                  size={20}
                  color={
                    isAuthenticated && isComplete
                      ? "#000"
                      : "#8FAEA2"
                  }
                />
                <Text
                  style={{
                    color:
                      isAuthenticated && isComplete
                        ? "#000"
                        : "#8FAEA2",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 16,
                    marginLeft: 8,
                  }}
                >
                  {isAuthenticated && !isComplete
                    ? "Complete Card to Message"
                    : "Connect for this ask"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </LinearGradient>
  );
}
