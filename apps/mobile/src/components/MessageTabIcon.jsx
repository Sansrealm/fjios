import React from "react";
import { View, Text } from "react-native";
import { MotiView } from "moti";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import useUser from "@/utils/auth/useUser";

export default function MessageTabIcon({ color, focused }) {
  const { data: user } = useUser();

  // Query for unread message count
  const { data: unreadData } = useQuery({
    queryKey: ["unread-messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return { unreadCount: 0 };
      const response = await fetch(
        `/api/messages/unread-count?userId=${user.id}`,
      );
      if (!response.ok) return { unreadCount: 0 };
      return response.json();
    },
    enabled: !!user?.id,
    // CHANGE: reduce background activity — no interval polling; rely on focus to refetch
    refetchInterval: false,
    refetchOnWindowFocus: true, // React Query refetches when app returns to foreground (RN)
    staleTime: 120000, // 2 minutes to avoid excessive network usage
  });

  const unreadCount = unreadData?.unreadCount || 0;
  const hasUnread = unreadCount > 0;

  return (
    <View style={{ position: "relative" }}>
      {/* Glow effect when there are unread messages */}
      {hasUnread && (
        <MotiView
          from={{ shadowOpacity: 0 }}
          animate={{ shadowOpacity: 0.4 }}
          transition={{
            type: "timing",
            duration: 1000,
            loop: true,
            repeatReverse: true,
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            shadowColor: "#8FAEA2",
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 8,
          }}
        >
          <Ionicons name="chatbubble-outline" size={24} color="transparent" />
        </MotiView>
      )}

      {/* Main icon */}
      <Ionicons name="chatbubble-outline" size={24} color={color} />

      {/* Badge */}
      {hasUnread && (
        <MotiView
          from={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            damping: 15,
            stiffness: 200,
          }}
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            backgroundColor: "#8FAEA2",
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
            borderWidth: 2,
            borderColor: "#000",
          }}
        >
          <Text
            style={{
              color: "#000",
              fontSize: 10,
              fontWeight: "600",
              lineHeight: 12,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </MotiView>
      )}
    </View>
  );
}
