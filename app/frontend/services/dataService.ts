import axios from 'axios';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://aws-1-eu-west-1.pooler.supabase.com';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const TOMTOM_API_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY || '';
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_AIR_QUALITY_API_KEY || '';

export interface PollutionData {
  latitude: number;
  longitude: number;
  aqi: number;
  pm25: number;
  pm10: number;
  co: number;
  no2: number;
  o3: number;
  so2: number;
  measured_at: string;
}

export interface TrafficData {
  latitude: number;
  longitude: number;
  speed: number;
  freeFlowSpeed: number;
  congestion: number;
}

export interface AllergenData {
  latitude: number;
  longitude: number;
  pollen_type: string;
  level: number; // 0-5
  plant_name: string;
}

/**
 * Fetch latest pollution data from Supabase
 */
export async function fetchPollutionData(
  bounds: { north: number; south: number; east: number; west: number }
): Promise<PollutionData[]> {
  try {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/pollution_data`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        params: {
          select: 'location_id,latitude,longitude,european_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide,measured_at',
          'location_id.gte': 2000,
          'location_id.lte': 2999,
          order: 'measured_at.desc',
          limit: 1000,
        },
      }
    );

    return response.data.map((item: any) => ({
      latitude: item.latitude,
      longitude: item.longitude,
      aqi: item.european_aqi,
      pm25: item.pm2_5,
      pm10: item.pm10,
      co: item.carbon_monoxide,
      no2: item.nitrogen_dioxide,
      o3: item.ozone,
      so2: item.sulphur_dioxide,
      measured_at: item.measured_at,
    }));
  } catch (error) {
    console.error('Error fetching pollution data:', error);
    throw error;
  }
}

/**
 * Fetch traffic data from TomTom API
 */
export async function fetchTrafficData(
  latitude: number,
  longitude: number,
  zoom: number = 11
): Promise<TrafficData[]> {
  try {
    const response = await axios.get(
      'https://api.tomtom.com/traffic/services/4/flowSegmentData/json',
      {
        params: {
          key: TOMTOM_API_KEY,
          point: `${latitude},${longitude}`,
          zoom,
        },
      }
    );

    return response.data.flowSegmentData.map((segment: any) => ({
      latitude: segment.coordinates[0][1],
      longitude: segment.coordinates[0][0],
      speed: segment.currentSpeed,
      freeFlowSpeed: segment.freeFlowSpeed,
      congestion: Math.round((segment.currentSpeed / segment.freeFlowSpeed) * 100),
    }));
  } catch (error) {
    console.error('Error fetching traffic data:', error);
    throw error;
  }
}

/**
 * Fetch allergen/pollen data from Supabase or mock data
 */
export async function fetchAllergenData(
  bounds: { north: number; south: number; east: number; west: number }
): Promise<AllergenData[]> {
  try {
    // First try to fetch from Supabase if pollen data is available
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/pollution_data`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        params: {
          select: 'location_id,latitude,longitude,grass_pollen,ragweed_pollen,alder_pollen,birch_pollen',
          'location_id.gte': 2000,
          'location_id.lte': 2999,
          limit: 100,
        },
      }
    );

    return response.data
      .filter((item: any) => item.grass_pollen || item.ragweed_pollen || item.alder_pollen || item.birch_pollen)
      .map((item: any) => ({
        latitude: item.latitude,
        longitude: item.longitude,
        pollen_type: 'mixed',
        level: Math.ceil(
          (item.grass_pollen || 0 + item.ragweed_pollen || 0 + item.alder_pollen || 0 + item.birch_pollen || 0) / 4
        ),
        plant_name: 'Various plants',
      }));
  } catch (error) {
    console.error('Error fetching allergen data:', error);
    // Return empty array if pollen data not available
    return [];
  }
}

/**
 * Calculate AQI color based on value
 */
export function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#00E400'; // Good - Green
  if (aqi <= 100) return '#FFFF00'; // Moderate - Yellow
  if (aqi <= 150) return '#FF7E00'; // Unhealthy for Sensitive Groups - Orange
  if (aqi <= 200) return '#FF0000'; // Unhealthy - Red
  if (aqi <= 300) return '#8F3F97'; // Very Unhealthy - Purple
  return '#7E0023'; // Hazardous - Dark Red
}

/**
 * Get traffic color based on congestion
 */
export function getTrafficColor(congestion: number): string {
  if (congestion >= 75) return '#00FF00'; // Free flow - Green
  if (congestion >= 50) return '#FFFF00'; // Moderate - Yellow
  if (congestion >= 25) return '#FF9900'; // Heavy - Orange
  return '#FF0000'; // Blocked - Red
}
