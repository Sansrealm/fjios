import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function CardBack({
  currentAsk,
  handleFlipToFront,
  handleMessagePress,
  isAuthenticated,
}) {
  const askVideoPlayer = useVideoPlayer(currentAsk?.video_url, (player) => {
    player.loop = true;
    player.muted = false;
  });

  return (
    <LinearGradient
      colors={["#1A1A1A", "#0D0D0D"]}
      style={{ flex: 1, padding: 24 }}
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
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#8FAEA2" />
          <Text
            style={{
              color: "#8FAEA2",
              fontFamily: "Inter_500Medium",
              fontSize: 16,
            }}
          >
            Back to Card
          </Text>
        </TouchableOpacity>
      </View>

      {/* Ask Video */}
      {currentAsk?.video_url && (
        <View
          style={{
            height: "40%",
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 20,
            backgroundColor: "#000",
          }}
        >
          <VideoView
            player={askVideoPlayer}
            allowsFullscreen={false}
            nativeControls={true}
            style={{ flex: 1 }}
          />
        </View>
      )}

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

      {/* Message Button */}
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity
          onPress={handleMessagePress}
          style={{
            backgroundColor: isAuthenticated
              ? "#8FAEA2"
              : "rgba(255, 255, 255, 0.1)",
            borderWidth: isAuthenticated ? 0 : 1,
            borderColor: "#8FAEA2",
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Ionicons
            name={isAuthenticated ? "mail" : "lock-closed"}
            size={20}
            color={isAuthenticated ? "#000" : "#8FAEA2"}
          />
          <Text
            style={{
              color: isAuthenticated ? "#000" : "#8FAEA2",
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
            }}
          >
            {isAuthenticated
              ? `Message about ${currentAsk?.title || "this card"}`
              : "Join to Message"}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}