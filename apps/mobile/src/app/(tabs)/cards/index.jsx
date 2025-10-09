import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Share,
  RefreshControl,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/utils/auth/useAuth";
import AppScreen from "@/components/AppScreen";
import { HeaderButton } from "@/components/AppHeader";
import useAppFonts from "@/hooks/useAppFonts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function DigitalCard({ card, onPress, onSave, isAuthenticated }) {
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${card.name}'s digital card: ${card.startup_name || "Startup"}`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "rgba(17, 17, 17, 0.9)",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <LinearGradient colors={["#1A1A1A", "#121212"]} style={{ padding: 20 }}>
        {/* Header with profile info */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: "#8FAEA2",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}
          >
            <Text
              style={{
                color: "#000",
                fontFamily: "Inter_700Bold",
                fontSize: 18,
              }}
            >
              {card.name?.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#FFF",
                fontFamily: "Inter_600SemiBold",
                fontSize: 18,
                marginBottom: 2,
              }}
            >
              {card.name}
            </Text>

            {card.startup_name && (
              <Text
                style={{
                  color: "#8FAEA2",
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  marginBottom: 1,
                }}
              >
                {card.startup_name}
              </Text>
            )}

            {card.role && (
              <Text
                style={{
                  color: "#7C7C7C",
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                }}
              >
                {card.role}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {isAuthenticated && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSave && onSave(card.id);
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: card.is_saved
                    ? "#8FAEA2"
                    : "rgba(143, 174, 162, 0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={card.is_saved ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={card.is_saved ? "#000" : "#8FAEA2"}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleShare();
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(143, 174, 162, 0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="share-outline" size={18} color="#8FAEA2" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Description */}
        {card.description && (
          <Text
            style={{
              color: "#CFCFCF",
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 16,
            }}
          >
            {card.description}
          </Text>
        )}

        {/* Industry tags */}
        {card.industry_tags && card.industry_tags.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            {card.industry_tags.map((tag) => (
              <View
                key={tag.id}
                style={{
                  backgroundColor: `${tag.color}20`,
                  borderWidth: 1,
                  borderColor: tag.color,
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: tag.color,
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                  }}
                >
                  {tag.name}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Ask buttons preview */}
        {card.asks && card.asks.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {card.asks.slice(0, 3).map((ask, index) => (
              <View
                key={ask.id}
                style={{
                  backgroundColor: "rgba(143, 174, 162, 0.15)",
                  borderWidth: 1,
                  borderColor: "#8FAEA2",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    color: "#8FAEA2",
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                  }}
                >
                  {ask.title}
                </Text>
              </View>
            ))}
            {card.asks.length > 3 && (
              <View
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    color: "#9A9A9A",
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                  }}
                >
                  +{card.asks.length - 3} more
                </Text>
              </View>
            )}
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function CardsScreen() {
  const [scrollY] = useState(new Animated.Value(0));
  const [searchQuery, setSearchQuery] = useState("");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const router = useRouter();
  const fontsLoaded = useAppFonts();
  const { isReady, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Fetch cards
  const {
    data: cardsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["cards", searchQuery, showSavedOnly],
    queryFn: async () => {
      let url = "/api/cards";
      const params = new URLSearchParams();

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      if (showSavedOnly && isAuthenticated) {
        params.append("saved_only", "true");
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch cards");
      }
      return response.json();
    },
    enabled: isReady,
  });

  // Save/unsave card mutation
  const saveCardMutation = useMutation({
    mutationFn: async ({ cardId, isSaved }) => {
      const method = isSaved ? "DELETE" : "POST";
      const response = await fetch(`/api/cards/${cardId}/saved`, { method });
      if (!response.ok) {
        throw new Error("Failed to update saved status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["cards"]);
      queryClient.invalidateQueries(["saved-cards"]);
    },
  });

  const handleSaveCard = (cardId) => {
    if (!isAuthenticated) return;

    const card = cardsData?.cards?.find((c) => c.id === cardId);
    if (card) {
      saveCardMutation.mutate({ cardId, isSaved: card.is_saved });
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const headerRightComponents = [
    <HeaderButton
      key="create"
      iconName="add"
      onPress={() => {
        console.log("🚀 + button pressed!");
        console.log("📱 isAuthenticated:", isAuthenticated);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isAuthenticated) {
          console.log("✅ User authenticated, navigating to /create-card");
          router.push("/create-card");
        } else {
          console.log("❌ User not authenticated, showing auth options");
          // Show choice between signin and invite
          Alert.alert(
            "Authentication Required",
            "Choose how you'd like to continue:",
            [
              {
                text: "Sign In",
                onPress: () => router.push("/signin"),
              },
              {
                text: "Get Invite Code",
                onPress: () => router.push("/invite"),
              },
              {
                text: "Cancel",
                style: "cancel",
              },
            ],
          );
        }
      }}
      backgroundColor="#8FAEA2"
      borderColor={null}
      iconColor="#000"
    />,
  ];

  return (
    <AppScreen
      backgroundVariant="default"
      headerProps={{
        scrollY,
        rightComponents: headerRightComponents,
      }}
      scrollable={true}
      scrollViewProps={{
        onScroll: Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        ),
        scrollEventThrottle: 16,
        refreshControl: (
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#8FAEA2"
          />
        ),
      }}
      contentContainerStyle={{
        paddingHorizontal: 20,
      }}
    >
      {/* Title */}
      <View style={{ marginBottom: 24, marginTop: 24 }}>
        <Text
          style={{
            color: "#FFF",
            fontFamily: "Inter_700Bold",
            fontSize: 36,
            lineHeight: 36 * 0.9,
            letterSpacing: -0.5,
          }}
        >
          Digital Cards
        </Text>
        <Text
          style={{
            color: "#8FAEA2",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            marginTop: 8,
          }}
        >
          Discover founder stories
        </Text>

        {/* TEMPORARY TEST BUTTON */}
        <TouchableOpacity
          onPress={() => {
            console.log("🧪 TEST BUTTON PRESSED!");
            alert("Test button works!");
            if (isAuthenticated) {
              console.log("✅ User authenticated, navigating to /create-card");
              router.push("/create-card");
            } else {
              console.log("❌ User not authenticated, navigating to /invite");
              router.push("/invite");
            }
          }}
          style={{
            backgroundColor: "#FF6B6B",
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginTop: 16,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#FFF",
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
            }}
          >
            🧪 TEST CREATE CARD BUTTON
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View
        style={{
          backgroundColor: "rgba(17, 17, 17, 0.8)",
          borderRadius: 12,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "#1E1E1E",
        }}
      >
        <Ionicons name="search" size={20} color="#7C7C7C" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search cards..."
          placeholderTextColor="#7C7C7C"
          style={{
            flex: 1,
            marginLeft: 12,
            color: "#FFF",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
          }}
        />
      </View>

      {/* Filter Buttons */}
      {isAuthenticated && (
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setShowSavedOnly(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={{
              backgroundColor: !showSavedOnly
                ? "#8FAEA2"
                : "rgba(255, 255, 255, 0.1)",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: !showSavedOnly ? "#8FAEA2" : "#333",
            }}
          >
            <Text
              style={{
                color: !showSavedOnly ? "#000" : "#CFCFCF",
                fontFamily: "Inter_500Medium",
                fontSize: 14,
              }}
            >
              All Cards
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setShowSavedOnly(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={{
              backgroundColor: showSavedOnly
                ? "#8FAEA2"
                : "rgba(255, 255, 255, 0.1)",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: showSavedOnly ? "#8FAEA2" : "#333",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons
              name="bookmark"
              size={14}
              color={showSavedOnly ? "#000" : "#CFCFCF"}
            />
            <Text
              style={{
                color: showSavedOnly ? "#000" : "#CFCFCF",
                fontFamily: "Inter_500Medium",
                fontSize: 14,
              }}
            >
              Saved
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cards List */}
      {isLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 60,
          }}
        >
          <ActivityIndicator size="large" color="#8FAEA2" />
          <Text
            style={{
              color: "#7C7C7C",
              fontFamily: "Inter_400Regular",
              fontSize: 16,
              marginTop: 16,
            }}
          >
            Loading cards...
          </Text>
        </View>
      ) : cardsData?.cards?.length > 0 ? (
        cardsData.cards.map((card) => (
          <DigitalCard
            key={card.id}
            card={card}
            onPress={() => {
              Haptics.selectionAsync();
              router.push(`/card/${card.id}`);
            }}
            onSave={handleSaveCard}
            isAuthenticated={isAuthenticated}
          />
        ))
      ) : (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 60,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(143, 174, 162, 0.15)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Ionicons
              name={showSavedOnly ? "bookmark-outline" : "card-outline"}
              size={40}
              color="#8FAEA2"
            />
          </View>
          <Text
            style={{
              color: "#FFF",
              fontFamily: "Inter_600SemiBold",
              fontSize: 24,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {showSavedOnly ? "No Saved Cards" : "No Cards Yet"}
          </Text>
          <Text
            style={{
              color: "#7F7F7F",
              fontFamily: "Inter_400Regular",
              fontSize: 16,
              textAlign: "center",
              lineHeight: 24,
              paddingHorizontal: 40,
            }}
          >
            {showSavedOnly
              ? "Save cards by tapping the bookmark icon"
              : "Be the first to create a digital visiting card"}
          </Text>
        </View>
      )}
    </AppScreen>
  );
}
