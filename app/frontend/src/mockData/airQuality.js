export const mockAirQualityData = {
  current: {
    location: 'Bucharest, Romania',
    latitude: 44.4268,
    longitude: 26.1025,
    aqi: 65,
    aqiLevel: 'Moderate', // Good (0-50), Moderate (51-100), Unhealthy for Sensitive (101-150), Unhealthy (151-200), Very Unhealthy (201-300), Hazardous (301+)
    pm25: 35,
    pm10: 55,
    no2: 28,
    o3: 45,
    temperature: 18,
    humidity: 65,
    windSpeed: 12,
    uvIndex: 2,
    visibility: 10,
    timestamp: new Date(),
  },
  sensors: [
    {
      id: 1,
      name: 'Dorobanți',
      latitude: 44.4412,
      longitude: 26.0939,
      aqi: 58,
      pm25: 32,
      distance: '1.2 km',
    },
    {
      id: 2,
      name: 'Cotroceni',
      latitude: 44.3956,
      longitude: 26.0686,
      aqi: 72,
      pm25: 42,
      distance: '3.5 km',
    },
    {
      id: 3,
      name: 'Vaslui',
      latitude: 44.4235,
      longitude: 26.1142,
      aqi: 61,
      pm25: 36,
      distance: '0.8 km',
    },
    {
      id: 4,
      name: 'Floreasca',
      latitude: 44.4680,
      longitude: 26.1000,
      aqi: 54,
      pm25: 30,
      distance: '4.2 km',
    },
  ],
  hourlyTrend: [
    { time: '00:00', aqi: 55 },
    { time: '04:00', aqi: 52 },
    { time: '08:00', aqi: 62 },
    { time: '12:00', aqi: 70 },
    { time: '16:00', aqi: 68 },
    { time: '20:00', aqi: 65 },
  ],
};

export const getAQIColor = (aqi) => {
  if (aqi <= 50) return '#4CAF50'; // Green - Good
  if (aqi <= 100) return '#FFC107'; // Yellow - Moderate
  if (aqi <= 150) return '#FF9800'; // Orange - Unhealthy for Sensitive
  if (aqi <= 200) return '#F44336'; // Red - Unhealthy
  if (aqi <= 300) return '#9C27B0'; // Purple - Very Unhealthy
  return '#4A148C'; // Dark Purple - Hazardous
};

export const getAQILabel = (aqi) => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};
