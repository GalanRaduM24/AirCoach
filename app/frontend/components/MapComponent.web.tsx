import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

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
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${currentLocation.longitude - 0.05},${currentLocation.latitude - 0.05},${currentLocation.longitude + 0.05},${currentLocation.latitude + 0.05}&layer=mapnik&marker=${currentLocation.latitude},${currentLocation.longitude}`;

  return (
    <View style={styles.container}>
      <View style={styles.leafletContainer}>
        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 'none', borderRadius: 12 }}
          allowFullScreen
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  leafletContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
