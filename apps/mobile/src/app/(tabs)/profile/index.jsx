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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import AppScreen from "@/components/AppScreen";
import { HeaderButton } from "@/components/AppHeader";
import useAppFonts from "@/hooks/useAppFonts";
import { useQuery } from "@tanstack/react-query";

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

  // Fetch user's cards
  const {
    data: cardsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["user-cards"],
    queryFn: async () => {
      const response = await fetch(`/api/cards?userId=${user?.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch cards");
      }
      return response.json();
    },
    enabled: isReady && isAuthenticated && !!user?.id,
  });

  const handleSignOut = async () => {
    try {
      console.log("🚪 Starting sign out process...");
      await signOut();
      console.log("✅ Sign out successful, navigating to home...");

      // Navigate to home screen after sign out
      router.replace("/(tabs)/cards");
    } catch (error) {
      console.error("💥 Sign out error:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
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
            onPress={() => router.push("/invite/")}
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

  const headerRightComponents = [
    <HeaderButton
      key="settings"
      iconName="settings-outline"
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      backgroundColor="rgba(143, 174, 162, 0.2)"
      borderColor="#8FAEA2"
      iconColor="#8FAEA2"
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
      {/* Profile Header */}
      <View style={{ marginBottom: 32, marginTop: 24 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
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
                fontSize: 24,
              }}
            >
              {user?.name?.charAt(0).toUpperCase() ||
                user?.email?.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#FFF",
                fontFamily: "Inter_700Bold",
                fontSize: 24,
                marginBottom: 4,
              }}
            >
              {user?.name || "User"}
            </Text>

            <Text
              style={{
                color: "#8FAEA2",
                fontFamily: "Inter_400Regular",
                fontSize: 16,
              }}
            >
              {user?.email}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "rgba(17, 17, 17, 0.8)",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                color: "#FFF",
                fontFamily: "Inter_700Bold",
                fontSize: 24,
                marginBottom: 4,
              }}
            >
              {cardsData?.cards?.length || 0}
            </Text>
            <Text
              style={{
                color: "#7C7C7C",
                fontFamily: "Inter_400Regular",
                fontSize: 14,
              }}
            >
              Cards
            </Text>
          </View>

          <View
            style={{
              width: 1,
              backgroundColor: "#333",
              marginHorizontal: 20,
            }}
          />

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                color: "#FFF",
                fontFamily: "Inter_700Bold",
                fontSize: 24,
                marginBottom: 4,
              }}
            >
              {cardsData?.cards?.reduce(
                (total, card) => total + (card.asks?.length || 0),
                0,
              ) || 0}
            </Text>
            <Text
              style={{
                color: "#7C7C7C",
                fontFamily: "Inter_400Regular",
                fontSize: 14,
              }}
            >
              Asks
            </Text>
          </View>
        </View>
      </View>

      {/* My Cards Section */}
      <View style={{ marginBottom: 32 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: "#FFF",
              fontFamily: "Inter_600SemiBold",
              fontSize: 20,
            }}
          >
            My Cards
          </Text>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/create-card");
            }}
            style={{
              backgroundColor: "#8FAEA2",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="add" size={16} color="#000" />
            <Text
              style={{
                color: "#000",
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                marginLeft: 4,
              }}
            >
              New Card
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View
            style={{
              alignItems: "center",
              paddingVertical: 40,
            }}
          >
            <ActivityIndicator size="large" color="#8FAEA2" />
          </View>
        ) : cardsData?.cards?.length > 0 ? (
          cardsData.cards.map((card) => (
            <UserCardItem
              key={card.id}
              card={card}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/card/${card.id}`);
              }}
            />
          ))
        ) : (
          <View
            style={{
              backgroundColor: "rgba(17, 17, 17, 0.8)",
              borderRadius: 16,
              padding: 24,
              alignItems: "center",
            }}
          >
            <Ionicons name="card-outline" size={40} color="#7C7C7C" />
            <Text
              style={{
                color: "#7C7C7C",
                fontFamily: "Inter_500Medium",
                fontSize: 16,
                marginTop: 12,
                textAlign: "center",
              }}
            >
              No cards yet
            </Text>
          </View>
        )}
      </View>

      {/* Account Actions */}
      <View style={{ marginBottom: 32 }}>
        <Text
          style={{
            color: "#FFF",
            fontFamily: "Inter_600SemiBold",
            fontSize: 20,
            marginBottom: 16,
          }}
        >
          Account
        </Text>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleSignOut();
          }}
          style={{
            backgroundColor: "rgba(255, 107, 107, 0.1)",
            borderWidth: 1,
            borderColor: "#FF6B6B",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
          <Text
            style={{
              color: "#FF6B6B",
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              marginLeft: 8,
            }}
          >
            Sign Out
          </Text>
        </TouchableOpacity>

        {/* Temporary Force Logout Button */}
        <TouchableOpacity
          onPress={async () => {
            console.log("💥 Force logout pressed!");
            try {
              const { useAuthStore } = require("@/utils/auth/store");
              const SecureStore = require("expo-secure-store");

              // Clear everything
              await SecureStore.deleteItemAsync(
                `${process.env.EXPO_PUBLIC_PROJECT_GROUP_ID}-jwt`,
              );
              useAuthStore.setState({ auth: null, isReady: true });

              console.log("✅ Force logout completed");
              Alert.alert("Success", "Logged out successfully!");
            } catch (error) {
              console.error("💥 Force logout error:", error);
              Alert.alert("Error", "Failed to logout");
            }
          }}
          style={{
            backgroundColor: "rgba(255, 165, 0, 0.1)",
            borderWidth: 1,
            borderColor: "#FFA500",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="warning-outline" size={20} color="#FFA500" />
          <Text
            style={{
              color: "#FFA500",
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              marginLeft: 8,
            }}
          >
            Force Logout (Debug)
          </Text>
        </TouchableOpacity>
      </View>
    </AppScreen>
  );
}
