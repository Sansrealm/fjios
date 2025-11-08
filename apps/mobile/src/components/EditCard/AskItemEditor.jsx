import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useVideoPlayer, VideoView } from "expo-video";

export function AskItemEditor({
  ask,
  onSave,
  onDelete,
  onReplaceVideo,
  uploading,
  isSaving,
  isDeleting,
}) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(ask.title || "");
  const [description, setDescription] = useState(ask.description || "");
  const [videoUrl, setVideoUrl] = useState(ask.video_url || "");

  // FIX: Move hook usage into a child component that only mounts when a URL exists
  const AskVideo = ({ url }) => {
    const player = useVideoPlayer(url, (p) => {
      p.loop = false;
      p.muted = false;
    });
    return (
      <VideoView
        player={player}
        allowsFullscreen={false}
        nativeControls={true}
        style={{ flex: 1 }}
      />
    );
  };

  const handleSaveAsk = () => {
    onSave({ title, description, video_url: videoUrl });
  };

  const handleDeleteAsk = () => {
    Alert.alert("Delete Ask", "Are you sure you want to delete this ask?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: onDelete,
      },
    ]);
  };

  const handleReplaceVideo = async () => {
    const newUrl = await onReplaceVideo();
    if (newUrl) setVideoUrl(newUrl);
  };

  return (
    <View
      style={{
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: "#1F2A27",
        marginBottom: 12,
      }}
    >
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "#E5E5E5",
            fontFamily: "Inter_600SemiBold",
            fontSize: 15,
            flex: 1,
          }}
        >
          {title || "Untitled Ask"}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#8FAEA2"
        />
      </TouchableOpacity>
      {expanded && (
        <View style={{ marginTop: 12 }}>
          {videoUrl ? (
            <View
              style={{
                height: 160,
                borderRadius: 10,
                overflow: "hidden",
                backgroundColor: "#000",
                marginBottom: 12,
              }}
            >
              <AskVideo url={videoUrl} />
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleReplaceVideo}
            disabled={uploading}
            style={{
              backgroundColor: "rgba(143,174,162,0.15)",
              borderWidth: 1,
              borderColor: "#8FAEA2",
              borderRadius: 10,
              paddingVertical: 10,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#8FAEA2" />
            ) : (
              <Text
                style={{
                  color: "#8FAEA2",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                }}
              >
                Replace Video
              </Text>
            )}
          </TouchableOpacity>

          <Text
            style={{
              color: "#8FAEA2",
              fontFamily: "Inter_500Medium",
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ask title"
            placeholderTextColor="#7C7C7C"
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: "#FFF",
              fontFamily: "Inter_400Regular",
              fontSize: 15,
              marginBottom: 10,
            }}
          />

          <Text
            style={{
              color: "#8FAEA2",
              fontFamily: "Inter_500Medium",
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional description"
            placeholderTextColor="#7C7C7C"
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: "#FFF",
              fontFamily: "Inter_400Regular",
              fontSize: 15,
              textAlignVertical: "top",
              marginBottom: 12,
            }}
          />

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={handleSaveAsk}
              disabled={isSaving}
              style={{
                flex: 1,
                backgroundColor: "#8FAEA2",
                borderRadius: 10,
                paddingVertical: 12,
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
                    fontSize: 15,
                  }}
                >
                  Save Ask
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteAsk}
              disabled={isDeleting}
              style={{
                width: 48,
                backgroundColor: "rgba(255,255,255,0.1)",
                borderWidth: 1,
                borderColor: "#8FAEA2",
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#8FAEA2" />
              ) : (
                <Ionicons name="trash" size={18} color="#8FAEA2" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
