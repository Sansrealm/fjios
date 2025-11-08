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
      queryClient.invalidateQueries(['cards']);
      queryClient.invalidateQueries(['user-cards']);

      if (user?.id) {
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
          }
        } catch (error) {
          console.error('Error handling card creation milestone:', error);
        }
      }

      Alert.alert('Success', 'Your digital card has been created!', [
        {
          text: 'View Card',
          onPress: () => router.replace(`/card/${data.card.id}`),
        },
      ]);
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
