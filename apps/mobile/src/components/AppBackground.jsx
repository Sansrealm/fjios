import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function AppBackground({ children, variant = "default" }) {
  const renderBackground = () => {
    switch (variant) {
      case "card":
        return (
          <>
            {/* Corner vignettes for card view */}
            <LinearGradient
              colors={["rgba(143, 174, 162, 0.2)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "50%",
                height: "50%",
              }}
            />
            <LinearGradient
              colors={["rgba(143, 174, 162, 0.2)", "transparent"]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "50%",
                height: "50%",
              }}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {renderBackground()}
      {children}
    </View>
  );
}