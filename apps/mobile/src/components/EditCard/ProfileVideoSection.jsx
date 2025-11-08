import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export function ProfileVideoSection({
  profileVideoUrl,
  onUpload,
  uploading,
  updatingProfileVideo,
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          color: "#FFF",
          fontFamily: "Inter_600SemiBold",
          fontSize: 18,
          marginBottom: 12,
        }}
      >
        Profile Video
      </Text>
      <TouchableOpacity
        onPress={onUpload}
        disabled={updatingProfileVideo || uploading}
        style={{
          backgroundColor: "rgba(255,255,255,0.08)",
          borderWidth: 1,
          borderColor: "#8FAEA2",
          borderStyle: profileVideoUrl ? "solid" : "dashed",
          borderRadius: 12,
          padding: 16,
          alignItems: "center",
          opacity: updatingProfileVideo || uploading ? 0.6 : 1,
        }}
      >
        {updatingProfileVideo || uploading ? (
          <ActivityIndicator color="#8FAEA2" />
        ) : (
          <>
            <Ionicons
              name={profileVideoUrl ? "checkmark-circle" : "videocam"}
              size={28}
              color="#8FAEA2"
            />
            <Text
              style={{
                color: "#8FAEA2",
                fontFamily: "Inter_500Medium",
                fontSize: 15,
                marginTop: 8,
              }}
            >
              {profileVideoUrl
                ? "Replace profile video"
                : "Record 30s profile video"}
            </Text>
          </>
        )}
      </TouchableOpacity>
      {profileVideoUrl ? (
        <Text
          style={{
            color: "#7C7C7C",
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            marginTop: 6,
          }}
        >
          Video set. Tap Save Changes below to apply.
        </Text>
      ) : (
        <Text
          style={{
            color: "#7C7C7C",
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            marginTop: 6,
          }}
        >
          Tip: keep it short and clear (max 30s).
        </Text>
      )}
    </View>
  );
}
