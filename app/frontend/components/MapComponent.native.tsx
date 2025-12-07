import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Modal } from 'react-native';
import MapView, { Heatmap, Circle, Marker, UrlTile } from 'react-native-maps';
import axios from 'axios';

interface MapComponentProps {
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
}

type LayerType = 'traffic' | 'pollution' | 'allergens' | 'none';

interface PollutionPoint {
  latitude: number;
  longitude: number;
  weight: number;
  aqi?: number;
  pm25?: number;
}

interface TrafficPoint {
  latitude: number;
  longitude: number;
  weight: number;
  congestion?: number;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  currentLocation = {
    latitude: 44.4268,
    longitude: 26.1025,
  },
}) => {
  const mapRef = useRef<MapView | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerType>('none');
  const [pollutionData, setPollutionData] = useState<PollutionPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  // TomTom API Key
  const TOMTOM_API_KEY = 'MkaeoV81lIwqS9UYWn2zEPhLlck5y3Ja';

  // Fetch pollution data from Supabase
  const fetchPollutionData = async () => {
    try {
      setLoading(true);
      // Query pollution data from your Supabase database
      const response = await axios.post(
        'https://aws-1-eu-west-1.pooler.supabase.com/rest/v1/rpc/get_latest_pollution',
        { bounds: { north: 44.515, south: 44.338, east: 26.224, west: 25.945 } },
        {
          headers: {
            'apikey': 'YOUR_SUPABASE_ANON_KEY', // Add to .env
            'Content-Type': 'application/json',
          },
        }
      );
      
      const points: PollutionPoint[] = response.data.map((item: any) => ({
        latitude: item.latitude,
        longitude: item.longitude,
        weight: Math.max(0, Math.min(1, item.european_aqi / 500)), // Normalize AQI
        aqi: item.european_aqi,
        pm25: item.pm2_5,
      }));
      
      setPollutionData(points);
    } catch (error) {
      console.log('Pollution data fetch - will use mock data for demo');
      // Use mock data for demonstration
      setPollutionData(generateMockPollutionData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockPollutionData = (): PollutionPoint[] => {
    const points = [];
    for (let i = 0; i < 50; i++) {
      points.push({
        latitude: currentLocation.latitude + (Math.random() - 0.5) * 0.1,
        longitude: currentLocation.longitude + (Math.random() - 0.5) * 0.1,
        weight: Math.random() * 0.8,
        aqi: Math.floor(Math.random() * 200) + 50,
        pm25: Math.random() * 80 + 10,
      });
    }
    return points;
  };

  useEffect(() => {
    if (activeLayer === 'pollution') {
      fetchPollutionData();
    }
  }, [activeLayer]);

  const handleCenter = () => {
    if (!mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  const toggleLayer = (layer: LayerType) => {
    setActiveLayer(activeLayer === layer ? 'none' : layer);
    setShowLayerPanel(false);
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
        {/* Pollution Heatmap Layer */}
        {activeLayer === 'pollution' && pollutionData.length > 0 && (
          <Heatmap
            points={pollutionData.map(p => ({
              latitude: p.latitude,
              longitude: p.longitude,
              weight: p.weight,
            }))}
            radius={35}
            opacity={0.5}
          />
        )}

        {/* Traffic Flow Tiles Layer - Vector tile visualization */}
        {activeLayer === 'traffic' && (
          <UrlTile
            urlTemplate={`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}&thickness=10`}
            maximumZ={20}
            minimumZ={0}
            flipY={false}
            tileSize={256}
          />
        )}

        {/* Allergen Layer - Show markers */}
        {activeLayer === 'allergens' &&
          generateMockPollutionData().map((point, index) => (
            <Marker
              key={`allergen-${index}`}
              coordinate={{ latitude: point.latitude, longitude: point.longitude }}
              title={`Pollen Level: ${Math.floor(Math.random() * 5)}/5`}
              description="Allergen hotspot"
              pinColor="#FF6B9D"
            />
          ))}
      </MapView>

      {/* Layer Toggle Buttons */}
      <View style={styles.layerPanel}>
        <TouchableOpacity
          style={[
            styles.layerButton,
            activeLayer === 'pollution' && styles.layerButtonActive,
          ]}
          onPress={() => toggleLayer('pollution')}
        >
          <Text style={[styles.layerButtonText, activeLayer === 'pollution' && styles.layerButtonTextActive]}>
            � Air Quality
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.layerButton,
            activeLayer === 'traffic' && styles.layerButtonActive,
          ]}
          onPress={() => toggleLayer('traffic')}
        >
          <Text style={[styles.layerButtonText, activeLayer === 'traffic' && styles.layerButtonTextActive]}>
            � Traffic
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.layerButton,
            activeLayer === 'allergens' && styles.layerButtonActive,
          ]}
          onPress={() => toggleLayer('allergens')}
        >
          <Text style={[styles.layerButtonText, activeLayer === 'allergens' && styles.layerButtonTextActive]}>
            🌸 Allergens
          </Text>
        </TouchableOpacity>
      </View>

      {/* Center Button */}
      <TouchableOpacity
        style={styles.centerButton}
        onPress={handleCenter}
        activeOpacity={0.85}
      >
        <Text style={styles.centerText}>⦿</Text>
      </TouchableOpacity>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      )}

      {/* Traffic Layer Legend */}
      {activeLayer === 'traffic' && (
        <View style={styles.trafficLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#00FF00' }]} />
            <Text style={styles.legendText}>Free Flow</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FFFF00' }]} />
            <Text style={styles.legendText}>Moderate</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF9900' }]} />
            <Text style={styles.legendText}>Heavy</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF0000' }]} />
            <Text style={styles.legendText}>Blocked</Text>
          </View>
        </View>
      )}
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
  layerPanel: {
    position: 'absolute' as any,
    left: 12,
    top: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    gap: 6,
  },
  layerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  layerButtonActive: {
    backgroundColor: '#0B7AFF',
    borderColor: '#0B7AFF',
  },
  layerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  layerButtonTextActive: {
    color: '#FFFFFF',
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
  loadingOverlay: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  trafficLegend: {
    position: 'absolute' as any,
    right: 12,
    top: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row' as any,
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
});
