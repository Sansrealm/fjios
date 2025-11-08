import React from "react";
import { View, ScrollView, Animated, RefreshControl } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppBackground from "./AppBackground";
import AppHeader from "./AppHeader";

export default function AppScreen({
  children,
  backgroundVariant = "default",
  headerProps = {},
  scrollable = false,
  scrollViewProps = {},
  contentContainerStyle = {},
  statusBarStyle = "light",
}) {
  const insets = useSafeAreaInsets();

  // Determine if header should be shown and adjust padding accordingly
  const headerShown = headerProps && headerProps.show !== false;
  const headerHeight = headerShown ? 80 : 0;

  const content = scrollable ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        {
          paddingTop: insets.top + headerHeight, // Account for header only when shown
          paddingBottom: insets.bottom + 100,
        },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        {
          flex: 1,
          paddingTop: insets.top + headerHeight,
          paddingBottom: insets.bottom,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <AppBackground variant={backgroundVariant}>
      <StatusBar style={statusBarStyle} />
      {headerShown && <AppHeader {...headerProps} />}
      {content}
    </AppBackground>
  );
}
