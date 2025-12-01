import React, { useRef, useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";

export default function OTPInput({ length = 6, onComplete, disabled = false }) {
  const [otp, setOtp] = useState(Array(length).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (text, index) => {
    if (disabled) return;

    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, "");
    
    if (numericText.length > 1) {
      // Handle paste
      const pastedDigits = numericText.slice(0, length).split("");
      const newOtp = [...otp];
      
      pastedDigits.forEach((digit, i) => {
        if (index + i < length) {
          newOtp[index + i] = digit;
        }
      });
      
      setOtp(newOtp);
      
      // Focus the next empty input or the last one
      const nextIndex = Math.min(index + pastedDigits.length, length - 1);
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus();
      }
      
      // Check if all fields are filled
      if (newOtp.every((digit) => digit !== "")) {
        onComplete?.(newOtp.join(""));
      }
    } else {
      // Single character input
      const newOtp = [...otp];
      newOtp[index] = numericText;
      setOtp(newOtp);

      // Auto-focus next input
      if (numericText && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Check if all fields are filled
      const updatedOtp = [...newOtp];
      if (updatedOtp.every((digit) => digit !== "")) {
        onComplete?.(updatedOtp.join(""));
      }
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index) => {
    // Select all text when focusing
    inputRefs.current[index]?.setNativeProps({ selection: { start: 0, end: 1 } });
  };

  return (
    <View style={styles.container}>
      {otp.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => (inputRefs.current[index] = ref)}
          style={[
            styles.input,
            digit && styles.inputFilled,
            disabled && styles.inputDisabled,
          ]}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => handleFocus(index)}
          keyboardType="number-pad"
          maxLength={1}
          editable={!disabled}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 24,
  },
  input: {
    width: 50,
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "#8FAEA2",
    borderRadius: 12,
    textAlign: "center",
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 24,
  },
  inputFilled: {
    borderColor: "#8FAEA2",
    backgroundColor: "rgba(143, 174, 162, 0.1)",
  },
  inputDisabled: {
    opacity: 0.5,
  },
});

