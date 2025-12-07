export interface Device {
  id: number;
  name: string;
  type: 'window' | 'purifier' | 'uvLamp' | 'sensor';
  status: string;
  isOn: boolean;
  battery?: number;
  lastUpdate: Date;
  icon: string;
  controls: string[];
  autoMode: boolean;
  mode?: string;
  filterHealth?: number;
  intensity?: number;
  temperature?: number;
  humidity?: number;
  co2?: number;
}

export const mockDevicesData: Device[] = [
  {
    id: 1,
    name: 'Smart Window',
    type: 'window',
    status: 'closed',
    isOn: false,
    battery: 85,
    lastUpdate: new Date(Date.now() - 5 * 60000),
    icon: 'apps-outline',
    controls: ['open', 'close', 'auto'],
    autoMode: false,
  },
  {
    id: 2,
    name: 'Air Purifier',
    type: 'purifier',
    status: 'idle',
    isOn: true,
    mode: 'auto',
    filterHealth: 45,
    battery: 100,
    lastUpdate: new Date(Date.now() - 2 * 60000),
    icon: 'leaf-outline',
    controls: ['off', 'low', 'medium', 'high', 'auto'],
    autoMode: true,
  },
  {
    id: 3,
    name: 'UV Lamp',
    type: 'uvLamp',
    status: 'off',
    isOn: false,
    intensity: 0,
    battery: 92,
    lastUpdate: new Date(Date.now() - 10 * 60000),
    icon: 'sunny-outline',
    controls: ['off', 'low', 'medium', 'high'],
    autoMode: false,
  },
  {
    id: 4,
    name: 'Home Sensor',
    type: 'sensor',
    status: 'active',
    isOn: true,
    temperature: 21.5,
    humidity: 62,
    co2: 420,
    battery: 78,
    lastUpdate: new Date(Date.now() - 1 * 60000),
    icon: 'podium-outline',
    controls: [],
    autoMode: false,
  },
];

export const getDeviceStatusColor = (status: string): string => {
  const statusColors: { [key: string]: string } = {
    active: '#4CAF50',
    idle: '#FFC107',
    off: '#9E9E9E',
    closed: '#2196F3',
    open: '#FF9800',
    error: '#F44336',
  };
  return statusColors[status] || '#9E9E9E';
};
