import React from "react";
import { View, TouchableOpacity, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/utils/auth/useAuth";

export default function AppHeader({
  backgroundColor = "#000",
  scrollY,
  leftComponent,
  rightComponents = [],
  showBorder = true,
  borderColor = "#333",
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, signIn } = useAuth();

  const headerOpacity = scrollY?.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const handleAvatarPress = () => {
    Haptics.lightAsync();
    if (isAuthenticated) {
      router.push("/(tabs)/profile");
    } else {
      signIn();
    }
  };

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor,
        paddingTop: insets.top,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 20,
        }}
      >
        {/* Left Side - Avatar or Custom Component */}
        {leftComponent || (
          <TouchableOpacity
            onPress={handleAvatarPress}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isAuthenticated ? "#8FAEA2" : "#333",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: isAuthenticated ? 0 : 1,
              borderColor: "#555",
            }}
          >
            <Ionicons
              name="person"
              size={20}
              color={isAuthenticated ? "#000" : "#FFF"}
            />
          </TouchableOpacity>
        )}

        {/* Right Side - Action Buttons */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {rightComponents.map((component, index) => (
            <View key={index}>{component}</View>
          ))}
        </View>
      </View>

      {/* Bottom Border (appears on scroll) */}
      {showBorder && scrollY && (
        <Animated.View
          style={{
            height: 1,
            backgroundColor: borderColor,
            opacity: headerOpacity,
          }}
        />
      )}
    </View>
  );
}

// Common header button component
export function HeaderButton({
  iconName,
  onPress,
  backgroundColor = "#111",
  borderColor = "#1E1E1E",
  iconColor = "rgba(255,255,255,0.7)",
  showNotificationDot = false,
  notificationColor = "#D9FF1D",
}) {
  const handlePress = () => {
    Haptics.lightAsync();
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor,
        borderWidth: borderColor ? 1 : 0,
        borderColor,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <Ionicons name={iconName} size={20} color={iconColor} />
      {showNotificationDot && (
        <View
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: notificationColor,
          }}
        />
      )}
    </TouchableOpacity>
  );
}
