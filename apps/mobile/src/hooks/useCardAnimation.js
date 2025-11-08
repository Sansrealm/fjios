import { useState } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Alert } from "react-native"; // add alert to guard invalid asks

export function useCardAnimation() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentAsk, setCurrentAsk] = useState(null);
  const flipRotation = useSharedValue(0);

  const handleFlipToAsk = (ask) => {
    if (!ask || !ask.video_url || typeof ask.video_url !== "string") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Unavailable", "This ask has no video to play.");
      return;
    }
    setCurrentAsk(ask);
    flipRotation.value = withTiming(180, { duration: 600 }, () => {
      runOnJS(setIsFlipped)(true);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleFlipToFront = () => {
    // Unmount the back ask content/video immediately to avoid race/crash during flip
    setCurrentAsk(null);
    flipRotation.value = withTiming(0, { duration: 600 }, () => {
      runOnJS(setIsFlipped)(false);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipRotation.value, [0, 180], [0, 180]);
    const opacity = interpolate(flipRotation.value, [0, 90, 180], [1, 0, 0]);

    return {
      transform: [
        { perspective: 1000 }, // add perspective to stabilize 3D transform
        { rotateY: `${rotateY}deg` },
      ],
      opacity,
      backfaceVisibility: "hidden",
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipRotation.value, [0, 180], [180, 0]);
    const opacity = interpolate(flipRotation.value, [0, 90, 180], [0, 0, 1]);

    return {
      transform: [
        { perspective: 1000 }, // add perspective to stabilize 3D transform
        { rotateY: `${rotateY}deg` },
      ],
      opacity,
      backfaceVisibility: "hidden",
    };
  });

  return {
    isFlipped,
    currentAsk,
    handleFlipToAsk,
    handleFlipToFront,
    frontAnimatedStyle,
    backAnimatedStyle,
    flipRotation, // Exporting for use in dependencies
  };
}
