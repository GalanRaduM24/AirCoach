import { create } from 'zustand';
import { mockAirQualityData } from '../mockData/airQuality';
import { mockDevicesData } from '../mockData/devices';

interface AirQuality {
  location: string;
  latitude: number;
  longitude: number;
  aqi: number;
  aqiLevel: string;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  visibility: number;
  timestamp: Date;
  hourlyTrend?: Array<{ time: string; aqi: number }>;
}

interface Sensor {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  aqi: number;
  pm25: number;
  distance: string;
}

interface AppState {
  airQuality: AirQuality;
  sensors: Sensor[];
  hourlyTrend: Array<{ time: string; aqi: number }>;
  devices: any[];
  userLocation: string;
  updateDeviceStatus: (deviceId: number, newStatus: string) => void;
  updateDeviceToggle: (deviceId: number, isOn: boolean) => void;
  setUserLocation: (location: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  airQuality: mockAirQualityData.current,
  sensors: mockAirQualityData.sensors,
  hourlyTrend: mockAirQualityData.hourlyTrend,
  devices: mockDevicesData,
  userLocation: 'Bucharest, Romania',

  updateDeviceStatus: (deviceId, newStatus) =>
    set((state) => ({
      devices: state.devices.map((device) =>
        device.id === deviceId ? { ...device, status: newStatus } : device
      ),
    })),

  updateDeviceToggle: (deviceId, isOn) =>
    set((state) => ({
      devices: state.devices.map((device) =>
        device.id === deviceId ? { ...device, isOn } : device
      ),
    })),

  setUserLocation: (location) => set({ userLocation: location }),
}));
