import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import AppScreen from "@/components/AppScreen";
import { HeaderButton } from "@/components/AppHeader";
import useAppFonts from "@/hooks/useAppFonts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function MessageCard({ message, onMarkAsRead }) {
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

  return (
    <TouchableOpacity
      onPress={() => {
        if (!message.is_read) {
          onMarkAsRead(message.id);
        }
      }}
      style={{
        backgroundColor: message.is_read ? "rgba(17, 17, 17, 0.6)" : "rgba(17, 17, 17, 0.9)",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 16,
        borderWidth: message.is_read ? 0 : 1,
        borderColor: "#8FAEA2",
      }}
    >
      <LinearGradient
        colors={message.is_read ? ["#0F0F0F", "#0A0A0A"] : ["#1A1A1A", "#121212"]}
        style={{ padding: 20 }}
      >
        {/* Header */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}>
          <View style={{ flex: 1 }}>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 4,
            }}>
              {message.sender_name && (
                <Text style={{
                  color: message.is_read ? "#9A9A9A" : "#FFF",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  marginRight: 8,
                }}>
                  {message.sender_name}
                </Text>
              )}
              {!message.is_read && (
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#8FAEA2",
                }}/>
              )}
            </View>
            
            {message.sender_email && (
              <Text style={{
                color: "#7C7C7C",
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                marginBottom: 4,
              }}>
                {message.sender_email}
              </Text>
            )}
            
            {message.ask_title && (
              <View style={{
                backgroundColor: "rgba(143, 174, 162, 0.2)",
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                alignSelf: "flex-start",
                marginBottom: 8,
              }}>
                <Text style={{
                  color: "#8FAEA2",
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                }}>
                  About: {message.ask_title}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={{
            color: "#7C7C7C",
            fontFamily: "Inter_400Regular",
            fontSize: 12,
          }}>
            {formatDate(message.created_at)}
          </Text>
        </View>

        {/* Message Content */}
        <Text style={{
          color: message.is_read ? "#CFCFCF" : "#FFF",
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          lineHeight: 20,
        }}>
          {message.message}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const [scrollY] = useState(new Animated.Value(0));
  const fontsLoaded = useAppFonts();
  const { isReady, isAuthenticated } = useAuth();
  const { data: user } = useUser();
  const queryClient = useQueryClient();

  // Fetch user's cards to get messages
  const { data: cardsData, isLoading, refetch } = useQuery({
    queryKey: ['user-cards'],
    queryFn: async () => {
      const response = await fetch(`/api/cards?userId=${user?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cards');
      }
      return response.json();
    },
    enabled: isReady && isAuthenticated && !!user?.id,
  });

  // Fetch all messages for user's cards
  const { data: allMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ['user-messages', cardsData?.cards],
    queryFn: async () => {
      if (!cardsData?.cards?.length) return [];
      
      const messagesPromises = cardsData.cards.map(async (card) => {
        const response = await fetch(`/api/cards/${card.id}/messages`);
        if (!response.ok) {
          throw new Error(`Failed to fetch messages for card ${card.id}`);
        }
        const data = await response.json();
        return data.messages.map(msg => ({ ...msg, card_name: card.name }));
      });
      
      const messagesArrays = await Promise.all(messagesPromises);
      const flatMessages = messagesArrays.flat();
      
      // Sort by created_at desc
      return flatMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    enabled: !!cardsData?.cards?.length,
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async ({ cardId, messageIds }) => {
      const response = await fetch(`/api/cards/${cardId}/messages`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message_ids: messageIds }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark messages as read');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-messages']);
    },
  });

  const handleMarkAsRead = (messageId) => {
    // Find the card that contains this message
    const message = allMessages?.find(msg => msg.id === messageId);
    if (message) {
      const card = cardsData?.cards?.find(c => c.name === message.card_name);
      if (card) {
        markAsReadMutation.mutate({
          cardId: card.id,
          messageIds: [messageId],
        });
      }
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
        }}
      >
        <View style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 40,
        }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "rgba(143, 174, 162, 0.15)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}>
            <Ionicons name="lock-closed" size={40} color="#8FAEA2" />
          </View>
          
          <Text style={{
            color: "#FFF",
            fontFamily: "Inter_600SemiBold",
            fontSize: 24,
            textAlign: "center",
            marginBottom: 12,
          }}>
            Sign In Required
          </Text>
          
          <Text style={{
            color: "#7F7F7F",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            textAlign: "center",
            lineHeight: 24,
          }}>
            Sign in to view messages about your digital cards
          </Text>
        </View>
      </AppScreen>
    );
  }

  const unreadCount = allMessages?.filter(msg => !msg.is_read).length || 0;

  const headerRightComponents = [
    <HeaderButton
      key="mark-all-read"
      iconName="checkmark-done"
      onPress={() => {
        Haptics.lightAsync();
        // Mark all messages as read
        if (cardsData?.cards && allMessages?.length > 0) {
          cardsData.cards.forEach(card => {
            const cardMessages = allMessages.filter(msg => 
              msg.card_name === card.name && !msg.is_read
            );
            if (cardMessages.length > 0) {
              markAsReadMutation.mutate({
                cardId: card.id,
                messageIds: cardMessages.map(msg => msg.id),
              });
            }
          });
        }
      }}
      backgroundColor="rgba(143, 174, 162, 0.2)"
      borderColor="#8FAEA2"
      iconColor="#8FAEA2"
      showNotificationDot={unreadCount > 0}
    />,
  ];

  return (
    <AppScreen
      backgroundVariant="default"
      headerProps={{
        scrollY,
        rightComponents: headerRightComponents,
      }}
      scrollable={false}
      contentContainerStyle={{
        paddingHorizontal: 20,
      }}
    >
      {/* Title */}
      <View style={{ marginBottom: 24, marginTop: 24 }}>
        <Text style={{
          color: "#FFF",
          fontFamily: "Inter_700Bold",
          fontSize: 36,
          lineHeight: 36 * 0.9,
          letterSpacing: -0.5,
        }}>
          Messages
        </Text>
        
        {unreadCount > 0 && (
          <Text style={{
            color: "#8FAEA2",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            marginTop: 8,
          }}>
            {unreadCount} unread message{unreadCount === 1 ? '' : 's'}
          </Text>
        )}
      </View>

      {/* Messages List */}
      {isLoading || messagesLoading ? (
        <View style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}>
          <ActivityIndicator size="large" color="#8FAEA2" />
          <Text style={{
            color: "#7C7C7C",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            marginTop: 16,
          }}>
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
            />
          )}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading || messagesLoading}
              onRefresh={refetch}
              tintColor="#8FAEA2"
            />
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        />
      ) : (
        <View style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 60,
        }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "rgba(143, 174, 162, 0.15)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}>
            <Ionicons name="chatbubbles-outline" size={40} color="#8FAEA2" />
          </View>
          
          <Text style={{
            color: "#FFF",
            fontFamily: "Inter_600SemiBold",
            fontSize: 24,
            textAlign: "center",
            marginBottom: 12,
          }}>
            No Messages Yet
          </Text>
          
          <Text style={{
            color: "#7F7F7F",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            textAlign: "center",
            lineHeight: 24,
            paddingHorizontal: 40,
          }}>
            Messages about your cards will appear here
          </Text>
        </View>
      )}
    </AppScreen>
  );
}