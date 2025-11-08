import { useState } from "react";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { fetchWithAuth } from "@/utils/api";
import {
  updateMilestone,
  checkMilestone,
  MILESTONES,
} from "@/utils/milestones";
import useUser from "@/utils/auth/useUser";
import { useVideoUpload } from "@/hooks/useVideoUpload";

export function useCameraRecording(cardId) {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const { recordAndUploadVideo } = useVideoUpload();
  const [addingAsk, setAddingAsk] = useState(false);

  // Simplified: use native camera (recordAndUploadVideo) and then call auto-transcription API
  const handleRecordAsk = async () => {
    setAddingAsk(true);
    try {
      // Launch native camera (with front/back + retake) and upload; returns URL or null if cancelled
      const videoUrl = await recordAndUploadVideo();
      if (!videoUrl) {
        setAddingAsk(false);
        return; // user cancelled or upload failed (alert already shown inside)
      }

      const res = await fetchWithAuth(`/api/cards/${cardId}/asks/auto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_url: videoUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create ask");

      // Milestone: first ask
      if (user?.id) {
        try {
          const alreadyCompleted = await checkMilestone(
            user.id,
            MILESTONES.FIRST_ASK,
          );
          if (!alreadyCompleted) {
            await updateMilestone(user.id, MILESTONES.FIRST_ASK);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        } catch (error) {
          console.error("Error handling first ask milestone:", error);
        }
      }

      queryClient.invalidateQueries(["card", cardId]);
      Alert.alert("Added", "Your ask was added.");
    } catch (e) {
      Alert.alert("Error", e.message || "Could not add ask");
      console.error(e);
    } finally {
      setAddingAsk(false);
    }
  };

  return {
    addingAsk,
    handleRecordAsk,
  };
}
