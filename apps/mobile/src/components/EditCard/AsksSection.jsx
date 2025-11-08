import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { MotiView } from "moti";
import { AskItemEditor } from "./AskItemEditor";

export function AsksSection({
  asks,
  onRecordAsk,
  addingAsk,
  onSaveAsk,
  onDeleteAsk,
  onReplaceVideo,
  uploading,
  updateAskMutation,
  deleteAskMutation,
}) {
  return (
    <View style={{ marginTop: 8, marginBottom: 24 }}>
      <Text
        style={{
          color: "#FFF",
          fontFamily: "Inter_600SemiBold",
          fontSize: 18,
          marginBottom: 12,
        }}
      >
        Asks
      </Text>

      {/* Existing asks list */}
      {asks?.length > 0 ? (
        <View style={{ gap: 8, marginBottom: 12 }}>
          {asks.map((ask, index) => (
            <MotiView
              key={ask.id}
              from={{
                scale: 0.8,
                opacity: 0,
                shadowOpacity: 0,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                shadowOpacity: 0,
              }}
              exit={{
                scale: 0.8,
                opacity: 0,
              }}
              transition={{
                type: "spring",
                damping: 15,
                stiffness: 200,
                delay: index * 100, // Stagger animations
              }}
              // Add glow effect for recently added asks (first item if just added)
              style={{
                shadowColor:
                  index === 0 && asks.length === 1 ? "#8FAEA2" : "transparent",
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: index === 0 && asks.length === 1 ? 10 : 0,
              }}
            >
              <AskItemEditor
                ask={ask}
                onSave={(payload) => onSaveAsk(ask.id, payload)}
                onDelete={() => onDeleteAsk(ask.id)}
                onReplaceVideo={onReplaceVideo}
                uploading={uploading}
                isSaving={updateAskMutation.isPending}
                isDeleting={deleteAskMutation.isPending}
              />
            </MotiView>
          ))}
        </View>
      ) : (
        <Text
          style={{
            color: "#7C7C7C",
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          No asks yet. Add one below.
        </Text>
      )}

      {/* Add Ask button */}
      <TouchableOpacity
        onPress={onRecordAsk}
        disabled={addingAsk}
        style={{
          backgroundColor: "#8FAEA2",
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: "center",
          opacity: addingAsk ? 0.7 : 1,
        }}
      >
        {addingAsk ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text
            style={{
              color: "#000",
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
            }}
          >
            Record Ask (30s)
          </Text>
        )}
      </TouchableOpacity>
      <Text
        style={{
          color: "#7C7C7C",
          fontFamily: "Inter_400Regular",
          fontSize: 12,
          marginTop: 6,
        }}
      >
        We'll auto‑generate a short title from the recording.
      </Text>
    </View>
  );
}
