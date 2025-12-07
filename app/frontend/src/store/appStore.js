import { create } from 'zustand';
import { mockAirQualityData } from '../mockData/airQuality';
import { mockDevicesData } from '../mockData/devices';

export const useAppStore = create((set) => ({
  // Air Quality State
  airQuality: mockAirQualityData.current,
  sensors: mockAirQualityData.sensors,
  hourlyTrend: mockAirQualityData.hourlyTrend,

  // Devices State
  devices: mockDevicesData,
  
  // Update device status
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

  // Settings
  userLocation: 'Bucharest, Romania',
  setUserLocation: (location) => set({ userLocation: location }),
}));
