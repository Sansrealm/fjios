import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import KeyboardAvoidingAnimatedView from "@/components/KeyboardAvoidingAnimatedView";
import useAppFonts from "@/hooks/useAppFonts";
import { fetchWithAuth } from "@/utils/api";
import { useAuth } from "@/utils/auth/useAuth";

export default function EditCardScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fontsLoaded = useAppFonts();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const { data: cardData, isLoading } = useQuery({
    queryKey: ["card", id],
    queryFn: async () => {
      const res = await fetch(`/api/cards/${id}`);
      if (!res.ok) throw new Error("Failed to load card");
      return res.json();
    },
    enabled: !!id,
  });

  const initial = useMemo(() => ({
    name: cardData?.card?.name || "",
    startup_name: cardData?.card?.startup_name || "",
    startup_website: cardData?.card?.startup_website || "",
    role: cardData?.card?.role || "",
    description: cardData?.card?.description || "",
    profile_video_url: cardData?.card?.profile_video_url || "",
    industry_tag_ids: (cardData?.card?.industry_tags || []).map(t => t.id),
  }), [cardData]);

  const [formData, setFormData] = useState(initial);
  useEffect(() => setFormData(initial), [initial]);

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetchWithAuth(`/api/cards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to update" }));
        throw new Error(error.error || "Failed to update card");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["card", id]);
      queryClient.invalidateQueries(["cards"]);
      Alert.alert("Saved", "Your card was updated.", [
        { text: "View Card", onPress: () => router.replace(`/card/${id}`) },
      ]);
    },
    onError: (e) => {
      Alert.alert("Error", e.message);
    }
  });

  const handleSave = () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    if (formData.description && formData.description.length > 124) {
      Alert.alert("Error", "Description must be 124 characters or less");
      return;
    }
    updateMutation.mutate(formData);
  };

  if (!fontsLoaded) return null;
  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
        <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 20, textAlign: "center" }}>Sign in required</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
      <View style={{ flex: 1, backgroundColor: "#000", paddingTop: insets.top }}>
        <StatusBar style="light" />

        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(17,17,17,0.8)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 18 }}>Edit Card</Text>
          <View style={{ width: 44 }} />
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#8FAEA2" />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
            {/* Name */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: "#8FAEA2", fontFamily: "Inter_500Medium", fontSize: 14, marginBottom: 8 }}>Name *</Text>
              <TextInput value={formData.name} onChangeText={(t)=>setFormData(p=>({...p,name:t}))} placeholder="Your full name" placeholderTextColor="#7C7C7C" style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, color: "#FFF", fontFamily: "Inter_400Regular", fontSize: 16 }} />
            </View>

            {/* Startup */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: "#8FAEA2", fontFamily: "Inter_500Medium", fontSize: 14, marginBottom: 8 }}>Startup/Company Name</Text>
              <TextInput value={formData.startup_name} onChangeText={(t)=>setFormData(p=>({...p,startup_name:t}))} placeholder="Company" placeholderTextColor="#7C7C7C" style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, color: "#FFF", fontFamily: "Inter_400Regular", fontSize: 16 }} />
            </View>

            {/* Website */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: "#8FAEA2", fontFamily: "Inter_500Medium", fontSize: 14, marginBottom: 8 }}>Website</Text>
              <TextInput value={formData.startup_website} onChangeText={(t)=>setFormData(p=>({...p,startup_website:t}))} placeholder="https://..." placeholderTextColor="#7C7C7C" autoCapitalize="none" keyboardType="url" style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, color: "#FFF", fontFamily: "Inter_400Regular", fontSize: 16 }} />
            </View>

            {/* Role */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: "#8FAEA2", fontFamily: "Inter_500Medium", fontSize: 14, marginBottom: 8 }}>Role</Text>
              <TextInput value={formData.role} onChangeText={(t)=>setFormData(p=>({...p,role:t}))} placeholder="Founder, CEO..." placeholderTextColor="#7C7C7C" style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, color: "#FFF", fontFamily: "Inter_400Regular", fontSize: 16 }} />
            </View>

            {/* Description */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: "#8FAEA2", fontFamily: "Inter_500Medium", fontSize: 14, marginBottom: 8 }}>Description ({formData.description?.length||0}/124)</Text>
              <TextInput value={formData.description} onChangeText={(t)=>{ if(t.length<=124){ setFormData(p=>({...p,description:t})); } }} placeholder="Brief description" placeholderTextColor="#7C7C7C" multiline numberOfLines={3} style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, color: "#FFF", fontFamily: "Inter_400Regular", fontSize: 16, textAlignVertical: "top" }} />
            </View>

            {/* Save Button */}
            <TouchableOpacity onPress={handleSave} disabled={updateMutation.isPending} style={{ backgroundColor: "#8FAEA2", borderRadius: 12, paddingVertical: 16, alignItems: "center", opacity: updateMutation.isPending ? 0.7 : 1 }}>
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={{ color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingAnimatedView>
  );
}
