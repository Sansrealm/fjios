import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { fetchWithAuth } from '@/utils/api';
import { updateMilestone, checkMilestone, MILESTONES } from '@/utils/milestones';

export function useCreateCard(user) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showConfetti, setShowConfetti] = useState(false);

  const createCardMutation = useMutation({
    mutationFn: async (cardData) => {
      const response = await fetchWithAuth('/api/cards', {
        method: 'POST',
        body: JSON.stringify(cardData),
      });
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          errorData = await response.text();
        }
        throw new Error(
          errorData?.error ||
            `API Error: ${response.status} ${response.statusText}`,
        );
      }
      return response.json();
    },
    retry: false,
    onSuccess: async (data) => {
      // Invalidate queries first to ensure UI updates
      queryClient.invalidateQueries(['cards']);
      queryClient.invalidateQueries(['user-cards']);

      // Ensure we have a valid card ID
      const cardId = data?.card?.id;
      if (!cardId) {
        console.error('Card creation response missing card ID:', data);
        Alert.alert('Error', 'Card created but ID not found. Please refresh.');
        return;
      }

      // Show success alert immediately - don't wait for milestone
      Alert.alert('Success', 'Your digital card has been created!', [
        {
          text: 'View Card',
          onPress: () => {
            console.log('Navigating to card:', cardId);
            router.replace(`/card/${cardId}`);
          },
        },
      ]);

      // Handle milestone update asynchronously - don't let it block success flow
      if (user?.id) {
        // Fire and forget - handle milestone in background
        (async () => {
          try {
            const alreadyCompleted = await checkMilestone(
              user.id,
              MILESTONES.CARD_CREATED,
            );
            if (!alreadyCompleted) {
              await updateMilestone(user.id, MILESTONES.CARD_CREATED);
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              setShowConfetti(true);
            } else {
              // Still show confetti if milestone already completed
              setShowConfetti(true);
            }
          } catch (error) {
            // Log error but don't throw - milestone failure shouldn't break card creation
            console.error('Error handling card creation milestone:', error);
            // Still show confetti even if milestone fails
            setShowConfetti(true);
          }
        })();
      } else {
        // Show confetti even if no user ID (shouldn't happen, but be safe)
        setShowConfetti(true);
      }
    },
    onError: (error) => {
      Alert.alert('Error', `${error.message}`);
    },
  });

  return {
    createCard: createCardMutation.mutate,
    isCreating: createCardMutation.isPending,
    showConfetti,
    setShowConfetti,
  };
}
