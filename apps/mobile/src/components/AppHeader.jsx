import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  Text,
  Share,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { useAuth } from "@/utils/auth/useAuth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

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
  // CHANGE: also access `auth` to get the stored JWT for API calls
  const { isAuthenticated, signOut, signIn, auth } = useAuth();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const headerOpacity = scrollY?.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // UPDATE: App logo (left-aligned) per request
  const LOGO_URI =
    "https://ucarecdn.com/aca0985f-601f-48d2-a603-529b0f0cd38f/-/format/auto/";

  // Fetch invite stats
  const { data: inviteStats } = useQuery({
    queryKey: ["invite-stats"],
    queryFn: async () => {
      if (!isAuthenticated || !auth?.jwt) return null;

      const authHeader = { Authorization: `Bearer ${auth.jwt}` };
      const res = await fetch("/api/invite-codes", {
        method: "GET",
        headers: { ...authHeader },
      });

      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated && !!auth?.jwt,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Mutation to generate an invite code
  const createInviteMutation = useMutation({
    mutationFn: async () => {
      // ADD: pass Authorization header with mobile JWT so backend can authenticate
      const authHeader = auth?.jwt
        ? { Authorization: `Bearer ${auth.jwt}` }
        : {};
      const res = await fetch("/api/invite-codes", {
        method: "POST",
        headers: { ...authHeader },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to create invite code");
      }
      return data;
    },
    onSuccess: () => {
      // Refresh invite stats after creating a new invite
      queryClient.invalidateQueries({ queryKey: ["invite-stats"] });
    },
    onError: (e) => {
      console.error(e);
      Alert.alert("Error", e.message || "Could not create invite");
    },
  });

  const handleInvitePress = async () => {
    if (!isAuthenticated) {
      setMenuOpen(false);
      signIn();
      return;
    }
    try {
      const { inviteCode } = await createInviteMutation.mutateAsync();
      const code = inviteCode?.code;
      // REPLACED: Always use clean custom domain for invite link
      const link = "https://mobile.founderjourneys.com/invite";
      const message = `Join me on FounderJrnys.\nInvite code: ${code}\nOpen the app and enter the code on the Invite screen.\n${link}`;
      await Share.share({ title: "You're invited", message });
      queryClient.invalidateQueries({ queryKey: ["my-invite-codes"] });
    } catch (e) {
      // handled in onError above
    } finally {
      setMenuOpen(false);
    }
  };

  const handleSettingsPress = () => {
    setMenuOpen(false);
    router.push("/settings");
  };

  const handleSignOutPress = async () => {
    try {
      await signOut();
      router.replace("/(tabs)/cards");
    } catch (e) {
      Alert.alert("Error", "Failed to sign out. Please try again.");
    } finally {
      setMenuOpen(false);
    }
  };

  const handleSignInPress = () => {
    setMenuOpen(false);
    signIn();
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
        {/* Left side: Logo (now clickable) + optional custom left component */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => setMenuOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Open app menu"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ExpoImage
              source={{ uri: LOGO_URI }}
              style={{ width: 28, height: 28 }}
              contentFit="contain"
              transition={100}
            />
          </TouchableOpacity>
          {/* If a screen still provides a leftComponent, render it after the logo */}
          {leftComponent ? <View>{leftComponent}</View> : null}
        </View>

        {/* Right Side - Action Buttons */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          {rightComponents.map((component, index) => (
            <View key={index}>{component}</View>
          ))}
        </View>
      </View>

      {/* Backdrop overlay for closing menu when clicking outside */}
      {menuOpen && (
        <TouchableOpacity
          onPress={() => setMenuOpen(false)}
          style={{
            position: "absolute",
            top: 0,
            left: -1000, // Extend beyond screen bounds
            right: -1000, // Extend beyond screen bounds
            height: 2000, // Large enough to cover any screen size
            backgroundColor: "transparent",
            zIndex: 1,
          }}
          activeOpacity={1}
        />
      )}

      {/* Dropdown menu under logo */}
      {menuOpen && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 64,
            left: 20,
            width: 220,
            borderRadius: 12,
            backgroundColor: "#111",
            borderWidth: 1,
            borderColor: "#1E1E1E",
            paddingVertical: 6,
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            zIndex: 2,
          }}
        >
          {/* Only show "Invite a founder" menu item if user has invites available */}
          {isAuthenticated && inviteStats && 
           (inviteStats.unlimited || (inviteStats.remainingInvites !== null && inviteStats.remainingInvites > 0)) && (
            <TouchableOpacity
              onPress={handleInvitePress}
              disabled={createInviteMutation.isLoading}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                paddingHorizontal: 12,
                gap: 10,
              }}
            >
              <Ionicons name="person-add-outline" size={18} color="#8FAEA2" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFF", fontSize: 14 }}>
                  Invite a founder
                </Text>
                {inviteStats && (
                  <Text style={{ color: "#7C7C7C", fontSize: 12, marginTop: 1 }}>
                    {inviteStats.unlimited
                      ? "Unlimited invites"
                      : inviteStats.remainingInvites !== null
                        ? `${inviteStats.remainingInvites} invites left`
                        : "Loading..."}
                  </Text>
                )}
              </View>
              {createInviteMutation.isLoading && (
                <View style={{ width: 16, height: 16 }}>
                  <Ionicons name="hourglass-outline" size={16} color="#8FAEA2" />
                </View>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: 1, backgroundColor: "#1E1E1E" }} />

          <TouchableOpacity
            onPress={handleSettingsPress}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 10,
              paddingHorizontal: 12,
              gap: 10,
            }}
          >
            <Ionicons name="settings-outline" size={18} color="#8FAEA2" />
            <Text style={{ color: "#FFF", fontSize: 14 }}>Settings</Text>
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: "#1E1E1E" }} />

          {/* Conditional Sign In/Sign Out button */}
          {isAuthenticated ? (
            <TouchableOpacity
              onPress={handleSignOutPress}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                paddingHorizontal: 12,
                gap: 10,
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#8FAEA2" />
              <Text style={{ color: "#FFF", fontSize: 14 }}>Sign out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSignInPress}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                paddingHorizontal: 12,
                gap: 10,
              }}
            >
              <Ionicons name="log-in-outline" size={18} color="#8FAEA2" />
              <Text style={{ color: "#FFF", fontSize: 14 }}>Sign in</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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

// Common header button component (unchanged)
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
