import React from "react";
import { View, TouchableOpacity, Share, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

export default function CardHeader({
  card,
  savedStatus,
  onSave,
  isAuthenticated,
  isOwner,
  onEdit,
  // NEW: allow hiding edit when back face is visible
  showEdit = true,
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleShare = async () => {
    try {
      const host = process.env.EXPO_PUBLIC_HOST || "https://yourapp.com";
      const path = card?.slug ? `/card/${card.slug}` : `/card/${card?.id}`;
      const url = `${host}${path}`;

      await Share.share({
        message: `Check out ${card?.name}'s digital card: ${url}`,
        url,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        position: "absolute",
        top: insets.top,
        left: 0,
        right: 0,
        zIndex: 10,
      }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(10px)",
        }}
      >
        <Ionicons name="arrow-back" size={20} color="#FFF" />
      </TouchableOpacity>

      <View style={{ flexDirection: "row", gap: 12 }}>
        {isOwner && showEdit && (
          <TouchableOpacity
            onPress={() => {
              Haptics.lightAsync();
              onEdit?.();
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)",
            }}
          >
            <Ionicons name="create-outline" size={20} color="#8FAEA2" />
          </TouchableOpacity>
        )}

        {isAuthenticated && (
          <TouchableOpacity
            onPress={onSave}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(10px)",
            }}
          >
            <Ionicons
              name={savedStatus?.is_saved ? "bookmark" : "bookmark-outline"}
              size={20}
              color={savedStatus?.is_saved ? "#8FAEA2" : "#FFF"}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => {
            Haptics.lightAsync();
            handleShare();
          }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(10px)",
          }}
        >
          <Ionicons name="share-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
