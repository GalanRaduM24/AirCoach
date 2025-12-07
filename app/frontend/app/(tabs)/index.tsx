import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/appStore';
import { MapComponent } from '@/components/MapComponent';
import { MetricsComponent } from '@/components/MetricsComponent';
import * as Location from 'expo-location';
import { SwipeNavigator } from '@/components/SwipeNavigator';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const { airQuality, sensors, setAirQuality } = useAppStore();
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

  const backendBase = process.env.EXPO_PUBLIC_API_BASE_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

  const selectNearestSensor = () => {
    if (!sensors || sensors.length === 0) return null;
    if (!currentLocation) return sensors[0];
    const toRad = (v: number) => (v * Math.PI) / 180;
    const { latitude: lat1, longitude: lon1 } = currentLocation;

    let closest = sensors[0];
    let best = Number.MAX_VALUE;

    sensors.forEach((s) => {
      const dLat = toRad(s.latitude - lat1);
      const dLon = toRad(s.longitude - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(s.latitude)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const R = 6371; // km
      const dist = R * c;
      if (dist < best) {
        best = dist;
        closest = s;
      }
    });
    return closest;
  };

  const hydrateFromSensor = () => {
    const sensor = selectNearestSensor();
    if (!sensor) return;
    setAirQuality({
      aqi: sensor.aqi,
      pm25: sensor.pm25,
      // preserve other metrics from current state if unavailable
      latitude: sensor.latitude,
      longitude: sensor.longitude,
      location: `${sensor.name}`,
      timestamp: new Date(),
    });
  };

  useEffect(() => {
    const fetchAirQuality = async () => {
      if (!currentLocation) return;
      try {
        const res = await fetch(`${backendBase}/air-quality?lat=${currentLocation.latitude}&lon=${currentLocation.longitude}`);
        if (!res.ok) throw new Error(`AQ fetch failed ${res.status}`);
        const data = await res.json();

        setAirQuality({
          aqi: data.aqi,
          pm25: data.pm25,
          pm10: data.pm10,
          no2: data.no2,
          o3: data.o3,
          temperature: data.temperature,
          humidity: data.humidity,
          uvIndex: data.uvIndex,
          visibility: data.visibility,
          latitude: data.latitude ?? currentLocation.latitude,
          longitude: data.longitude ?? currentLocation.longitude,
          location: data.location ?? 'Current area',
          timestamp: new Date(),
        });
      } catch (err) {
        console.log('AQ API failed, falling back to nearest sensor', err);
        hydrateFromSensor();
      }
    };

    fetchAirQuality();
  }, [currentLocation]);

  const metricsSource = useMemo(() => airQuality, [airQuality]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.outer, { paddingTop: insets.top + 6 }]}>
        <View style={styles.innerCard}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                  aqi={metricsSource.aqi}
                  pm25={metricsSource.pm25}
                  pm10={metricsSource.pm10}
                  no2={metricsSource.no2}
                  o3={metricsSource.o3}
                  temperature={metricsSource.temperature}
                  humidity={metricsSource.humidity}
                  uvIndex={metricsSource.uvIndex}
                  visibility={metricsSource.visibility}
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
  },
  mapContainer: {
    height: height * 0.5,
    marginBottom: 12,
  },
  metricsContainer: {
    paddingBottom: 100,
  },
});
