import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export function SignInRequired({ onGetStarted }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
      }}
    >
      <Text
        style={{
          color: '#FFF',
          fontFamily: 'Inter_600SemiBold',
          fontSize: 24,
          textAlign: 'center',
          marginBottom: 12,
        }}
      >
        Sign In Required
      </Text>
      <TouchableOpacity
        onPress={onGetStarted}
        style={{
          backgroundColor: '#8FAEA2',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 8,
          marginTop: 16,
        }}
      >
        <Text
          style={{
            color: '#000',
            fontFamily: 'Inter_600SemiBold',
            fontSize: 16,
          }}
        >
          Get Started
        </Text>
      </TouchableOpacity>
    </View>
  );
}
