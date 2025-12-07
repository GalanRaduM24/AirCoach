/**
 * Map Layers Configuration
 * Customize colors, thresholds, and behavior
 */

export const MAP_CONFIG = {
  // Initial map region
  initialRegion: {
    latitude: 44.4268,
    longitude: 26.1025,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  },

  // Bucharest bounds for data queries
  bucharest: {
    north: 44.5149,
    south: 44.3383,
    east: 26.2244,
    west: 25.9456,
  },

  // Layer configurations
  layers: {
    pollution: {
      name: 'Air Quality',
      icon: '💨',
      enabled: true,
      heatmapRadius: 35,
      heatmapOpacity: 0.5,
      refreshInterval: 60000, // 1 minute
      aqiThresholds: {
        good: { max: 50, color: '#00E400' },
        moderate: { max: 100, color: '#FFFF00' },
        unhealthy_sensitive: { max: 150, color: '#FF7E00' },
        unhealthy: { max: 200, color: '#FF0000' },
        very_unhealthy: { max: 300, color: '#8F3F97' },
        hazardous: { max: 500, color: '#7E0023' },
      },
    },

    traffic: {
      name: 'Traffic',
      icon: '🚗',
      enabled: true,
      circleRadius: 500, // meters
      refreshInterval: 30000, // 30 seconds
      congestionLevels: {
        free: { min: 75, color: '#00FF00', label: 'Free Flow' },
        moderate: { min: 50, color: '#FFFF00', label: 'Moderate' },
        heavy: { min: 25, color: '#FF9900', label: 'Heavy' },
        blocked: { min: 0, color: '#FF0000', label: 'Blocked' },
      },
    },

    allergens: {
      name: 'Allergens',
      icon: '🌸',
      enabled: true,
      markerColor: '#FF6B9D',
      refreshInterval: 3600000, // 1 hour (daily data)
      pollenTypes: ['grass', 'ragweed', 'alder', 'birch', 'oak', 'elm'],
      healthRecommendations: {
        high: 'Avoid outdoor activities if sensitive',
        moderate: 'Wear mask for prolonged outdoor exposure',
        low: 'Safe for outdoor activities',
      },
    },
  },

  // API endpoints
  apis: {
    supabase: {
      url: 'https://aws-1-eu-west-1.pooler.supabase.com',
      timeout: 10000,
      retries: 3,
    },
    tomtom: {
      baseUrl: 'https://api.tomtom.com',
      timeout: 10000,
      retries: 3,
    },
    google: {
      baseUrl: 'https://airquality.googleapis.com',
      timeout: 10000,
      retries: 3,
    },
  },

  // UI Configuration
  ui: {
    layerPanelPosition: 'top-left' as const,
    centerButtonPosition: 'bottom-right' as const,
    animationDuration: 300, // ms
    pollutionGridResolution: 'high' as const, // high, medium, low
  },

  // Database
  database: {
    pollutionTable: 'pollution_data',
    locationsTable: 'pollution_locations',
    locationIdRange: { min: 2000, max: 2999 },
    maxResultsPerQuery: 1000,
  },

  // Performance
  performance: {
    enableLogging: true,
    enableMetrics: true,
    maxConcurrentRequests: 5,
    enableCaching: true,
    cacheDuration: 300000, // 5 minutes
  },
};

// Export helper functions
export function getAQILabel(aqi: number): string {
  const thresholds = MAP_CONFIG.layers.pollution.aqiThresholds;
  if (aqi <= thresholds.good.max) return 'Good';
  if (aqi <= thresholds.moderate.max) return 'Moderate';
  if (aqi <= thresholds.unhealthy_sensitive.max) return 'Unhealthy for Sensitive Groups';
  if (aqi <= thresholds.unhealthy.max) return 'Unhealthy';
  if (aqi <= thresholds.very_unhealthy.max) return 'Very Unhealthy';
  return 'Hazardous';
}

export function getAQIColor(aqi: number): string {
  const thresholds = MAP_CONFIG.layers.pollution.aqiThresholds;
  if (aqi <= thresholds.good.max) return thresholds.good.color;
  if (aqi <= thresholds.moderate.max) return thresholds.moderate.color;
  if (aqi <= thresholds.unhealthy_sensitive.max) return thresholds.unhealthy_sensitive.color;
  if (aqi <= thresholds.unhealthy.max) return thresholds.unhealthy.color;
  if (aqi <= thresholds.very_unhealthy.max) return thresholds.very_unhealthy.color;
  return thresholds.hazardous.color;
}

export function getTrafficLabel(speed: number, freeFlowSpeed: number): string {
  const percentage = (speed / freeFlowSpeed) * 100;
  const levels = MAP_CONFIG.layers.traffic.congestionLevels;

  if (percentage >= levels.free.min) return levels.free.label;
  if (percentage >= levels.moderate.min) return levels.moderate.label;
  if (percentage >= levels.heavy.min) return levels.heavy.label;
  return levels.blocked.label;
}

export function getTrafficColor(speed: number, freeFlowSpeed: number): string {
  const percentage = (speed / freeFlowSpeed) * 100;
  const levels = MAP_CONFIG.layers.traffic.congestionLevels;

  if (percentage >= levels.free.min) return levels.free.color;
  if (percentage >= levels.moderate.min) return levels.moderate.color;
  if (percentage >= levels.heavy.min) return levels.heavy.color;
  return levels.blocked.color;
}
