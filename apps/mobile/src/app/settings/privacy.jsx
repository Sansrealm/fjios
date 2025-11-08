import React, { useState, useRef } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Linking,
} from "react-native";
import AppScreen from "@/components/AppScreen";
import { useRouter } from "expo-router";
import { HeaderButton } from "@/components/AppHeader";
import { WebView } from "react-native-webview";

export default function PrivacyScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const webRef = useRef(null);
  const targetUrl = "https://www.founderjourneys.com/privacy"; // use explicit www domain

  return (
    <AppScreen
      backgroundVariant="default"
      headerProps={{
        leftComponent: (
          <HeaderButton iconName="arrow-back" onPress={() => router.back()} />
        ),
      }}
      scrollable={false}
      contentContainerStyle={{ paddingHorizontal: 0 }}
    >
      <View style={{ flex: 1 }}>
        {loading && !error ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            <ActivityIndicator size="large" color="#8FAEA2" />
          </View>
        ) : null}
        {error ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 24,
            }}
          >
            <Text
              style={{
                color: "#E5E7EB",
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                textAlign: "center",
              }}
            >
              We couldn't load the Privacy Policy.
            </Text>
            <Text
              style={{
                color: "#9CA3AF",
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Please check your connection and try again.
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  setError(null);
                  setLoading(true);
                  try {
                    webRef.current?.reload();
                  } catch (e) {}
                }}
                style={{
                  backgroundColor: "#111315",
                  borderColor: "#2A2F33",
                  borderWidth: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color: "#E5E7EB",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  }}
                >
                  Reload
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => Linking.openURL(targetUrl)}
                style={{
                  backgroundColor: "#111315",
                  borderColor: "#2A2F33",
                  borderWidth: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    color: "#E5E7EB",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  }}
                >
                  Open in browser
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <WebView
            ref={webRef}
            source={{ uri: targetUrl }}
            originWhitelist={["*"]}
            mixedContentMode="always"
            setSupportMultipleWindows={false}
            sharedCookiesEnabled
            allowsBackForwardNavigationGestures
            onLoadStart={() => {
              setLoading(true);
              setError(null);
            }}
            onLoadEnd={() => setLoading(false)}
            onHttpError={(e) => {
              setLoading(false);
              setError(
                e?.nativeEvent?.description ||
                  `HTTP ${e?.nativeEvent?.statusCode || "error"}`,
              );
            }}
            onError={(syntheticEvent) => {
              setLoading(false);
              setError(
                syntheticEvent?.nativeEvent?.description || "Failed to load",
              );
            }}
            startInLoadingState={false}
            style={{ flex: 1, backgroundColor: "#FFFFFF" }}
          />
        )}
      </View>
    </AppScreen>
  );
}
