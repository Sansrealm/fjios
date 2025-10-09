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

  const content = scrollable ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        {
          paddingTop: insets.top + 80, // Account for fixed header
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
          paddingTop: insets.top + 80,
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
      {headerProps.show !== false && <AppHeader {...headerProps} />}
      {content}
    </AppBackground>
  );
}