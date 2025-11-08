import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React from "react";
import { View } from "react-native";
import MessageTabIcon from "@/components/MessageTabIcon";

export default function TabLayout() {
  return (
    <Tabs
      // ADD: ensure scenes under tabs use app bg to avoid white flashes
      sceneContainerStyle={{ backgroundColor: "#000" }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#000",
          borderTopWidth: 0,
          paddingBottom: 10,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: "#000" }} />
        ),
        tabBarActiveBackgroundColor: "transparent",
        tabBarInactiveBackgroundColor: "transparent",
        tabBarActiveTintColor: "#8FAEA2",
        tabBarInactiveTintColor: "#6B6B6B",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="cards/index"
        options={{
          title: "Cards",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="id-card-o" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, focused }) => (
            <MessageTabIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
