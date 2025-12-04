import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Linking, // ADD: open default email client
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import AppScreen from "@/components/AppScreen";
import useAppFonts from "@/hooks/useAppFonts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/utils/api"; // ADD: ensure Bearer token is sent
// ADD: swipe-to-clear support
import { Swipeable } from "react-native-gesture-handler";

function MessageCard({ message, onMarkAsRead, onOpenEmail, onClear }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) {
        return `${diffInDays}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    }
  };

  // Show first 100 chars preview
  const full = message.message || "";
  const preview = full.length > 100 ? `${full.slice(0, 100)}…` : full;
  const fromLine = message.sender_name || message.sender_email || "Unknown";

  // RIGHT ACTIONS: swipe left to clear
  const renderRightActions = () => (
    <View
      style={{
        justifyContent: "center",
        alignItems: "center",
        width: 100,
        backgroundColor: "#8FAEA2",
        borderRadius: 16,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <TouchableOpacity
        onPress={() => onClear?.(message)}
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
        }}
      >
        <Text style={{ color: "#000", fontFamily: "Inter_700Bold" }}>
          Clear
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    // WRAP: swipe to reveal Clear
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity
        onPress={async () => {
          if (!message.is_read) {
            onMarkAsRead(message.id, message.card_id);
          }
          try {
            // Open the user's inbox via the provided handler (best-effort)
            await onOpenEmail?.();
          } catch (e) {
            console.error("Failed to open mail app", e);
            Alert.alert(
              "Open Mail",
              "Please open your email app to view this message.",
            );
          }
        }}
        style={{
          backgroundColor: message.is_read
            ? "rgba(17, 17, 17, 0.6)"
            : "rgba(17, 17, 17, 0.9)",
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 16,
          borderWidth: message.is_read ? 0 : 1,
          borderColor: "#8FAEA2",
        }}
      >
        <LinearGradient
          colors={
            message.is_read ? ["#0F0F0F", "#0A0A0A"] : ["#1A1A1A", "#121212"]
          }
          style={{ padding: 20 }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                {message.ask_title && (
                  <View
                    style={{
                      backgroundColor: "rgba(143, 174, 162, 0.2)",
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      alignSelf: "flex-start",
                      marginRight: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "#8FAEA2",
                        fontFamily: "Inter_500Medium",
                        fontSize: 12,
                      }}
                    >
                      About: {message.ask_title}
                    </Text>
                  </View>
                )}
                {!message.is_read && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#8FAEA2",
                    }}
                  />
                )}
              </View>
            </View>

            <Text
              style={{
                color: "#7C7C7C",
                fontFamily: "Inter_400Regular",
                fontSize: 12,
              }}
            >
              {formatDate(message.created_at)}
            </Text>
          </View>

          {/* Message Preview */}
          <Text
            style={{
              color: message.is_read ? "#CFCFCF" : "#FFF",
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 8,
            }}
          >
            {preview}
          </Text>
          <Text
            style={{
              color: "#9A9A9A",
              fontFamily: "Inter_500Medium",
              fontSize: 13,
            }}
          >
            From: {fromLine}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function MessagesScreen() {
  const [scrollY] = useState(new Animated.Value(0));
  const fontsLoaded = useAppFonts();
  const { isReady, isAuthenticated } = useAuth();
  const { data: user } = useUser();
  const queryClient = useQueryClient();

  // Invalidate unread count when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        queryClient.invalidateQueries(["unread-messages", user.id]);
      }
    }, [user?.id, queryClient]),
  );

  // Fetch user's cards to get messages
  const {
    data: cardsData,
    isLoading,
    refetch: refetchCards,
  } = useQuery({
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

  // Fetch all messages for user's cards
  const { data: allMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ["user-messages", cardsData?.cards?.map((c) => c.id)],
    queryFn: async () => {
      if (!cardsData?.cards?.length) return [];

      const messagesPromises = cardsData.cards.map(async (card) => {
        const response = await fetchWithAuth(`/api/cards/${card.id}/messages`);
        if (!response.ok) {
          throw new Error(`Failed to fetch messages for card ${card.id}`);
        }
        const data = await response.json();
        // Filter to only unread messages so clearing (mark-as-read) hides them permanently on this screen
        const unread = (data.messages || []).filter((m) => !m.is_read);
        // Attach card_id so we can mark read reliably
        return unread.map((msg) => ({
          ...msg,
          card_id: card.id,
          card_name: card.name,
        }));
      });

      const messagesArrays = await Promise.all(messagesPromises);
      const flatMessages = messagesArrays.flat();

      // Sort by created_at desc
      return flatMessages.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
    },
    enabled: !!cardsData?.cards?.length,
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async ({ cardId, messageIds }) => {
      const response = await fetchWithAuth(`/api/cards/${cardId}/messages`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message_ids: messageIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark messages as read");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["user-messages"]);
      // NEW: Also invalidate unread count to update badge
      if (user?.id) {
        queryClient.invalidateQueries(["unread-messages", user.id]);
      }
    },
  });

  const handleMarkAsRead = (messageId, cardId) => {
    const idToUse =
      cardId || allMessages?.find((m) => m.id === messageId)?.card_id;
    if (idToUse) {
      markAsReadMutation.mutate({
        cardId: idToUse,
        messageIds: [messageId],
      });
    }
  };

  // NEW: open inbox best-effort (installed app first, then webmail by domain)
  const openInbox = async () => {
    try {
      // Try popular apps
      const candidates = [
        "googlegmail://", // Gmail
        "ms-outlook://", // Outlook
        "readdle-spark://", // Spark
        "ymail://", // Yahoo Mail
      ];
      for (const url of candidates) {
        // eslint-disable-next-line no-await-in-loop
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      }

      // Fallback: webmail based on domain of current user
      const email = user?.email || "";
      const domain = email.split("@")[1] || "";
      const domainLower = domain.toLowerCase();
      let webUrl = null;
      if (domainLower.includes("gmail.com"))
        webUrl = "https://mail.google.com/";
      else if (
        domainLower.includes("outlook.com") ||
        domainLower.includes("live.com") ||
        domainLower.includes("hotmail.com") ||
        domainLower.includes("office")
      )
        webUrl = "https://outlook.live.com/mail/";
      else if (domainLower.includes("yahoo"))
        webUrl = "https://mail.yahoo.com/";
      else if (
        domainLower.includes("icloud.com") ||
        domainLower.includes("me.com") ||
        domainLower.includes("mac.com")
      )
        webUrl = "https://www.icloud.com/mail/";

      if (webUrl) {
        await Linking.openURL(webUrl);
        return;
      }

      // Last resort: open mailto to hint user to open their mail app
      await Linking.openURL("mailto:");
    } catch (e) {
      console.error("openInbox error", e);
      throw e;
    }
  };

  // NEW: clear handler (optimistic remove + mark read)
  const handleClear = (msg) => {
    // Optimistically remove from list
    queryClient.setQueryData(
      ["user-messages", cardsData?.cards?.map((c) => c.id)],
      (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((m) => m.id !== msg.id);
      },
    );

    const cardId = msg.card_id;
    if (cardId) {
      markAsReadMutation.mutate(
        { cardId, messageIds: [msg.id] },
        {
          onError: () => {
            // Revert by invalidating if server fails
            queryClient.invalidateQueries(["user-messages"]);
          },
        },
      );
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
          scrollY,
          rightComponents: [],
          // Hide left profile icon per request
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
            <Ionicons name="lock-closed" size={40} color="#8FAEA2" />
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
            Sign In Required
          </Text>

          <Text
            style={{
              color: "#7F7F7F",
              fontFamily: "Inter_400Regular",
              fontSize: 16,
              textAlign: "center",
              lineHeight: 24,
            }}
          >
            Sign in to view messages about your digital cards
          </Text>
        </View>
      </AppScreen>
    );
  }

  const unreadCount = allMessages?.filter((msg) => !msg.is_read).length || 0;

  // Remove top-right double tick button by providing no right components
  const headerRightComponents = [];

  // NEW: unified refresh that ensures both cards and messages update
  const handleRefresh = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Promise.all([
        refetchCards(),
        queryClient.invalidateQueries(["user-messages"]),
      ]);
    } catch (e) {
      console.error("Refresh error", e);
    }
  };

  return (
    <AppScreen
      backgroundVariant="default"
      headerProps={{
        scrollY,
        rightComponents: headerRightComponents,
        // Hide left profile icon per request
        leftComponent: <View />,
      }}
      scrollable={false}
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
          Messages
        </Text>

        {unreadCount > 0 && (
          <Text
            style={{
              color: "#8FAEA2",
              fontFamily: "Inter_400Regular",
              fontSize: 16,
              marginTop: 8,
            }}
          >
            {unreadCount} unread message{unreadCount === 1 ? "" : "s"}
          </Text>
        )}

        {/* UPDATE: Info note below title with corrected copy */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            backgroundColor: "rgba(143, 174, 162, 0.12)",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginTop: 12,
          }}
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color="#8FAEA2"
            style={{ marginRight: 8, marginTop: 2 }}
          />
          <Text
            style={{
              color: "#CFCFCF",
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              lineHeight: 18,
              flex: 1,
            }}
          >
            {
              // FIXED TYPO: remove the extra 'are'
              "Message previews show up here when someone reaches out to connect for one of your asks. To ensure your communication remains private, messages get sent to your registered email."
            }
          </Text>
        </View>
      </View>

      {/* Messages List */}
      {isLoading || messagesLoading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
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
            Loading messages...
          </Text>
        </View>
      ) : allMessages?.length > 0 ? (
        <FlatList
          data={allMessages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <MessageCard
              message={item}
              onMarkAsRead={handleMarkAsRead}
              onOpenEmail={openInbox}
              onClear={handleClear}
            />
          )}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading || messagesLoading}
              onRefresh={handleRefresh}
              tintColor="#8FAEA2"
            />
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
        />
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
            <Ionicons name="chatbubbles-outline" size={40} color="#8FAEA2" />
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
            No Messages Yet
          </Text>
        </View>
      )}
    </AppScreen>
  );
}
