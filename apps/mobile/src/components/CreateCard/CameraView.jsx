import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { CameraView as ExpoCameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import useUpload from '@/utils/useUpload';
import { updateMilestone, checkMilestone, MILESTONES } from '@/utils/milestones';

export function CameraView({ onBack, onVideoUploaded, userId }) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [facing, setFacing] = useState('front');
  const [upload, { loading: isUploading }] = useUpload();

  const startRecording = async () => {
    if (!cameraRef.current || isUploading) return;

    setIsRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 30,
        quality: 'high',
      });

      const { url, error } = await upload({
        reactNativeAsset: {
          uri: video.uri,
          name: 'profile-video.mp4',
          mimeType: 'video/mp4',
        },
      });

      if (error || !url) {
        throw new Error(error || 'Failed to upload video');
      }

      if (userId) {
        try {
          const alreadyCompleted = await checkMilestone(
            userId,
            MILESTONES.PROFILE_VIDEO,
          );
          if (!alreadyCompleted) {
            await updateMilestone(userId, MILESTONES.PROFILE_VIDEO);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        } catch (error) {
          console.error('Error handling profile video milestone:', error);
        }
      }

      onVideoUploaded(url);
      Alert.alert('Success', 'Video uploaded! Now complete your card details.');
    } catch (error) {
      console.error('Recording/upload failed:', error);
      Alert.alert(
        'Error',
        'Failed to record or upload video. Please try again.',
      );
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000',
        paddingTop: insets.top,
      }}
    >
      <StatusBar style="light" />

      {isRecording && (
        <View
          style={{
            position: 'absolute',
            top: insets.top + 20,
            left: 0,
            right: 0,
            zIndex: 15,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <MotiView
              animate={{
                opacity: [1, 0.3, 1],
              }}
              transition={{
                type: 'timing',
                duration: 1000,
                loop: true,
              }}
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: '#FF3B30',
              }}
            />
            <Text
              style={{
                color: '#FFF',
                fontFamily: 'Inter_600SemiBold',
                fontSize: 14,
              }}
            >
              RECORDING
            </Text>
          </View>
        </View>
      )}

      <View
        style={{
          position: 'absolute',
          top: insets.top + 16,
          left: 20,
          right: 20,
          zIndex: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          disabled={isRecording}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isRecording ? 0.5 : 1,
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleCameraFacing}
          disabled={isRecording}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isRecording ? 0.5 : 1,
          }}
        >
          <Ionicons name="camera-reverse" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ExpoCameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        mode="video"
      />

      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 40,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={isRecording ? stopRecording : startRecording}
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: isRecording ? '#FF3B30' : '#8FAEA2',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            ...(isRecording && {
              shadowColor: '#FF3B30',
              shadowOpacity: 0.6,
              shadowRadius: 12,
            }),
          }}
        >
          {isRecording ? (
            <MotiView
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                type: 'timing',
                duration: 1000,
                loop: true,
              }}
            >
              <Ionicons name="stop" size={32} color="#FFF" />
            </MotiView>
          ) : (
            <Ionicons name="videocam" size={32} color="#000" />
          )}
        </TouchableOpacity>

        {isRecording && (
          <MotiView
            animate={{
              opacity: [1, 0.7, 1],
            }}
            transition={{
              type: 'timing',
              duration: 1500,
              loop: true,
            }}
            style={{ marginTop: 16 }}
          >
            <Text
              style={{
                color: '#FF3B30',
                fontFamily: 'Inter_600SemiBold',
                fontSize: 16,
                textAlign: 'center',
              }}
            >
              Recording... (30s max)
            </Text>
            <Text
              style={{
                color: '#FFF',
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              Tap stop when finished
            </Text>
          </MotiView>
        )}

        {!isRecording && (
          <Text
            style={{
              color: '#FFF',
              fontFamily: 'Inter_500Medium',
              fontSize: 14,
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            Tap to start recording
          </Text>
        )}
      </View>
    </View>
  );
}
