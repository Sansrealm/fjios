import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';

export function useLocationPicker(onLocationSelected) {
  const handleUseMyLocation = useCallback(async () => {
    try {
      Alert.alert(
        'Auto-fill Your Location',
        'Allow us to access your location to quickly set your city and state on your digital card. This makes it easier for others to connect with you locally and helps you network with founders in your area.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Continue',
            onPress: async () => {
              const { status } =
                await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(
                  'Permission Required',
                  'Location access is needed to auto-fill your city and state. You can also fill this information manually if you prefer.',
                );
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
                  const city = first.city || first.subregion || '';
                  const state = first.region || first.administrativeArea || '';
                  const country = first.country || '';
                  onLocationSelected(city, state, country);
                } else {
                  Alert.alert(
                    'Location Not Found',
                    "Couldn't determine your location. You can fill it in manually.",
                  );
                }
              } catch (e) {
                console.error(e);
                Alert.alert(
                  'Error',
                  'Failed to detect location. Please fill it manually.',
                );
              }
            },
          },
        ],
      );
    } catch (e) {
      console.error(e);
      Alert.alert(
        'Error',
        'Failed to access location services. Please fill it manually.',
      );
    }
  }, [onLocationSelected]);

  return { handleUseMyLocation };
}
