import { useState, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/utils/api";

export function useEditCard(id) {
  const queryClient = useQueryClient();

  const { data: cardData, isLoading } = useQuery({
    queryKey: ["card", id],
    queryFn: async () => {
      const res = await fetch(`/api/cards/${id}`);
      if (!res.ok) throw new Error("Failed to load card");
      return res.json();
    },
    enabled: !!id,
  });

  const initial = useMemo(
    () => ({
      name: cardData?.card?.name || "",
      startup_name: cardData?.card?.startup_name || "",
      startup_website: cardData?.card?.startup_website || "",
      role: cardData?.card?.role || "",
      description: cardData?.card?.description || "",
      profile_video_url: cardData?.card?.profile_video_url || "",
      industry_tag_ids: (cardData?.card?.industry_tags || []).map((t) => t.id),
      // ADD: optional location fields
      location_city: cardData?.card?.location_city || "",
      location_state: cardData?.card?.location_state || "",
      location_country: cardData?.card?.location_country || "",
    }),
    [cardData],
  );

  const [formData, setFormData] = useState(initial);
  useEffect(() => setFormData(initial), [initial]);

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetchWithAuth(`/api/cards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res
          .json()
          .catch(() => ({ error: "Failed to update" }));
        throw new Error(error.error || "Failed to update card");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["card", id]);
      queryClient.invalidateQueries(["cards"]);
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const updateAskMutation = useMutation({
    mutationFn: async ({ askId, payload }) => {
      const res = await fetchWithAuth(`/api/cards/${id}/asks/${askId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res
        .json()
        .catch(() => ({ error: "Failed to update ask" }));
      if (!res.ok) throw new Error(data.error || "Failed to update ask");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["card", id]);
      Alert.alert("Updated", "Ask updated.");
    },
    onError: (e) => Alert.alert("Error", e.message),
  });

  const deleteAskMutation = useMutation({
    mutationFn: async ({ askId }) => {
      const res = await fetchWithAuth(`/api/cards/${id}/asks/${askId}`, {
        method: "DELETE",
        // Send an empty JSON body to avoid middleware issues
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res
        .json()
        .catch(() => ({ error: "Failed to delete ask" }));
      if (!res.ok) throw new Error(data.error || "Failed to delete ask");
      return { askId };
    },
    onMutate: async ({ askId }) => {
      await queryClient.cancelQueries({ queryKey: ["card", id] });
      const previous = queryClient.getQueryData(["card", id]);
      try {
        if (previous?.card?.asks) {
          const next = {
            ...previous,
            card: {
              ...previous.card,
              asks: previous.card.asks.filter((a) => a.id !== askId),
            },
          };
          queryClient.setQueryData(["card", id], next);
        }
      } catch {}
      return { previous };
    },
    onError: (e, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["card", id], context.previous);
      }
      Alert.alert("Error", e.message || "Failed to delete ask");
    },
    onSuccess: () => {
      Alert.alert("Deleted", "Ask removed.");
    },
    onSettled: () => {
      queryClient.invalidateQueries(["card", id]);
    },
  });

  return {
    cardData,
    isLoading,
    formData,
    setFormData,
    updateMutation,
    updateAskMutation,
    deleteAskMutation,
  };
}
