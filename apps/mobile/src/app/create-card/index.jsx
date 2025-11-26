import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/utils/auth/useAuth';
import useUser from '@/utils/auth/useUser';
import useAppFonts from '@/hooks/useAppFonts';
import { useQuery } from '@tanstack/react-query';
import useUpload from '@/utils/useUpload';
import { useCreateCard } from '@/hooks/useCreateCard';
import { useCardForm } from '@/hooks/useCardForm';
import { useLocationPicker } from '@/hooks/useLocationPicker';
import { SignInRequired } from '@/components/CreateCard/SignInRequired';
import { CameraView } from '@/components/CreateCard/CameraView';
import { CreateCardForm } from '@/components/CreateCard/CreateCardForm';
import * as DocumentPicker from 'expo-document-picker';

export default function CreateCardScreen() {
  const router = useRouter();
  const fontsLoaded = useAppFonts();
  const { isAuthenticated } = useAuth();
  const { data: user } = useUser();

  const [step, setStep] = useState('form');
  const [videoUploadGlow, setVideoUploadGlow] = useState(false);
  const [upload, { loading: isUploading }] = useUpload();

  const { formData, updateField, handleTagToggle, setVideoUrl, setLocation } =
    useCardForm(user);

  const { createCard, isCreating, showConfetti, setShowConfetti } =
    useCreateCard(user);

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

  const handleRecordVideo = async () => {
    setStep('camera');
  };

  const handleVideoUploaded = (url) => {
    console.log("[Upload] Profile video available", {
      url,
      userId: user?.id,
    });
    setVideoUrl(url);
    setVideoUploadGlow(true);
    setTimeout(() => setVideoUploadGlow(false), 2000);
    setStep('form');
  };

  const handleUploadVideoFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*', 'video/mp4', 'video/quicktime'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.type === 'cancel') {
        return;
      }
      const asset = result.assets?.[0] || result;
      if (!asset?.uri) {
        Alert.alert('Upload failed', 'Could not access selected video file.');
        return;
      }
      if (asset.size && asset.size > 120 * 1024 * 1024) {
        Alert.alert(
          'File too large',
          'Please select a video that is 120MB or smaller.',
        );
        return;
      }
      const { url, error } = await upload({
        reactNativeAsset: {
          uri: asset.uri,
          name: asset.name || 'profile-video',
          mimeType: asset.mimeType || 'video/mp4',
        },
      });
      if (error || !url) {
        Alert.alert('Upload failed', error || 'Could not upload video file.');
        return;
      }
      handleVideoUploaded(url);
    } catch (error) {
      Alert.alert(
        'Upload error',
        error?.message || 'Failed to upload selected video.',
      );
    }
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

    createCard(formData);
  };

  if (!fontsLoaded) {
    return null;
  }

  if (!isAuthenticated) {
    return <SignInRequired onGetStarted={() => router.push('/invite/email')} />;
  }

  if (step === 'camera') {
    return (
      <CameraView
        onBack={() => setStep('form')}
        onVideoUploaded={handleVideoUploaded}
        userId={user?.id}
      />
    );
  }

  return (
        <CreateCardForm
      formData={formData}
      onFieldChange={updateField}
      onRecordVideo={handleRecordVideo}
          onUploadVideo={handleUploadVideoFile}
      onUseMyLocation={handleUseMyLocation}
      onTagToggle={handleTagToggle}
      onCreateCard={handleCreateCard}
      onBack={() => router.back()}
      tags={tagsData?.tags}
      isCreating={isCreating}
      isUploading={isUploading}
      showConfetti={showConfetti}
      onConfettiComplete={() => setShowConfetti(false)}
      videoUploadGlow={videoUploadGlow}
    />
  );
}
