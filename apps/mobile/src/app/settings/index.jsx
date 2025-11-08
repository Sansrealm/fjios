import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import AppScreen from "@/components/AppScreen";
import { useRouter } from "expo-router";
import { HeaderButton } from "@/components/AppHeader";
import { useMutation } from "@tanstack/react-query";
import { createAuthenticatedMutationFn } from "@/utils/api";
import { useUser } from "@/utils/auth/useUser";
import { useAuth } from "@/utils/auth/useAuth";

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();

  // local status message for inline confirmation
  const [statusMessage, setStatusMessage] = React.useState(null);

  // Mutation to trigger a password reset email (same as "Forgot Password" flow)
  const changePasswordMutation = useMutation({
    mutationFn: createAuthenticatedMutationFn(
      "/api/auth/forgot-password",
      "POST",
    ),
    onSuccess: () => {
      // Show inline status message per request
      setStatusMessage(
        "An email has been sent to your registered email for this account.",
      );
    },
    onError: (err) => {
      // Keep an alert for errors to ensure the user notices a misconfiguration
      Alert.alert("Error", err?.message || "Could not start password change");
    },
  });

  // Account Deletion mutation
  const deleteAccountMutation = useMutation({
    mutationFn: createAuthenticatedMutationFn(
      "/api/auth/delete-account",
      "DELETE",
    ),
    onSuccess: async () => {
      try {
        Alert.alert("Account deleted", "Your account has been removed.");
      } finally {
        // Clear local auth and exit to sign in screen
        try {
          signOut();
        } catch (_) {}
        router.replace("/signin");
      }
    },
    onError: (err) => {
      Alert.alert(
        "Delete failed",
        err?.message || "We couldn't delete your account. Please try again.",
      );
    },
  });

  const handleChangePassword = () => {
    if (!user?.email) {
      Alert.alert(
        "Sign in required",
        "Please sign in to change your password.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign in", onPress: () => router.push("/signin") },
        ],
      );
      return;
    }
    // Clear any previous status so the banner reflects the latest action
    setStatusMessage(null);
    changePasswordMutation.mutate({ email: user.email });
  };

  // Confirm and delete flow
  const confirmDeleteAccount = () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to delete your account.");
      return;
    }
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteAccountMutation.mutate({}),
        },
      ],
    );
  };

  return (
    <AppScreen
      backgroundVariant="default"
      headerProps={{
        // Move action to the right and use an 'X' icon instead of a back arrow
        rightComponents: [
          <HeaderButton
            key="close"
            iconName="close"
            onPress={() => router.back()}
          />,
        ],
      }}
    >
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <Text
          style={{
            color: "#FFF",
            fontSize: 22,
            fontFamily: "Inter_700Bold",
            marginBottom: 16,
          }}
        >
          Settings
        </Text>
        <Text
          style={{
            color: "#9CA3AF",
            fontSize: 16,
            fontFamily: "Inter_400Regular",
            lineHeight: 22,
            marginBottom: 24,
          }}
        >
          More options coming soon.
        </Text>

        {/* Inline success banner for Change Password */}
        {statusMessage ? (
          <View
            accessibilityLiveRegion="polite"
            style={{
              backgroundColor: "#0B3A2E",
              borderColor: "#145C43",
              borderWidth: 1,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                color: "#D1FAE5",
                fontSize: 14,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              {statusMessage}
            </Text>
          </View>
        ) : null}

        {/* Account section */}
        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: "#9CA3AF",
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              marginBottom: 4,
            }}
          >
            Account
          </Text>

          {/* Change Password action (uses Forgot Password email flow) */}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleChangePassword}
            disabled={changePasswordMutation.isLoading}
            style={{
              backgroundColor: "#111315",
              borderColor: "#2A2F33",
              borderWidth: 1,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {changePasswordMutation.isLoading && (
              <ActivityIndicator color="#8FAEA2" style={{ marginRight: 8 }} />
            )}
            <Text
              style={{
                color: "#E5E7EB",
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              Change Password
            </Text>
          </TouchableOpacity>

          {/* Delete Account action */}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={confirmDeleteAccount}
            disabled={deleteAccountMutation.isLoading}
            style={{
              backgroundColor: "#1A0F0F",
              borderColor: "#7F1D1D",
              borderWidth: 1,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 8,
            }}
          >
            {deleteAccountMutation.isLoading && (
              <ActivityIndicator color="#EF4444" style={{ marginRight: 8 }} />
            )}
            <Text
              style={{
                color: "#FCA5A5",
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legal section */}
        <View style={{ gap: 12, marginTop: 28 }}>
          <Text
            style={{
              color: "#9CA3AF",
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
              marginBottom: 4,
            }}
          >
            Legal
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push("/settings/privacy")}
            style={{
              backgroundColor: "#111315",
              borderColor: "#2A2F33",
              borderWidth: 1,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#E5E7EB",
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              Privacy Policy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push("/settings/terms")}
            style={{
              backgroundColor: "#111315",
              borderColor: "#2A2F33",
              borderWidth: 1,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#E5E7EB",
                fontSize: 16,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              Terms of Use
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppScreen>
  );
}
