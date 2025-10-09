import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/utils/auth/useAuth";
import useUser from "@/utils/auth/useUser";
import * as Haptics from "expo-haptics";
import { Alert } from "react-native";

export function useCard(id) {
  const { isAuthenticated } = useAuth();
  const { data: user } = useUser();
  const queryClient = useQueryClient();

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
    mutationFn: async (messageData) => {
      const response = await fetch(`/api/cards/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      Alert.alert("Success", "Your message has been sent!");
      Haptics.successAsync();
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to send message. Please try again.");
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