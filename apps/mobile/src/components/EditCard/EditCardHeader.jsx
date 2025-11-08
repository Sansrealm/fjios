import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export function EditCardHeader({ onBack }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
      }}
    >
      <TouchableOpacity
        onPress={onBack}
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: "rgba(17,17,17,0.8)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="arrow-back" size={20} color="#FFF" />
      </TouchableOpacity>
      <Text
        style={{
          color: "#FFF",
          fontFamily: "Inter_600SemiBold",
          fontSize: 18,
        }}
      >
        Edit Card
      </Text>
      <View style={{ width: 44 }} />
    </View>
  );
}
