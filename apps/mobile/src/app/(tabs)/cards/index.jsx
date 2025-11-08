import React, { useMemo, useState, useCallback } from "react";
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
  FlatList,
  useWindowDimensions,
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
import useUser from "@/utils/auth/useUser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated from "react-native-reanimated";
import CardFront from "@/components/card/CardFront";
import CardBack from "@/components/card/CardBack";
import MessageModal from "@/components/card/MessageModal";
import { useCardAnimation } from "@/hooks/useCardAnimation";
import { fetchWithAuth } from "@/utils/api";
import { useFocusEffect } from "@react-navigation/native";
import { useCardCompletion } from "@/hooks/useCardCompletion";

function DigitalCard({ card, onPress, onSave, isAuthenticated }) {
  const handleShare = async () => {
    try {
      const slugOrId = card.slug ? card.slug : String(card.id);
      const base =
        process.env.EXPO_PUBLIC_BASE_URL ||
        process.env.APP_URL ||
        process.env.EXPO_PUBLIC_HOST ||
        "";
      const url = base
        ? `${base}/card/${slugOrId}`
        : `https://createanything.com/card/${slugOrId}`;

      await Share.share({
        title: `${card.name}'s card`,
        message: `${card.name}'s card: ${url}`,
        url,
      });
    } catch (error) {
      console.error("Error sharing:", error);
      Alert.alert("Error", "Could not open share options");
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
            {card.asks.slice(0, 3).map((ask) => (
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
                    color: "#9A9AA",
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

function DetailedCardPagerItem({ card, isAuthenticated, cardHeight, itemWidth, onScroll }) {
  const { currentAsk, handleFlipToAsk, handleFlipToFront, frontAnimatedStyle, backAnimatedStyle, isFlipped } =
    useCardAnimation();
  const [messageOpen, setMessageOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const isOwner = false; // discovery view shows other users' cards only
  const { isComplete } = useCardCompletion();

  const handleMessagePress = () => setMessageOpen(true);
  const handleSendMessage = async ({ ask_id, message }) => {
    // Validate card completion before sending (only for authenticated users)
    if (isAuthenticated && !isComplete) {
      Alert.alert(
        "Complete Your Card First",
        "To send messages, you need to complete your card with a profile video, name, and description.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setSending(true);
      const res = await fetchWithAuth(`/api/cards/${card.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ask_id, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      Alert.alert("Sent", "Your message was sent to the card owner.");
      setMessageOpen(false);
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleShare = async () => {
    try {
      const slugOrId = card.slug ? card.slug : String(card.id);
      const base =
        process.env.EXPO_PUBLIC_BASE_URL ||
        process.env.APP_URL ||
        process.env.EXPO_PUBLIC_HOST ||
        "";
      const url = base
        ? `${base}/card/${slugOrId}`
        : `https://createanything.com/card/${slugOrId}`;
      await Share.share({
        title: `${card.name}'s card`,
        message: `${card.name}'s card: ${url}`,
        url,
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not open share options");
    }
  };

  return (
    <View style={{ width: itemWidth, paddingHorizontal: 20 }}>
      <View style={{ height: cardHeight, position: "relative" }}>
        <Reanimated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            },
            frontAnimatedStyle,
          ]}
          pointerEvents={isFlipped ? "none" : "auto"}
        >
          <CardFront
            card={card}
            handleFlipToAsk={handleFlipToAsk}
            isAuthenticated={isAuthenticated}
            isOwner={isOwner}
            onScroll={onScroll}
            onShare={handleShare}
          />
        </Reanimated.View>
        <Reanimated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            },
            backAnimatedStyle,
          ]}
          pointerEvents={isFlipped ? "auto" : "none"}
        >
          <CardBack
            currentAsk={currentAsk}
            handleFlipToFront={handleFlipToFront}
            handleMessagePress={handleMessagePress}
            isAuthenticated={isAuthenticated}
            isOwner={isOwner}
            mountVideo={isFlipped}
            onScroll={onScroll}
          />
        </Reanimated.View>
      </View>
      <MessageModal
        visible={messageOpen}
        onClose={() => setMessageOpen(false)}
        asks={card.asks || []}
        onSendMessage={handleSendMessage}
        loading={sending}
        isAuthenticated={isAuthenticated}
      />
    </View>
  );
}

export default function CardsScreen() {
  const [scrollY] = useState(new Animated.Value(0));
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const router = useRouter();
  const fontsLoaded = useAppFonts();
  const { isReady, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  // Hook card vertical scroll to header for subtle effects
  const handleCardScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      ),
    [scrollY]
  );

  // Fetch cards (all or saved depending on toggle and query)
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

      const response = await fetchWithAuth(url, { method: "GET" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch cards");
      }
      return response.json();
    },
    enabled: true,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      return undefined;
    }, [refetch]),
  );

  // Fetch current user's own cards to know ownership
  const { data: myCardsData } = useQuery({
    queryKey: ["user-cards", user?.id],
    queryFn: async () => {
      const response = await fetchWithAuth(`/api/cards?userId=${user?.id}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch user's cards");
      }
      return response.json();
    },
    enabled: isReady && isAuthenticated && !!user?.id,
  });

  // Save/unsave card mutation
  const saveCardMutation = useMutation({
    mutationFn: async ({ cardId, isSaved }) => {
      const method = isSaved ? "DELETE" : "POST";
      const response = await fetchWithAuth(`/api/cards/${cardId}/saved`, { method });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update saved status");
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

  // Header buttons: search + saved toggle in header, per request
  const headerRightComponents = [
    <HeaderButton
      key="search"
      iconName={isSearchOpen ? "close" : "search"}
      onPress={() => setIsSearchOpen((v) => !v)}
      backgroundColor="#111"
      borderColor="#1E1E1E"
      iconColor="rgba(255,255,255,0.8)"
    />,
    <HeaderButton
      key="saved"
      iconName={showSavedOnly ? "bookmark" : "bookmark-outline"}
      onPress={() => setShowSavedOnly((s) => !s)}
      backgroundColor="#111"
      borderColor="#1E1E1E"
      iconColor={showSavedOnly ? "#D9FF1D" : "rgba(255,255,255,0.8)"}
    />,
  ];

  // Exclude current user's own card from the list
  const visibleCards = useMemo(() => {
    const list = (cardsData?.cards || []).filter((c) => {
      if (!user?.id) return true;
      return c.user_id !== user.id;
    });
    return list;
  }, [cardsData?.cards, user?.id]);

  const userHasCard =
    isAuthenticated && !!(myCardsData?.cards && myCardsData.cards.length > 0);

  // Sizing: ensure full card visible between header and bottom inset
  const headerHeight = 80; // approximate header height
  const cardHeight = Math.max(
    560,
    windowHeight - (insets.top + headerHeight) - insets.bottom - 16,
  );

  const showCompactList = isSearchOpen && searchQuery.trim().length > 0;

  return (
    <AppScreen
      backgroundVariant="default"
      headerProps={{
        scrollY,
        rightComponents: headerRightComponents,
        leftComponent: <View />,
      }}
      scrollable={false}
      contentContainerStyle={{ paddingHorizontal: 0 }}
    >
      {/* Minimized top area: only show search field when opened to keep full-card height */}
      {isSearchOpen && (
        <View
          style={{
            paddingHorizontal: 20,
            marginTop: 8,
            marginBottom: 8,
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(17, 17, 17, 0.8)",
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: "#1E1E1E",
            }}
          >
            <Ionicons name="search" size={20} color="#7C7C7C" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by domain or type..."
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
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#8FAEA2" />
          <Text
            style={{ color: "#7C7C7C", marginTop: 16, fontSize: 16 }}
          >
            Loading cards...
          </Text>
        </View>
      ) : visibleCards.length > 0 ? (
        showCompactList ? (
          <View style={{ paddingHorizontal: 20 }}>
            {visibleCards.map((card) => (
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
            ))}
          </View>
        ) : (
          <FlatList
            data={visibleCards}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <DetailedCardPagerItem
                card={item}
                isAuthenticated={isAuthenticated}
                cardHeight={cardHeight}
                itemWidth={windowWidth}
                onScroll={handleCardScroll}
              />
            )}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1, height: cardHeight }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            initialNumToRender={3}
            removeClippedSubviews={false}
            snapToInterval={windowWidth}
            decelerationRate="fast"
            getItemLayout={(_, index) => ({ length: windowWidth, offset: windowWidth * index, index })}
          />
        )
      ) : (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons
            name={showSavedOnly ? "bookmark-outline" : "card-outline"}
            size={48}
            color="#7C7C7C"
          />
          <Text
            style={{
              color: "#7C7C7C",
              fontFamily: "Inter_500Medium",
              fontSize: 16,
              marginTop: 12,
              textAlign: "center",
              paddingHorizontal: 20,
            }}
          >
            {showSavedOnly
              ? "No Saved Cards"
              : isAuthenticated && userHasCard
                ? "No other cards yet"
                : "No Cards Yet"}
          </Text>
        </View>
      )}
    </AppScreen>
  );
}
