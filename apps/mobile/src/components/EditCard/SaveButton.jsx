import React from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";

export function SaveButton({ onSave, isSaving }) {
  return (
    <TouchableOpacity
      onPress={onSave}
      disabled={isSaving}
      style={{
        backgroundColor: "#8FAEA2",
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        opacity: isSaving ? 0.7 : 1,
      }}
    >
      {isSaving ? (
        <ActivityIndicator size="small" color="#000" />
      ) : (
        <Text
          style={{
            color: "#000",
            fontFamily: "Inter_600SemiBold",
            fontSize: 16,
          }}
        >
          Save Changes
        </Text>
      )}
    </TouchableOpacity>
  );
}
