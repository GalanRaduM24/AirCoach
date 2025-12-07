import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView from 'react-native-maps';

interface MapComponentProps {
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
}

export const MapComponent: React.FC<MapComponentProps> = ({
  currentLocation = {
    latitude: 44.4268,
    longitude: 26.1025,
  },
}) => {
  const mapRef = useRef<MapView | null>(null);

  const handleCenter = () => {
    if (!mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        followsUserLocation={true}
        showsMyLocationButton={false}
      >
      </MapView>

      <TouchableOpacity style={styles.centerButton} onPress={handleCenter} activeOpacity={0.85}>
        <Text style={styles.centerText}>⦿</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    position: 'relative' as any,
  },
  map: {
    flex: 1,
  },
  centerButton: {
    position: 'absolute' as any,
    right: 16,
    bottom: 18,
    width: 46,
    height: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  centerText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B7AFF',
  },
});
