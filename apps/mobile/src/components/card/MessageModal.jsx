import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";

function AuthenticatedMessageView({ onClose, asks, onSendMessage, loading }) {
  const [selectedAsk, setSelectedAsk] = useState(null);
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) {
      Alert.alert("Error", "Please enter a message.");
      return;
    }

    onSendMessage({
      ask_id: selectedAsk?.id || null,
      message: message.trim(),
    });

    setMessage("");
    setSelectedAsk(null);
  };

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#1E1E1E",
          }}
        >
          <TouchableOpacity onPress={onClose}>
            <Text
              style={{
                color: "#8FAEA2",
                fontFamily: "Inter_500Medium",
                fontSize: 16,
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              color: "#FFF",
              fontFamily: "Inter_600SemiBold",
              fontSize: 18,
            }}
          >
            Send Message
          </Text>
          <TouchableOpacity onPress={handleSend} disabled={loading}>
            <Text
              style={{
                color: "#8FAEA2",
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                opacity: loading ? 0.5 : 1,
              }}
            >
              Send
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, padding: 20 }}>
          {/* Ask Selection */}
          {asks && asks.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: "#FFF",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  marginBottom: 12,
                }}
              >
                What would you like to discuss?
              </Text>
              <View style={{ gap: 8 }}>
                {asks.map((ask) => (
                  <TouchableOpacity
                    key={ask.id}
                    onPress={() => setSelectedAsk(ask)}
                    style={{
                      backgroundColor:
                        selectedAsk?.id === ask.id
                          ? "#8FAEA2"
                          : "rgba(255, 255, 255, 0.1)",
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor:
                        selectedAsk?.id === ask.id ? "#8FAEA2" : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: selectedAsk?.id === ask.id ? "#000" : "#FFF",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                        marginBottom: 4,
                      }}
                    >
                      {ask.title}
                    </Text>
                    {ask.description && (
                      <Text
                        style={{
                          color:
                            selectedAsk?.id === ask.id ? "#000" : "#CFCFCF",
                          fontFamily: "Inter_400Regular",
                          fontSize: 14,
                        }}
                      >
                        {ask.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setSelectedAsk(null)}
                  style={{
                    backgroundColor:
                      selectedAsk === null
                        ? "#8FAEA2"
                        : "rgba(255, 255, 255, 0.1)",
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor:
                      selectedAsk === null ? "#8FAEA2" : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: selectedAsk === null ? "#000" : "#FFF",
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 16,
                    }}
                  >
                    General Message
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Message */}
          <View>
            <Text
              style={{
                color: "#8FAEA2",
                fontFamily: "Inter_500Medium",
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              Message
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Type your message here..."
              placeholderTextColor="#7C7C7C"
              multiline
              numberOfLines={6}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: "#FFF",
                fontFamily: "Inter_400Regular",
                fontSize: 16,
                textAlignVertical: "top",
                minHeight: 120,
              }}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}

function UnauthenticatedMessageView({ onClose }) {
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
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: "rgba(143, 174, 162, 0.2)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Ionicons name="lock-closed" size={40} color="#8FAEA2" />
      </View>
      <Text
        style={{
          color: "#FFF",
          fontFamily: "Inter_700Bold",
          fontSize: 24,
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        Join to Message
      </Text>
      <Text
        style={{
          color: "#CFCFCF",
          fontFamily: "Inter_400Regular",
          fontSize: 16,
          textAlign: "center",
          lineHeight: 24,
          marginBottom: 32,
        }}
      >
        Get an invite code to join the community and connect with founders
      </Text>
      <TouchableOpacity
        onPress={onClose}
        style={{
          backgroundColor: "#8FAEA2",
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 32,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: "#000",
            fontFamily: "Inter_600SemiBold",
            fontSize: 16,
          }}
        >
          Close
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MessageModal({
  visible,
  onClose,
  asks,
  onSendMessage,
  loading,
  isAuthenticated,
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {isAuthenticated ? (
        <AuthenticatedMessageView
          onClose={onClose}
          asks={asks}
          onSendMessage={onSendMessage}
          loading={loading}
        />
      ) : (
        <UnauthenticatedMessageView onClose={onClose} />
      )}
    </Modal>
  );
}