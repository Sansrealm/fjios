import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";

export function CardFormFields({ formData, setFormData }) {
  const [locating, setLocating] = useState(false);

  const handleUseMyLocation = useCallback(async () => {
    try {
      setLocating(true);

      // First, show user-friendly explanation of benefits before system prompt
      Alert.alert(
        "Auto-fill Your Location",
        "Allow us to access your location to quickly set your city and state on your digital card. This makes it easier for others to connect with you locally and helps you network with founders in your area.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setLocating(false),
          },
          {
            text: "Continue",
            onPress: async () => {
              const { status } =
                await Location.requestForegroundPermissionsAsync();
              if (status !== "granted") {
                Alert.alert(
                  "Permission Required",
                  "Location access is needed to auto-fill your city and state. You can also fill this information manually if you prefer.",
                );
                setLocating(false);
                return;
              }

              try {
                const pos = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Balanced,
                });
                const places = await Location.reverseGeocodeAsync({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                });

                const first = places?.[0];
                if (first) {
                  const city = first.city || first.subregion || "";
                  const state = first.region || first.administrativeArea || "";
                  const country = first.country || "";
                  setFormData((p) => ({
                    ...p,
                    location_city: city,
                    location_state: state,
                    location_country: country,
                  }));
                } else {
                  Alert.alert(
                    "Location Not Found",
                    "Couldn't determine your location. You can fill it in manually.",
                  );
                }
              } catch (e) {
                console.error(e);
                Alert.alert(
                  "Error",
                  "Failed to detect your location. Please fill it in manually.",
                );
              } finally {
                setLocating(false);
              }
            },
          },
        ],
      );
    } catch (e) {
      console.error(e);
      Alert.alert(
        "Error",
        "Failed to access location services. Please fill it in manually.",
      );
      setLocating(false);
    }
  }, [setFormData]);

  return (
    <>
      {/* Name */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            color: "#8FAEA2",
            fontFamily: "Inter_500Medium",
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          Name *
        </Text>
        <TextInput
          value={formData.name}
          onChangeText={(t) => setFormData((p) => ({ ...p, name: t }))}
          placeholder="Your full name"
          placeholderTextColor="#7C7C7C"
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: "#FFF",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
          }}
        />
      </View>

      {/* Startup */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            color: "#8FAEA2",
            fontFamily: "Inter_500Medium",
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          Startup/Company Name
        </Text>
        <TextInput
          value={formData.startup_name}
          onChangeText={(t) => setFormData((p) => ({ ...p, startup_name: t }))}
          placeholder="Company"
          placeholderTextColor="#7C7C7C"
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: "#FFF",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
          }}
        />
      </View>

      {/* Website */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            color: "#8FAEA2",
            fontFamily: "Inter_500Medium",
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          Website
        </Text>
        <TextInput
          value={formData.startup_website}
          onChangeText={(t) =>
            setFormData((p) => ({ ...p, startup_website: t }))
          }
          placeholder="https://..."
          placeholderTextColor="#7C7C7C"
          autoCapitalize="none"
          keyboardType="url"
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: "#FFF",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
          }}
        />
      </View>

      {/* Role */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            color: "#8FAEA2",
            fontFamily: "Inter_500Medium",
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          Role
        </Text>
        <TextInput
          value={formData.role}
          onChangeText={(t) => setFormData((p) => ({ ...p, role: t }))}
          placeholder="Founder, CEO..."
          placeholderTextColor="#7C7C7C"
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: "#FFF",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
          }}
        />
      </View>

      {/* Description */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            color: "#8FAEA2",
            fontFamily: "Inter_500Medium",
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          Description ({formData.description?.length || 0}/124)
        </Text>
        <TextInput
          value={formData.description}
          onChangeText={(t) => {
            if (t.length <= 124) {
              setFormData((p) => ({ ...p, description: t }));
            }
          }}
          placeholder="Brief description"
          placeholderTextColor="#7C7C7C"
          multiline
          numberOfLines={3}
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: "#FFF",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            textAlignVertical: "top",
          }}
        />
      </View>

      {/* Location */}
      <View style={{ marginBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              color: "#8FAEA2",
              fontFamily: "Inter_500Medium",
              fontSize: 14,
            }}
          >
            Location
          </Text>
          <TouchableOpacity
            onPress={handleUseMyLocation}
            disabled={locating}
            style={{
              backgroundColor: "rgba(143,174,162,0.2)",
              borderColor: "#8FAEA2",
              borderWidth: 1,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#8FAEA2" />
            ) : (
              <Text
                style={{
                  color: "#8FAEA2",
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                }}
              >
                Use my location
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* City */}
        <TextInput
          value={formData.location_city}
          onChangeText={(t) => setFormData((p) => ({ ...p, location_city: t }))}
          placeholder="City"
          placeholderTextColor="#7C7C7C"
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: "#FFF",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            marginBottom: 10,
          }}
        />
        {/* State */}
        <TextInput
          value={formData.location_state}
          onChangeText={(t) =>
            setFormData((p) => ({ ...p, location_state: t }))
          }
          placeholder="State / Region"
          placeholderTextColor="#7C7C7C"
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: "#FFF",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
            marginBottom: 10,
          }}
        />
        {/* Country */}
        <TextInput
          value={formData.location_country}
          onChangeText={(t) =>
            setFormData((p) => ({ ...p, location_country: t }))
          }
          placeholder="Country"
          placeholderTextColor="#7C7C7C"
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: "#FFF",
            fontFamily: "Inter_400Regular",
            fontSize: 16,
          }}
        />
      </View>
    </>
  );
}
