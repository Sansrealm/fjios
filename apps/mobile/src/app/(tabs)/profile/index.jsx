import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  useWindowDimensions,
  Share, // ADD: native share sheet
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import AppScreen from "@/components/AppScreen";
import useAppFonts from "@/hooks/useAppFonts";
import { useQuery } from "@tanstack/react-query";
import CardFront from "@/components/card/CardFront";
import CardBack from "@/components/card/CardBack";
import MessageModal from "@/components/card/MessageModal";
import Reanimated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCardAnimation } from "@/hooks/useCardAnimation";
import { fetchWithAuth } from "@/utils/api";
import { useCardCompletion } from "@/hooks/useCardCompletion";

function UserCardItem({ card, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "rgba(17, 17, 17, 0.8)",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <LinearGradient colors={["#1A1A1A", "#121212"]} style={{ padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#FFF",
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                marginBottom: 4,
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
                  marginBottom: 2,
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

          <Ionicons name="chevron-forward" size={20} color="#7C7C7C" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const [scrollY] = useState(new Animated.Value(0));
  const router = useRouter();
  const fontsLoaded = useAppFonts();
  const { isReady, isAuthenticated, signOut, signIn } = useAuth();
  const { data: user } = useUser();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // Fetch user's cards
  const {
    data: cardsData,
    isLoading,
    refetch,
  } = useQuery({
    // Include user id in the key to avoid stale cache between accounts
    queryKey: ["user-cards", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/cards?userId=${user?.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch cards");
      }
      return response.json();
    },
    enabled: isReady && isAuthenticated && !!user?.id,
  });

  const hasCard = !!(cardsData?.cards && cardsData.cards.length > 0);
  const firstCard = hasCard ? cardsData.cards[0] : null;

  // REPLACED: manual flip state with shared flip animation hook
  const {
    currentAsk,
    handleFlipToAsk,
    handleFlipToFront,
    frontAnimatedStyle,
    backAnimatedStyle,
    isFlipped,
  } = useCardAnimation();

  // Keep message modal for parity, though owners won't see message button on back
  const [messageOpen, setMessageOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageAsk, setMessageAsk] = useState(null);

  const { isComplete } = useCardCompletion();

  const handleMessagePress = (ask) => {
    setMessageAsk(ask || null);
    setMessageOpen(true);
  };

  const handleSendMessage = async ({ ask_id, message }) => {
    // Validate card completion before sending (only for authenticated users)
    if (!isComplete) {
      Alert.alert(
        "Complete Your Card First",
        "To send messages, you need to complete your card with a profile video, name, and description.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setSending(true);
      const res = await fetchWithAuth(`/api/cards/${firstCard.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ask_id,
          message,
          sender_email: user?.email || null,
          sender_name: user?.name || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      Alert.alert("Sent", "Your message was sent to your card email.");
      setMessageOpen(false);
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to send message");
      console.error("Profile send message error:", e);
    } finally {
      setSending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(tabs)/cards");
    } catch (error) {
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  // ADD: Share handler for this card (owner view)
  const handleShareCard = async () => {
    if (!firstCard) return;
    try {
      const slugOrId = firstCard.slug ? firstCard.slug : String(firstCard.id);
      const base =
        process.env.EXPO_PUBLIC_BASE_URL ||
        process.env.APP_URL ||
        process.env.EXPO_PUBLIC_HOST ||
        "";
      const url = base
        ? `${base}/card/${slugOrId}`
        : `https://createanything.com/card/${slugOrId}`;
      await Share.share({
        title: `${firstCard.name}'s card`,
        message: `${firstCard.name}'s card: ${url}`,
        url,
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not open share options");
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <AppScreen
        backgroundVariant="default"
        headerProps={{
          // show header with centered logo; hide avatar for minimal look
          leftComponent: <View />,
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
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
            <Ionicons name="person" size={40} color="#8FAEA2" />
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
            Welcome Back
          </Text>

          <Text
            style={{
              color: "#7F7F7F",
              fontFamily: "Inter_400Regular",
              fontSize: 16,
              textAlign: "center",
              lineHeight: 24,
              marginBottom: 32,
            }}
          >
            Sign in to access your digital cards or get started with an invite
            code
          </Text>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              signIn();
            }}
            style={{
              backgroundColor: "#8FAEA2",
              borderRadius: 12,
              paddingHorizontal: 32,
              paddingVertical: 16,
              marginBottom: 16,
              width: "100%",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#000",
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
              }}
            >
              Sign In
            </Text>
          </TouchableOpacity>

          {/* Get Started Button */}
          <TouchableOpacity
            onPress={() => router.push("/invite/email")}
            style={{
              backgroundColor: "transparent",
              borderWidth: 2,
              borderColor: "#8FAEA2",
              borderRadius: 12,
              paddingHorizontal: 32,
              paddingVertical: 16,
              width: "100%",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#8FAEA2",
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
              }}
            >
              New User? Get Started
            </Text>
          </TouchableOpacity>
        </View>
      </AppScreen>
    );
  }

  // If loading
  if (isLoading) {
    return (
      <AppScreen
        backgroundVariant="default"
        headerProps={{ leftComponent: <View /> }}
      >
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#8FAEA2" />
        </View>
      </AppScreen>
    );
  }

  // Compute a stable card height so the flip effect renders correctly and the Add button stays reachable
  const headerHeight = 80; // header shown on this screen
  const cardHeight = Math.max(
    560,
    windowHeight - (insets.top + headerHeight) - insets.bottom - 16,
  );

  // If user has a card, show it as their profile
  if (hasCard && firstCard) {
    return (
      <AppScreen
        backgroundVariant="default"
        headerProps={{
          // show centered logo; hide avatar for minimal look
          leftComponent: <View />,
        }}
        // CHANGE: use a single internal scroll inside the card face to avoid layered scrolling
        scrollable={false}
        contentContainerStyle={{ paddingHorizontal: 0 }}
      >
        <View style={{ flex: 1 }}>
          {/* Flip container with fixed height */}
          <View style={{ height: cardHeight }}>
            {/* Front */}
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
              // Prevent touches bleeding through while flipped
              pointerEvents={isFlipped ? "none" : "auto"}
            >
              <CardFront
                card={firstCard}
                handleFlipToAsk={handleFlipToAsk}
                // no message button on front; show Add Ask for owner
                isAuthenticated={true}
                isOwner={true}
                // REMOVED: onAddAsk to hide the Add button per request (handled in edit now)
                // onAddAsk={() =>
                //   router.push({
                //     pathname: "/card/[id]/edit",
                //     params: { id: String(firstCard.id) },
                //   })
                // }
                // NEW: pause front profile video when back is visible
                pauseVideo={isFlipped}
                // NEW: inline edit icon next to name
                onEdit={() => router.push(`/card/${String(firstCard.id)}/edit`)}
                // NEW: share icon inline next to the name
                onShare={handleShareCard}
              />
            </Reanimated.View>

            {/* Back */}
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
                isAuthenticated={true}
                isOwner={true}
                // Only mount the video element when fully flipped to back
                mountVideo={isFlipped}
              />
            </Reanimated.View>
          </View>

          {/* Owner viewing their own card doesn't need message modal; kept for parity */}
          <MessageModal
            visible={messageOpen}
            onClose={() => setMessageOpen(false)}
            asks={firstCard.asks || []}
            onSendMessage={handleSendMessage}
            loading={sending}
            isAuthenticated={true}
            preselectedAsk={messageAsk}
          />
        </View>
      </AppScreen>
    );
  }

  // No card yet -> show create button (unchanged)
  return (
    <AppScreen
      backgroundVariant="default"
      headerProps={{ leftComponent: <View /> }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <Ionicons name="card-outline" size={48} color="#7C7C7C" />
        <Text
          style={{
            color: "#7C7C7C",
            fontFamily: "Inter_500Medium",
            fontSize: 16,
            marginTop: 12,
            textAlign: "center",
          }}
        >
          You don't have a card yet
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/create-card")}
          style={{
            marginTop: 16,
            backgroundColor: "#8FAEA2",
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
        >
          <Text
            style={{
              color: "#000",
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
            }}
          >
            Create Your Card
          </Text>
        </TouchableOpacity>
      </View>
    </AppScreen>
  );
}
