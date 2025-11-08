import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export function IndustryTagsSection({ tags, selectedTagIds, onTagToggle }) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <View style={{ marginBottom: 32 }}>
      <Text
        style={{
          color: '#FFF',
          fontFamily: 'Inter_600SemiBold',
          fontSize: 18,
          marginBottom: 16,
        }}
      >
        Industry Tags
      </Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            onPress={() => onTagToggle(tag.id)}
            style={{
              backgroundColor: selectedTagIds.includes(tag.id)
                ? `${tag.color}30`
                : 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              borderColor: selectedTagIds.includes(tag.id)
                ? tag.color
                : '#333',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                color: selectedTagIds.includes(tag.id)
                  ? tag.color
                  : '#CFCFCF',
                fontFamily: 'Inter_500Medium',
                fontSize: 14,
              }}
            >
              {tag.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
