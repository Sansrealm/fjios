import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import KeyboardAvoidingAnimatedView from '@/components/KeyboardAvoidingAnimatedView';
import ConfettiOverlay from '@/components/ConfettiOverlay';
import { CreateCardHeader } from './CreateCardHeader';
import { ProfileVideoSection } from './ProfileVideoSection';
import { BasicInfoSection } from './BasicInfoSection';
import { LocationSection } from './LocationSection';
import { IndustryTagsSection } from './IndustryTagsSection';
import { CreateButton } from './CreateButton';

export function CreateCardForm({
  formData,
  onFieldChange,
  onRecordVideo,
  onUseMyLocation,
  onTagToggle,
  onCreateCard,
  onBack,
  tags,
  isCreating,
  isUploading,
  showConfetti,
  onConfettiComplete,
  videoUploadGlow,
}) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <View
        style={{
          flex: 1,
          backgroundColor: '#000',
          paddingTop: insets.top,
        }}
      >
        <StatusBar style="light" />

        <ConfettiOverlay
          visible={showConfetti}
          onComplete={onConfettiComplete}
        />

        <CreateCardHeader onBack={onBack} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <ProfileVideoSection
            videoUrl={formData.profile_video_url}
            onRecord={onRecordVideo}
            isUploading={isUploading}
            showGlow={videoUploadGlow}
          />

          <BasicInfoSection
            formData={formData}
            onFieldChange={onFieldChange}
          />

          <View style={{ marginBottom: 24 }}>
            <LocationSection
              formData={formData}
              onFieldChange={onFieldChange}
              onUseMyLocation={onUseMyLocation}
            />
          </View>

          <IndustryTagsSection
            tags={tags}
            selectedTagIds={formData.industry_tag_ids}
            onTagToggle={onTagToggle}
          />

          <CreateButton
            onPress={onCreateCard}
            isLoading={isCreating}
            disabled={isCreating}
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
