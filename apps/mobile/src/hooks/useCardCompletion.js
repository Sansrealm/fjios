import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useUser from "@/utils/auth/useUser";
import { fetchWithAuth } from "@/utils/api";

/**
 * Hook to check if the current user's card is complete.
 * A card is considered complete if it has:
 * - Profile video URL
 * - Name (required text)
 * - Description (required text)
 */
export function useCardCompletion() {
  const { user } = useUser();

  const { data: userCard, isLoading } = useQuery({
    queryKey: ["user-card", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetchWithAuth(`/api/cards?userId=${user.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user card");
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  const isComplete = useMemo(() => {
    const card = userCard?.cards?.[0];
    if (!card) return false;
    
    // Check if card has all required fields
    return !!(
      card.profile_video_url &&
      card.name?.trim() &&
      card.description?.trim()
    );
  }, [userCard]);

  return {
    isComplete,
    card: userCard?.cards?.[0],
    isLoading,
  };
}

