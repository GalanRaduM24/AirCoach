import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/appStore';
import { useUserProfileStore } from '@/store/userProfileStore';
import { MapComponent } from '@/components/MapComponent';
import { MetricsComponent } from '@/components/MetricsComponent';
import { PersonalizedAlertComponent } from '@/components/PersonalizedAlertComponent';
import * as Location from 'expo-location';
import { SwipeNavigator } from '@/components/SwipeNavigator';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const { airQuality, sensors } = useAppStore();
  const { profile } = useUserProfileStore();
  const insets = useSafeAreaInsets();
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.outer, { paddingTop: insets.top + 6 }]}>
        <View style={styles.innerCard}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Personalized Alert */}
            <View style={styles.alertContainer}>
              <PersonalizedAlertComponent
                aqi={airQuality.aqi}
                pm25={airQuality.pm25}
                pm10={airQuality.pm10}
                temperature={airQuality.temperature}
                humidity={airQuality.humidity}
                uvIndex={airQuality.uvIndex}
              />
            </View>

            {/* Map Section (no swipe) */}
            <View style={styles.mapContainer}>
              <MapComponent
                currentLocation={currentLocation || {
                  latitude: airQuality.latitude,
                  longitude: airQuality.longitude,
                }}
              />
            </View> 

            {/* Metrics Section with swipe navigation */}
            <SwipeNavigator currentRoute="index">
              <View style={styles.metricsContainer}>
                <MetricsComponent
                  aqi={airQuality.aqi}
                  pm25={airQuality.pm25}
                  pm10={airQuality.pm10}
                  no2={airQuality.no2}
                  o3={airQuality.o3}
                  temperature={airQuality.temperature}
                  humidity={airQuality.humidity}
                  uvIndex={airQuality.uvIndex}
                  visibility={airQuality.visibility}
                />
              </View>
            </SwipeNavigator>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0B0E',
  },
  outer: {
    flex: 1,
    backgroundColor: '#0B0B0E',
  },
  innerCard: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  alertContainer: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  mapContainer: {
    height: height * 0.5,
    marginBottom: 12,
  },
  metricsContainer: {
    paddingBottom: 24,
  },
});
