import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import useUpload from "@/utils/useUpload";

export function useVideoUpload() {
  const [upload, { loading: uploading }] = useUpload();
  const [updatingProfileVideo, setUpdatingProfileVideo] = useState(false);

  // Normalize duration to seconds regardless of platform quirks
  const toSeconds = (duration) => {
    if (typeof duration !== "number" || Number.isNaN(duration)) return null;
    // If duration looks like milliseconds (e.g., 2000 for 2s), convert to seconds
    return duration > 1000 ? duration / 1000 : duration;
  };

  // NOTE: Library-based picking kept for other flows if needed, but NOT used for profile video now
  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need access to your library to pick a video.",
      );
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return null;
    const asset = result.assets?.[0];
    if (!asset) return null;

    const durSec = toSeconds(asset.duration);
    if (Number.isFinite(durSec) && durSec > 30.5) {
      Alert.alert("Too long", "Please select a video up to 30 seconds.");
      return null;
    }
    return asset;
  };

  const pickAndUploadVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need access to your library to pick a video.",
      );
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
      allowsMultipleSelection: false,
    });
    if (result.canceled) return null;
    const asset = result.assets?.[0];
    if (!asset) return null;

    const durSec = toSeconds(asset.duration);
    if (Number.isFinite(durSec) && durSec > 30.5) {
      Alert.alert("Too long", "Please select a video up to 30 seconds.");
      return null;
    }
    const { url, error } = await upload({ reactNativeAsset: asset });
    if (error || !url) {
      Alert.alert("Upload failed", error || "Could not upload video");
      return null;
    }
    return url;
  };

  // Record from camera and upload, returning the URL
  const recordAndUploadVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need access to your camera to record a video.",
      );
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
      videoMaxDuration: 30,
    });
    if (result.canceled) return null;
    const asset = result.assets?.[0];
    if (!asset) return null;

    const durSec = toSeconds(asset.duration);
    if (Number.isFinite(durSec) && durSec > 30.5) {
      Alert.alert("Too long", "Please record up to 30 seconds.");
      return null;
    }
    const { url, error } = await upload({ reactNativeAsset: asset });
    if (error || !url) {
      Alert.alert("Upload failed", error || "Could not upload video");
      return null;
    }
    return url;
  };

  // CHANGE: Profile video now records from camera only (no library prompt)
  const uploadProfileVideo = async (setFormData) => {
    try {
      setUpdatingProfileVideo(true);
      const url = await recordAndUploadVideo();
      if (!url) return;
      setFormData((p) => ({ ...p, profile_video_url: url }));
      Alert.alert("Profile video set", "Remember to Save Changes.");
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to set profile video");
    } finally {
      setUpdatingProfileVideo(false);
    }
  };

  return {
    uploading,
    updatingProfileVideo,
    pickAndUploadVideo,
    uploadProfileVideo,
    recordAndUploadVideo,
  };
}
