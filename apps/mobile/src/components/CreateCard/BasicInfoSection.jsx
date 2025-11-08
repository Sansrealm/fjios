import React from 'react';
import { View, Text, TextInput } from 'react-native';

export function BasicInfoSection({ formData, onFieldChange }) {
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
        Basic Information
      </Text>

      <View style={{ gap: 16 }}>
        <View>
          <Text
            style={{
              color: '#8FAEA2',
              fontFamily: 'Inter_500Medium',
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            Name *
          </Text>
          <TextInput
            value={formData.name}
            onChangeText={(text) => onFieldChange('name', text)}
            placeholder="Your full name"
            placeholderTextColor="#7C7C7C"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: '#FFF',
              fontFamily: 'Inter_400Regular',
              fontSize: 16,
            }}
          />
        </View>

        <View>
          <Text
            style={{
              color: '#8FAEA2',
              fontFamily: 'Inter_500Medium',
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            Startup/Company Name
          </Text>
          <TextInput
            value={formData.startup_name}
            onChangeText={(text) => onFieldChange('startup_name', text)}
            placeholder="Your company name"
            placeholderTextColor="#7C7C7C"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: '#FFF',
              fontFamily: 'Inter_400Regular',
              fontSize: 16,
            }}
          />
        </View>

        <View>
          <Text
            style={{
              color: '#8FAEA2',
              fontFamily: 'Inter_500Medium',
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            Website
          </Text>
          <TextInput
            value={formData.startup_website}
            onChangeText={(text) => onFieldChange('startup_website', text)}
            placeholder="https://your-website.com"
            placeholderTextColor="#7C7C7C"
            keyboardType="url"
            autoCapitalize="none"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: '#FFF',
              fontFamily: 'Inter_400Regular',
              fontSize: 16,
            }}
          />
        </View>

        <View>
          <Text
            style={{
              color: '#8FAEA2',
              fontFamily: 'Inter_500Medium',
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            Role
          </Text>
          <TextInput
            value={formData.role}
            onChangeText={(text) => onFieldChange('role', text)}
            placeholder="Founder, CEO, CTO, etc."
            placeholderTextColor="#7C7C7C"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: '#FFF',
              fontFamily: 'Inter_400Regular',
              fontSize: 16,
            }}
          />
        </View>

        <View>
          <Text
            style={{
              color: '#8FAEA2',
              fontFamily: 'Inter_500Medium',
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            Description ({formData.description.length}/124)
          </Text>
          <TextInput
            value={formData.description}
            onChangeText={(text) => {
              if (text.length <= 124) {
                onFieldChange('description', text);
              }
            }}
            placeholder="Brief description about yourself or your startup"
            placeholderTextColor="#7C7C7C"
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              color: '#FFF',
              fontFamily: 'Inter_400Regular',
              fontSize: 16,
              textAlignVertical: 'top',
            }}
          />
        </View>
      </View>
    </View>
  );
}
