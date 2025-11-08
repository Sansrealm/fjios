import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import * as Haptics from "expo-haptics";
import { Alert } from "react-native";
// ADD: use unified authenticated fetch helper to ensure consistent headers and base handling
import { fetchWithAuth } from "@/utils/api";
import { useCardCompletion } from "./useCardCompletion";

export function useCard(id) {
  const { isAuthenticated } = useAuth();
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const { isComplete, card: userCard } = useCardCompletion();

  const { data: cardData, isLoading } = useQuery({
    queryKey: ["card", id],
    queryFn: async () => {
      const response = await fetch(`/api/cards/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch card");
      }
      return response.json();
    },
    enabled: !!id,
  });

  const { data: savedStatus } = useQuery({
    queryKey: ["saved-card", id],
    queryFn: async () => {
      const response = await fetch(`/api/cards/${id}/saved`);
      if (!response.ok) {
        return { is_saved: false };
      }
      return response.json();
    },
    enabled: isAuthenticated && !!user?.id,
  });

  const saveCardMutation = useMutation({
    mutationFn: async () => {
      const method = savedStatus?.is_saved ? "DELETE" : "POST";
      const response = await fetch(`/api/cards/${id}/saved`, { method });
      if (!response.ok) {
        throw new Error("Failed to update saved status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-card", id] });
      queryClient.invalidateQueries({ queryKey: ["saved-cards"] });
      Haptics.lightAsync();
    },
  });

  const sendMessageMutation = useMutation({
    // CHANGE: use fetchWithAuth and always send JSON with proper headers; include sender info if available
    mutationFn: async (messageData) => {
      // Validate card completion before sending (only for authenticated users)
      if (isAuthenticated && !isComplete) {
        throw new Error(
          "Complete your card first. You need a profile video, name, and description to send messages."
        );
      }

      const payload = {
        ...messageData,
        // Prefer explicit values in messageData; fall back to authenticated user if present
        sender_email:
          messageData?.sender_email ?? (isAuthenticated ? user?.email : null),
        sender_name:
          messageData?.sender_name ?? (isAuthenticated ? user?.name : null),
      };

      const response = await fetchWithAuth(`/api/cards/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Try to surface server error message if available
        let errMsg = `Failed to send message (${response.status})`;
        try {
          const data = await response.json();
          if (data?.error) errMsg = data.error;
        } catch (_) {
          // ignore JSON parse errors
        }
        throw new Error(errMsg);
      }
      return response.json();
    },
    onSuccess: () => {
      Alert.alert("Success", "Your message has been sent!");
      // FIX: use supported haptics API for success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      Alert.alert(
        "Error",
        error?.message || "Failed to send message. Please try again.",
      );
      console.error("Send message error:", error);
    },
  });

  return {
    card: cardData?.card,
    isLoading,
    savedStatus,
    saveCardMutation,
    sendMessageMutation,
  };
}
