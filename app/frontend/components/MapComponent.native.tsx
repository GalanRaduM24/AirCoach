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

type LayerType = 
  | 'traffic' 
  | 'aqi' 
  | 'pm25' 
  | 'pm10' 
  | 'no2' 
  | 'o3' 
  | 'so2' 
  | 'co'
  | 'tree_pollen' 
  | 'grass_pollen'
  | 'none';

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

  // API Keys from environment (fallback for dev)
  const TOMTOM_API_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY;
  const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_AIR_QUALITY_API_KEY;

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
        {/* Traffic Flow Tiles Layer - Vector tile visualization */}
        {activeLayer === 'traffic' && (
          <UrlTile
            urlTemplate={`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}&thickness=10`}
            maximumZ={20}
            minimumZ={0}
            flipY={false}
            tileSize={256}
            opacity={0.75}
          />
        )}

        {/* Overall AQI */}
        {activeLayer === 'aqi' && (
          <UrlTile
            urlTemplate={`https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles/{z}/{x}/{y}?key=${GOOGLE_API_KEY}`}
            maximumZ={16}
            minimumZ={0}
            flipY={false}
            tileSize={256}
            opacity={0.6}
          />
        )}

        {/* PM2.5 - Fine Particulate Matter */}
        {activeLayer === 'pm25' && (
          <UrlTile
            urlTemplate={`https://airquality.googleapis.com/v1/mapTypes/US_AQI/heatmapTiles/{z}/{x}/{y}?key=${GOOGLE_API_KEY}`}
            maximumZ={16}
            minimumZ={0}
            flipY={false}
            tileSize={256}
            opacity={0.6}
          />
        )}

        {/* PM10 - Coarse Particulate Matter */}
        {activeLayer === 'pm10' && (
          <UrlTile
            urlTemplate={`https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles/{z}/{x}/{y}?key=${GOOGLE_API_KEY}`}
            maximumZ={16}
            minimumZ={0}
            flipY={false}
            tileSize={256}
            opacity={0.6}
          />
        )}

        {/* NO2 - Nitrogen Dioxide */}
        {activeLayer === 'no2' && (
          <UrlTile
            urlTemplate={`https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles/{z}/{x}/{y}?key=${GOOGLE_API_KEY}`}
            maximumZ={16}
            minimumZ={0}
            flipY={false}
            tileSize={256}
            opacity={0.6}
          />
        )}

        {/* O3 - Ozone */}
        {activeLayer === 'o3' && (
          <UrlTile
            urlTemplate={`https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles/{z}/{x}/{y}?key=${GOOGLE_API_KEY}`}
            maximumZ={16}
            minimumZ={0}
            flipY={false}
            tileSize={256}
            opacity={0.6}
          />
        )}

        {/* SO2 - Sulphur Dioxide */}
        {activeLayer === 'so2' && (
          <UrlTile
            urlTemplate={`https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles/{z}/{x}/{y}?key=${GOOGLE_API_KEY}`}
            maximumZ={16}
            minimumZ={0}
            flipY={false}
            tileSize={256}
            opacity={0.6}
          />
        )}

        {/* CO - Carbon Monoxide */}
        {activeLayer === 'co' && (
          <UrlTile
            urlTemplate={`https://airquality.googleapis.com/v1/mapTypes/UAQI_RED_GREEN/heatmapTiles/{z}/{x}/{y}?key=${GOOGLE_API_KEY}`}
            maximumZ={16}
            minimumZ={0}
            flipY={false}
            tileSize={256}
            opacity={0.6}
          />
        )}

        {/* Tree Pollen */}
        {activeLayer === 'tree_pollen' && (
          <UrlTile
            urlTemplate={`https://pollen.googleapis.com/v1/mapTypes/TREE_UPI/heatmapTiles/{z}/{x}/{y}?key=${GOOGLE_API_KEY}`}
            maximumZ={16}
            minimumZ={0}
            flipY={false}
            tileSize={256}
            opacity={0.6}
          />
        )}

        {/* Grass Pollen */}
        {activeLayer === 'grass_pollen' && (
          <UrlTile
            urlTemplate={`https://pollen.googleapis.com/v1/mapTypes/GRASS_UPI/heatmapTiles/{z}/{x}/{y}?key=${GOOGLE_API_KEY}`}
            maximumZ={16}
            minimumZ={0}
            flipY={false}
            tileSize={256}
            opacity={0.6}
          />
        )}

      </MapView>

      {/* Layer Toggle Row */}
      <ScrollView
        horizontal
        style={styles.layerPanel}
        contentContainerStyle={styles.layerPanelContent}
        showsHorizontalScrollIndicator
        nestedScrollEnabled
      >
        <TouchableOpacity
          style={[styles.layerButton, activeLayer === 'traffic' && styles.layerButtonActive]}
          onPress={() => toggleLayer('traffic')}
        >
          <Text style={[styles.layerButtonText, activeLayer === 'traffic' && styles.layerButtonTextActive]}>🚗</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.layerButton, activeLayer === 'aqi' && styles.layerButtonActive]}
          onPress={() => toggleLayer('aqi')}
        >
          <Text style={[styles.layerButtonText, activeLayer === 'aqi' && styles.layerButtonTextActive]}>📊 AQI</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.layerButton, activeLayer === 'pm25' && styles.layerButtonActive]}
          onPress={() => toggleLayer('pm25')}
        >
          <Text style={[styles.layerButtonText, activeLayer === 'pm25' && styles.layerButtonTextActive]}>PM2.5</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.layerButton, activeLayer === 'pm10' && styles.layerButtonActive]}
          onPress={() => toggleLayer('pm10')}
        >
          <Text style={[styles.layerButtonText, activeLayer === 'pm10' && styles.layerButtonTextActive]}>PM10</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.layerButton, activeLayer === 'no2' && styles.layerButtonActive]}
          onPress={() => toggleLayer('no2')}
        >
          <Text style={[styles.layerButtonText, activeLayer === 'no2' && styles.layerButtonTextActive]}>NO₂</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.layerButton, activeLayer === 'o3' && styles.layerButtonActive]}
          onPress={() => toggleLayer('o3')}
        >
          <Text style={[styles.layerButtonText, activeLayer === 'o3' && styles.layerButtonTextActive]}>O₃</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.layerButton, activeLayer === 'so2' && styles.layerButtonActive]}
          onPress={() => toggleLayer('so2')}
        >
          <Text style={[styles.layerButtonText, activeLayer === 'so2' && styles.layerButtonTextActive]}>SO₂</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.layerButton, activeLayer === 'co' && styles.layerButtonActive]}
          onPress={() => toggleLayer('co')}
        >
          <Text style={[styles.layerButtonText, activeLayer === 'co' && styles.layerButtonTextActive]}>CO</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.layerButton, activeLayer === 'tree_pollen' && styles.layerButtonActive]}
          onPress={() => toggleLayer('tree_pollen')}
        >
          <Text style={[styles.layerButtonText, activeLayer === 'tree_pollen' && styles.layerButtonTextActive]}>🌳</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.layerButton, activeLayer === 'grass_pollen' && styles.layerButtonActive]}
          onPress={() => toggleLayer('grass_pollen')}
        >
          <Text style={[styles.layerButtonText, activeLayer === 'grass_pollen' && styles.layerButtonTextActive]}>🌾</Text>
        </TouchableOpacity>
        
      </ScrollView>

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
    left: 0,
    right: 0,
    top: 12,
    paddingHorizontal: 10,
    maxHeight: 70,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  layerPanelContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row' as any,
    alignItems: 'center',
    gap: 6,
  },
  layerButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  layerLegend: {
    position: 'absolute' as any,
    right: 12,
    top: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    gap: 8,
    minWidth: 160,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  legendItem: {
    flexDirection: 'row' as any,
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  legendText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
});
