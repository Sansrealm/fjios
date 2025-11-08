import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import { useCardCompletion } from "@/hooks/useCardCompletion";
import { useRouter } from "expo-router";

function IncompleteCardView({ onClose, card }) {
  const router = useRouter();

  const handleCreateCard = () => {
    onClose();
    if (card) {
      // User has a card but it's incomplete, navigate to edit
      router.push(`/card/${card.id}/edit`);
    } else {
      // User has no card, navigate to create
      router.push("/create-card");
    }
  };

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
        <Ionicons name="alert-circle" size={40} color="#FFA500" />
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
        Complete Your Card First
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
        To send messages, you need to complete your card with:
        {"\n\n"}
        • Profile video
        {"\n"}
        • Name and description
      </Text>
      <TouchableOpacity
        onPress={handleCreateCard}
        style={{
          backgroundColor: "#8FAEA2",
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 32,
          marginBottom: 16,
          width: "100%",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "#000",
            fontFamily: "Inter_600SemiBold",
            fontSize: 16,
          }}
        >
          {card ? "Edit Your Card" : "Create Your Card"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onClose}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 32,
        }}
      >
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
    </View>
  );
}

function AuthenticatedMessageView({
  onClose,
  asks,
  onSendMessage,
  loading,
  preselectedAsk,
}) {
  // Initialize with preselected ask when provided
  const [selectedAsk, setSelectedAsk] = useState(preselectedAsk || null);
  const [message, setMessage] = useState("");
  const { isComplete, card, isLoading: isLoadingCard } = useCardCompletion();

  useEffect(() => {
    if (preselectedAsk) {
      setSelectedAsk(preselectedAsk);
    }
  }, [preselectedAsk]);

  const handleSend = () => {
    if (!message.trim()) {
      Alert.alert("Error", "Please enter a message.");
      return;
    }

    // Check card completion before sending
    if (!isComplete) {
      Alert.alert(
        "Complete Your Card First",
        "To send messages, you need to complete your card with a profile video, name, and description.",
        [
          {
            text: "Edit Card",
            onPress: () => {
              onClose();
              // Navigation will be handled by parent component
            },
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]
      );
      return;
    }

    onSendMessage({
      ask_id: selectedAsk?.id || null,
      message: message.trim(),
    });

    setMessage("");
    // keep selectedAsk so users can send follow-ups if desired
  };

  // Show loading state while checking card completion
  if (isLoadingCard) {
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

  // Show incomplete card view if card is not complete
  if (!isComplete) {
    return <IncompleteCardView onClose={onClose} card={card} />;
  }

  const subjectText = selectedAsk?.title || "Ask";
  const placeholder = `Message about \"${subjectText}\"...`;

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
          {/* Ask Selection (only when no preselected ask); removed header text and General Message option */}
          {!preselectedAsk && asks && asks.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
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
              </View>
            </View>
          ) : null}

          {/* Subject Preview */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: "#8FAEA2",
                fontFamily: "Inter_500Medium",
                fontSize: 14,
                marginBottom: 6,
              }}
            >
              Subject
            </Text>
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: "#2A2A2A",
              }}
            >
              <Text
                style={{
                  color: "#FFF",
                  fontFamily: "Inter_500Medium",
                  fontSize: 15,
                }}
                numberOfLines={1}
              >
                {subjectText}
              </Text>
            </View>
          </View>

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
              placeholder={placeholder}
              placeholderTextColor="#7C7C7C"
              multiline
              numberOfLines={6}
              selectionColor="#8FAEA2"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: "#FFF",
                fontFamily: "Inter_400Regular",
                fontSize: 16,
                textAlignVertical: "top",
                minHeight: 120,
                borderWidth: 1,
                borderColor: "#2A2A2A",
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
  preselectedAsk,
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
          preselectedAsk={preselectedAsk}
        />
      ) : (
        <UnauthenticatedMessageView onClose={onClose} />
      )}
    </Modal>
  );
}
