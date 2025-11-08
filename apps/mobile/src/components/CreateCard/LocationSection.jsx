import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

export function LocationSection({ formData, onFieldChange, onUseMyLocation }) {
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            color: '#8FAEA2',
            fontFamily: 'Inter_500Medium',
            fontSize: 14,
          }}
        >
          Location
        </Text>
        <TouchableOpacity
          onPress={onUseMyLocation}
          style={{
            backgroundColor: 'rgba(143,174,162,0.2)',
            borderColor: '#8FAEA2',
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              color: '#8FAEA2',
              fontFamily: 'Inter_500Medium',
              fontSize: 12,
            }}
          >
            Use my location
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        value={formData.location_city}
        onChangeText={(text) => onFieldChange('location_city', text)}
        placeholder="City"
        placeholderTextColor="#7C7C7C"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          color: '#FFF',
          fontFamily: 'Inter_400Regular',
          fontSize: 16,
          marginBottom: 10,
        }}
      />
      <TextInput
        value={formData.location_state}
        onChangeText={(text) => onFieldChange('location_state', text)}
        placeholder="State / Region"
        placeholderTextColor="#7C7C7C"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 8,
          paddingHorizontal: 16,
          paddingVertical: 12,
          color: '#FFF',
          fontFamily: 'Inter_400Regular',
          fontSize: 16,
          marginBottom: 10,
        }}
      />
      <TextInput
        value={formData.location_country}
        onChangeText={(text) => onFieldChange('location_country', text)}
        placeholder="Country"
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
  );
}
