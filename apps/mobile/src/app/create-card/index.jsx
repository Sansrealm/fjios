import React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/utils/auth/useAuth';
import useUser from '@/utils/auth/useUser';
import useAppFonts from '@/hooks/useAppFonts';
import { useQuery } from '@tanstack/react-query';
import { useCreateCard } from '@/hooks/useCreateCard';
import { useCardForm } from '@/hooks/useCardForm';
import { useLocationPicker } from '@/hooks/useLocationPicker';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { SignInRequired } from '@/components/CreateCard/SignInRequired';
import { CreateCardForm } from '@/components/CreateCard/CreateCardForm';

export default function CreateCardScreen() {
  const router = useRouter();
  const fontsLoaded = useAppFonts();
  const { isAuthenticated } = useAuth();
  const { data: user } = useUser();

  const { formData, updateField, handleTagToggle, setLocation, setFormData } =
    useCardForm(user);

  const { createCard, isCreating, showConfetti, setShowConfetti } =
    useCreateCard(user);

  const {
    uploading,
    updatingProfileVideo,
    uploadProfileVideo,
    uploadProfileVideoFromGallery,
  } = useVideoUpload();

  const { handleUseMyLocation } = useLocationPicker(setLocation);

  const { data: tagsData } = useQuery({
    queryKey: ['industry-tags'],
    queryFn: async () => {
      const response = await fetch('/api/industry-tags');
      if (!response.ok) {
        throw new Error('Failed to fetch industry tags');
      }
      return response.json();
    },
  });

  const { data: myCards } = useQuery({
    queryKey: ['user-cards', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/cards?userId=${user?.id}`);
      if (!res.ok) throw new Error('Failed to check existing cards');
      return res.json();
    },
    enabled: !!user?.id,
  });

  const alreadyHasCard = (myCards?.cards?.length || 0) > 0;

  const handleUploadProfileVideo = async () => {
    // For create card, we don't have a cardId yet, so pass null
    // This will just update the local form state
    await uploadProfileVideo(null, setFormData);
  };

  const handleUploadProfileVideoFromGallery = async () => {
    // For create card, we don't have a cardId yet, so pass null
    // This will just update the local form state
    await uploadProfileVideoFromGallery(null, setFormData);
  };

  const handleCreateCard = () => {
    if (isCreating) {
      return;
    }

    if (alreadyHasCard) {
      Alert.alert(
        'Limit reached',
        'You already have a card. You can edit your existing card instead.',
        [
          {
            text: 'Edit Card',
            onPress: () => router.push(`/card/${myCards.cards[0].id}/edit`),
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (formData.description.length > 124) {
      Alert.alert('Error', 'Description must be 124 characters or less');
      return;
    }

    // Ensure profile_video_url is included in the submission
    const cardDataToSubmit = {
      ...formData,
      profile_video_url: formData.profile_video_url || '',
    };
    
    console.log('[Create Card] Submitting card data:', {
      name: cardDataToSubmit.name,
      profile_video_url: cardDataToSubmit.profile_video_url || 'missing',
      hasVideoUrl: !!cardDataToSubmit.profile_video_url,
    });

    createCard(cardDataToSubmit);
  };

  if (!fontsLoaded) {
    return null;
  }

  if (!isAuthenticated) {
    return <SignInRequired onGetStarted={() => router.push('/invite/email')} />;
  }

  return (
    <CreateCardForm
      formData={formData}
      onFieldChange={updateField}
      onUploadProfileVideo={handleUploadProfileVideo}
      onUploadProfileVideoFromGallery={handleUploadProfileVideoFromGallery}
      onUseMyLocation={handleUseMyLocation}
      onTagToggle={handleTagToggle}
      onCreateCard={handleCreateCard}
      onBack={() => router.back()}
      tags={tagsData?.tags}
      isCreating={isCreating}
      uploading={uploading}
      updatingProfileVideo={updatingProfileVideo}
      showConfetti={showConfetti}
      onConfettiComplete={() => setShowConfetti(false)}
    />
  );
}
