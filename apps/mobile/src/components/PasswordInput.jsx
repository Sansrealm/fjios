import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function PasswordInput({
  label,
  value,
  onChangeText,
  placeholder = "Enter password",
  editable = true,
  style,
  containerStyle,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[{ width: "100%" }, containerStyle]}>
      {label && (
        <Text
          style={{
            color: "#8FAEA2",
            fontFamily: "Inter_500Medium",
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          {label}
        </Text>
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          borderColor: "#8FAEA2",
          borderRadius: 12,
          paddingHorizontal: 16,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#7C7C7C"
          secureTextEntry={!showPassword}
          editable={editable}
          style={[
            {
              flex: 1,
              paddingVertical: 16,
              color: "#FFF",
              fontFamily: "Inter_400Regular",
              fontSize: 16,
            },
            style,
          ]}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={{ padding: 8 }}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={20}
            color="#8FAEA2"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}



