import React from "react";
import { View, ActivityIndicator } from "react-native";

export default function LoadingView() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" color="#8FAEA2" />
    </View>
  );
}