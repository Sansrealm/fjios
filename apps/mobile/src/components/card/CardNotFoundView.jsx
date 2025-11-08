import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function CardNotFoundView() {
  const router = useRouter();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
      }}
    >
      <Text
        style={{
          color: "#FFF",
          fontFamily: "Inter_600SemiBold",
          fontSize: 24,
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        Card Not Found
      </Text>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          backgroundColor: "#8FAEA2",
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 8,
          marginTop: 16,
        }}
      >
        <Text
          style={{
            color: "#000",
            fontFamily: "Inter_600SemiBold",
            fontSize: 16,
          }}
        >
          Go Back
        </Text>
      </TouchableOpacity>
    </View>
  );
}