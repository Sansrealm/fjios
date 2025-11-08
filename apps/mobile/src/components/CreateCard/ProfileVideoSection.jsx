import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MotiView } from 'moti';

export function ProfileVideoSection({ videoUrl, onRecord, isUploading, showGlow }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          color: '#FFF',
          fontFamily: 'Inter_600SemiBold',
          fontSize: 18,
          marginBottom: 16,
        }}
      >
        Profile Video
      </Text>

      <MotiView
        animate={{
          shadowOpacity: showGlow ? 0.6 : 0,
          shadowRadius: showGlow ? 20 : 0,
          scale: showGlow ? 1.05 : 1,
        }}
        transition={{
          type: 'timing',
          duration: 500,
        }}
        style={{
          shadowColor: '#8FAEA2',
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <TouchableOpacity
          onPress={onRecord}
          style={{
            backgroundColor: videoUrl
              ? '#8FAEA2'
              : 'rgba(17, 17, 17, 0.8)',
            borderWidth: 1,
            borderColor: '#8FAEA2',
            borderRadius: 12,
            padding: 20,
            alignItems: 'center',
            borderStyle: videoUrl ? 'solid' : 'dashed',
          }}
        >
          <Ionicons
            name={videoUrl ? 'checkmark-circle' : 'videocam'}
            size={32}
            color={videoUrl ? '#000' : '#8FAEA2'}
          />
          <Text
            style={{
              color: videoUrl ? '#000' : '#8FAEA2',
              fontFamily: 'Inter_500Medium',
              fontSize: 16,
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            {videoUrl
              ? 'Video Uploaded'
              : isUploading
                ? 'Uploading...'
                : 'Record 30s Profile Video'}
          </Text>
        </TouchableOpacity>
      </MotiView>
    </View>
  );
}
