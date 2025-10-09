import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function CardFront({
  card,
  handleFlipToAsk,
  handleMessagePress,
  isAuthenticated,
}) {
  const profileVideoPlayer = useVideoPlayer(
    card?.profile_video_url,
    (player) => {
      player.loop = true;
      player.muted = false;
    }
  );

  return (
    <LinearGradient
      colors={["#1A1A1A", "#0D0D0D"]}
      style={{ flex: 1, padding: 0 }}
    >
      {/* Profile Video */}
      {card.profile_video_url && (
        <View style={{ height: "50%", backgroundColor: "#000" }}>
          <VideoView
            player={profileVideoPlayer}
            allowsFullscreen={false}
            nativeControls={true}
            style={{ flex: 1 }}
          />
          <LinearGradient
            colors={["transparent", "rgba(13,13,13,0.3)", "rgba(13,13,13,0.7)"]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
            }}
          />
        </View>
      )}

      {/* Content Section */}
      <View
        style={{ flex: 1, padding: 24, justifyContent: "space-between" }}
      >
        {/* Profile Info */}
        <View>
          <Text
            style={{
              color: "#FFF",
              fontFamily: "Inter_700Bold",
              fontSize: 28,
              marginBottom: 8,
              letterSpacing: -0.5,
            }}
          >
            {card.name}
          </Text>

          {card.startup_name && (
            <TouchableOpacity
              onPress={() => {
                if (card.startup_website) {
                  Alert.alert("Visit Website", card.startup_website);
                }
              }}
            >
              <Text
                style={{
                  color: "#8FAEA2",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 18,
                  marginBottom: 4,
                }}
              >
                {card.startup_name}
              </Text>
            </TouchableOpacity>
          )}

          {card.role && (
            <Text
              style={{
                color: "#CFCFCF",
                fontFamily: "Inter_500Medium",
                fontSize: 16,
                marginBottom: 12,
              }}
            >
              {card.role}
            </Text>
          )}

          {card.description && (
            <Text
              style={{
                color: "#E5E5E5",
                fontFamily: "Inter_400Regular",
                fontSize: 15,
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              {card.description}
            </Text>
          )}

          {/* Industry Tags */}
          {card.industry_tags && card.industry_tags.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {card.industry_tags.map((tag) => (
                <View
                  key={tag.id}
                  style={{
                    backgroundColor: `${tag.color}25`,
                    borderWidth: 1,
                    borderColor: `${tag.color}80`,
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      color: tag.color,
                      fontFamily: "Inter_500Medium",
                      fontSize: 13,
                    }}
                  >
                    {tag.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Ask Buttons & Message */}
        <View>
          {card.asks && card.asks.length > 0 && (
            <View style={{ gap: 10, marginBottom: 20 }}>
              <Text
                style={{
                  color: "#8FAEA2",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  marginBottom: 8,
                }}
              >
                Ask me about:
              </Text>
              {card.asks.slice(0, 3).map((ask) => (
                <TouchableOpacity
                  key={ask.id}
                  onPress={() => handleFlipToAsk(ask)}
                  style={{
                    backgroundColor: "rgba(143, 174, 162, 0.15)",
                    borderWidth: 1,
                    borderColor: "#8FAEA2",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      color: "#8FAEA2",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                      flex: 1,
                    }}
                  >
                    {ask.title}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#8FAEA2"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={handleMessagePress}
            style={{
              backgroundColor: "#8FAEA2",
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
              color="#000"
            />
            <Text
              style={{
                color: "#000",
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
              }}
            >
              {isAuthenticated ? "Send Message" : "Join to Message"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}