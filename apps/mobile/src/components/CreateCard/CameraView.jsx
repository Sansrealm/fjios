import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
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
  const recordingPromiseRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [facing, setFacing] = useState('front');
  const [upload, { loading: isUploading }] = useUpload();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const isStoppingRef = useRef(false);

  // Log permission status for debugging
  useEffect(() => {
    if (permission) {
      console.log('[CameraView] Permission status:', {
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
        status: permission.status,
      });
    }
  }, [permission]);

  const startRecording = async () => {
    if (isUploading) {
      console.log('[CameraView] Upload already in progress, cannot start recording');
      return;
    }

    // Check if camera is ready
    if (!cameraRef.current) {
      console.error('[CameraView] Camera ref is null');
      Alert.alert(
        'Camera Not Ready',
        'Camera is not ready yet. Please wait a moment and try again.',
      );
      return;
    }

    // Check if camera is initialized
    if (!isCameraReady) {
      console.log('[CameraView] Camera not ready yet, waiting...');
      Alert.alert(
        'Camera Not Ready',
        'Please wait for the camera to initialize, then try again.',
      );
      return;
    }

    // Ensure we have camera permission BEFORE attempting to record
    // Only check/request permission if not already granted
    if (!permission?.granted) {
      // Permission is not granted, request it
      console.log('[CameraView] Permission not granted, requesting...');
      
      // If permission is still loading, wait a bit
      if (permission === null || permission === undefined) {
        console.log('[CameraView] Permission is still loading, waiting...');
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Request permission
      const result = await requestPermission();
      console.log('[CameraView] Permission request result:', {
        granted: result.granted,
        canAskAgain: result.canAskAgain,
      });
      
      if (!result.granted) {
        // Permission denied
        if (!result.canAskAgain) {
          // Permission is permanently denied
          Alert.alert(
            'Camera Permission Required',
            'Camera permission is required to record videos. Please enable it in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: handleOpenSettings,
              },
            ],
          );
        } else {
          // Permission was denied but can ask again
          Alert.alert(
            'Permission Required',
            'Camera permission is required to record videos. Please grant permission when prompted.',
          );
        }
        return;
      }
      // Permission granted, continue with recording
      console.log('[CameraView] Permission granted, starting recording...');
    } else {
      // Permission is already granted - proceed directly to recording
      console.log('[CameraView] Permission already granted, starting recording...');
    }

    // Verify camera ref is available and ready
    if (!cameraRef.current) {
      console.error('[CameraView] Camera ref is null');
      Alert.alert(
        'Camera Not Ready',
        'Camera is not initialized. Please wait a moment and try again.',
      );
      return;
    }

    // Verify camera has recordAsync method (indicates it's ready)
    if (!cameraRef.current || typeof cameraRef.current.recordAsync !== 'function') {
      console.error('[CameraView] Camera recordAsync method not available');
      Alert.alert(
        'Camera Not Ready',
        'Camera is not ready to record. Please wait a moment and try again.',
      );
      return;
    }

    setIsRecording(true);
    
    try {
      console.log('[CameraView] Starting recording...', {
        cameraRefExists: !!cameraRef.current,
        recordAsyncExists: typeof cameraRef.current?.recordAsync === 'function',
        permissionGranted: permission?.granted,
        isCameraReady,
      });

      // Start recording and store the promise
      recordingPromiseRef.current = cameraRef.current.recordAsync({
        maxDuration: 30,
        quality: 'high',
      });

      console.log('[CameraView] Recording started, waiting for completion...');

      // Wait for recording to complete
      // Note: When stopRecording() is called, this promise resolves with video data
      // If recording fails or is cancelled, it rejects
      const video = await recordingPromiseRef.current.catch((recordingError) => {
        // Log full error details for debugging
        console.error('[CameraView] Recording error - full details:', {
          error: recordingError,
          message: recordingError?.message,
          code: recordingError?.code,
          name: recordingError?.name,
          toString: recordingError?.toString?.(),
          stack: recordingError?.stack,
        });
        
        // Get error message - try multiple ways to extract it
        let errorMessage = '';
        if (recordingError?.message) {
          errorMessage = recordingError.message;
        } else if (typeof recordingError === 'string') {
          errorMessage = recordingError;
        } else if (recordingError?.toString) {
          errorMessage = recordingError.toString();
        } else {
          errorMessage = 'Unknown recording error';
        }
        
        const errorCode = recordingError?.code || '';
        const errorName = recordingError?.name || '';
        
        // Normalize error strings for comparison
        const lowerMessage = errorMessage.toLowerCase();
        const lowerCode = String(errorCode).toLowerCase();
        const lowerName = errorName.toLowerCase();
        
        console.log('[CameraView] Error analysis:', {
          lowerMessage,
          lowerCode,
          lowerName,
          containsPermission: lowerMessage.includes('permission'),
          containsAccess: lowerMessage.includes('access'),
          containsUnauthorized: lowerMessage.includes('unauthorized'),
        });
        
        // Only treat as permission error if explicitly about permissions
        // Be very specific - don't treat generic "access" as permission
        const isExplicitPermissionError = 
          lowerMessage.includes('permission denied') ||
          lowerMessage.includes('camera permission') ||
          lowerMessage.includes('permission required') ||
          lowerCode === 'permission_denied' ||
          lowerCode === 'permission_denied_camera' ||
          lowerName === 'permissionerror';
        
        if (isExplicitPermissionError) {
          console.error('[CameraView] Explicit permission error detected');
          // Re-check permission status
          if (!permission?.granted) {
            throw new Error('Camera permission was revoked. Please grant permission and try again.');
          }
          // If permission is granted but we still get permission error, it's a system issue
          throw new Error('Camera permission error detected. Please try closing and reopening the camera screen.');
        }
        
        // Check for camera not available or in use errors
        const isCameraUnavailable = 
          lowerMessage.includes('camera not available') ||
          lowerMessage.includes('camera is in use') ||
          lowerMessage.includes('camera busy') ||
          lowerMessage.includes('device busy') ||
          lowerMessage.includes('failed to start') ||
          lowerMessage.includes('could not start') ||
          lowerMessage.includes('unable to start') ||
          lowerCode === 'camera_unavailable' ||
          lowerCode === 'camera_busy' ||
          lowerCode === 'device_busy';
        
        if (isCameraUnavailable) {
          throw new Error('Camera is not available or in use by another app. Please close other apps using the camera and try again.');
        }
        
        // Check for recording cancellation/interruption
        if (lowerMessage.includes('cancelled') || 
            lowerMessage.includes('interrupted') ||
            lowerMessage.includes('stopped') ||
            lowerMessage.includes('aborted')) {
          throw new Error('Recording was cancelled or interrupted. Please try recording again.');
        }
        
        // For other errors, show a generic but helpful message
        // Don't expose technical error details to users
        throw new Error('Recording failed. Please ensure the camera is working properly and try again.');
      });

      // Clear the promise reference
      recordingPromiseRef.current = null;

      // Validate video was recorded successfully
      if (!video) {
        throw new Error('Recording failed: No video data returned');
      }

      if (!video.uri) {
        throw new Error('Recording failed: No video file URI was created');
      }

      // Check if recording was too short (might indicate an error)
      if (video.duration !== undefined && video.duration < 0.5) {
        console.warn('[CameraView] Recording duration is very short:', video.duration);
        // Still proceed with upload, but log a warning
      }

      console.log('[CameraView] Video recorded successfully:', {
        uri: video.uri,
        duration: video.duration,
        fileSize: video.fileSize,
      });

      // Upload the video
      const uploadResult = await upload({
        reactNativeAsset: {
          uri: video.uri,
          name: 'profile-video.mp4',
          mimeType: 'video/mp4',
        },
      });

      console.log('[CameraView] Upload result:', uploadResult);

      // Check for upload errors
      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      if (!uploadResult.url) {
        throw new Error('Upload failed: No URL returned from upload service');
      }

      // Handle milestone if userId is provided
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
          // Don't fail the upload if milestone update fails
        }
      }

      onVideoUploaded(uploadResult.url);
      Alert.alert('Success', 'Video uploaded! Now complete your card details.');
    } catch (error) {
      console.error('[CameraView] Recording/upload failed:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to record or upload video. Please try again.';
      
      if (error.message) {
        // Permission errors should only happen before recording starts
        // If we're here and recording was attempted, permission was already granted
        // So don't show permission errors during recording
        if (error.message.includes('permission') && !isRecording) {
          errorMessage = 'Camera permission is required. Please enable it in settings.';
        } else if (error.message.includes('Recording was cancelled') || error.message.includes('interrupted')) {
          errorMessage = 'Recording was cancelled. Please record a video and tap stop when finished.';
        } else if (error.message.includes('Recording failed')) {
          errorMessage = 'Recording failed. Please ensure you record for at least 1 second and try again.';
        } else if (error.message.includes('Upload failed')) {
          errorMessage = error.message;
        } else if (error.message.includes('Uploadcare')) {
          errorMessage = 'Upload service error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsRecording(false);
      isStoppingRef.current = false;
      recordingPromiseRef.current = null;
    }
  };

  const stopRecording = async () => {
    // Prevent multiple stop calls
    if (isStoppingRef.current || !cameraRef.current || !isRecording) {
      return;
    }

    try {
      isStoppingRef.current = true;
      // Stop the recording - this will resolve the recordAsync promise with video data
      // The promise handler in startRecording will continue processing
      cameraRef.current.stopRecording();
      // Note: We don't set isRecording to false here because the promise handler
      // will handle that in the finally block after upload completes
    } catch (error) {
      console.error('[CameraView] Error stopping recording:', error);
      isStoppingRef.current = false;
      setIsRecording(false);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => {
      const newFacing = current === 'back' ? 'front' : 'back';
      // Reset camera ready state when switching cameras
      setIsCameraReady(false);
      console.log('[CameraView] Switching camera facing to:', newFacing);
      return newFacing;
    });
  };

  // Note: We don't auto-request permission on mount
  // Permission will be requested when user tries to start recording

  // Cleanup: Stop recording if component unmounts during recording
  useEffect(() => {
    return () => {
      if (isRecording && cameraRef.current) {
        try {
          cameraRef.current.stopRecording();
        } catch (error) {
          console.error('[CameraView] Error stopping recording on unmount:', error);
        }
      }
    };
  }, [isRecording]);

  const handleOpenSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        // Android - try openSettings if available, otherwise use intent
        if (Linking.openSettings) {
          await Linking.openSettings();
        } else {
          await Linking.openURL('app-settings:');
        }
      }
    } catch (error) {
      console.error('[CameraView] Error opening settings:', error);
      Alert.alert(
        'Settings',
        'Please go to your device settings > Apps > ' + (Platform.OS === 'ios' ? 'this app' : 'this app') + ' > Permissions and enable Camera permission.',
      );
    }
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

      {/* Show camera view if permission is granted, or if permission status is still loading */}
      {permission?.granted === true ? (
        <ExpoCameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing={facing}
          mode="video"
          onCameraReady={() => {
            console.log('[CameraView] Camera is ready');
            setIsCameraReady(true);
          }}
          onMountError={(error) => {
            console.error('[CameraView] Camera mount error:', error);
            setIsCameraReady(false);
            Alert.alert(
              'Camera Error',
              'Failed to initialize camera. Please try closing and reopening the camera screen.',
              [
                { text: 'OK', onPress: onBack },
              ],
            );
          }}
        />
      ) : permission === null || permission === undefined ? (
        // Permission is still loading, show loading state
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#000',
          }}
        >
          <ActivityIndicator size="large" color="#8FAEA2" />
          <Text
            style={{
              color: '#FFF',
              fontFamily: 'Inter_500Medium',
              fontSize: 16,
              marginTop: 16,
            }}
          >
            Checking camera permission...
          </Text>
        </View>
      ) : (
        // Permission denied, show permission request UI
        !permission?.granted && (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
          }}
        >
          <Ionicons name="camera-outline" size={64} color="#8FAEA2" style={{ marginBottom: 24 }} />
          <Text
            style={{
              color: '#FFF',
              fontFamily: 'Inter_600SemiBold',
              fontSize: 18,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            Camera Permission Required
          </Text>
          <Text
            style={{
              color: '#CFCFCF',
              fontFamily: 'Inter_400Regular',
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 20,
            }}
          >
            Tap the record button below to request camera permission and start recording your profile video.
          </Text>
          {permission?.canAskAgain !== false ? (
            <TouchableOpacity
              onPress={startRecording}
              style={{
                backgroundColor: '#8FAEA2',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: '#000',
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 16,
                }}
              >
                Request Permission & Start Recording
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={handleOpenSettings}
                style={{
                  backgroundColor: '#8FAEA2',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: '#000',
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 16,
                  }}
                >
                  Open Settings
                </Text>
              </TouchableOpacity>
              <Text
                style={{
                  color: '#7C7C7C',
                  fontFamily: 'Inter_400Regular',
                  fontSize: 12,
                  textAlign: 'center',
                  marginBottom: 12,
                }}
              >
                Please enable camera permission in settings, then return to record your video.
              </Text>
            </>
          )}
          <TouchableOpacity
            onPress={onBack}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            <Text
              style={{
                color: '#7C7C7C',
                fontFamily: 'Inter_500Medium',
                fontSize: 14,
              }}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
        )
      )}

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
          disabled={!permission?.granted || isUploading || !isCameraReady}
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
            opacity: !permission?.granted || isUploading || !isCameraReady ? 0.5 : 1,
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

        {!isRecording && !isUploading && (
          <Text
            style={{
              color: '#FFF',
              fontFamily: 'Inter_500Medium',
              fontSize: 14,
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            {!isCameraReady ? 'Camera initializing...' : 'Tap to start recording'}
          </Text>
        )}

        {isUploading && (
          <View style={{ marginTop: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#8FAEA2" />
            <Text
              style={{
                color: '#8FAEA2',
                fontFamily: 'Inter_500Medium',
                fontSize: 14,
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              Uploading video...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
