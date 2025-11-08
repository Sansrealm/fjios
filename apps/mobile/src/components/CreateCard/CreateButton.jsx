import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

export function CreateButton({ onPress, isLoading, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      style={{
        backgroundColor: '#8FAEA2',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        opacity: disabled || isLoading ? 0.7 : 1,
      }}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#000" />
      ) : (
        <Text
          style={{
            color: '#000',
            fontFamily: 'Inter_600SemiBold',
            fontSize: 16,
          }}
        >
          Create Digital Card
        </Text>
      )}
    </TouchableOpacity>
  );
}
