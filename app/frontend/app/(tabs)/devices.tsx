import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Dimensions, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/appStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SwipeNavigator } from '@/components/SwipeNavigator';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

export default function DevicesScreen() {
  const { devices, updateDeviceToggle } = useAppStore();
  const insets = useSafeAreaInsets();

  const getDeviceGradient = (type: string, isOn: boolean): readonly [string, string, ...string[]] => {
    if (!isOn) return ['#EEF2F7', '#E5E7EB'] as const;
    
    const gradients: { [key: string]: readonly [string, string, ...string[]] } = {
      window: ['#8B5CF6', '#A78BFA'] as const,
      purifier: ['#10B981', '#34D399'] as const,
      uvLamp: ['#F59E0B', '#FBBF24'] as const,
      sensor: ['#3B82F6', '#60A5FA'] as const,
    };
    return gradients[type] || (['#8B5CF6', '#A78BFA'] as const);
  };

  const getIconName = (type: string) => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      window: 'apps-outline',
      purifier: 'leaf-outline',
      uvLamp: 'sunny-outline',
      sensor: 'podium-outline',
    };
    return icons[type] || 'cube-outline';
  };

  const DeviceCard = ({ device }: any) => {
    const isOn = device.isOn;
    const gradient = getDeviceGradient(device.type, isOn);
    const displayStatus = device.type === 'window'
      ? (isOn ? 'open' : 'closed')
      : (isOn ? device.status : 'Off');

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => updateDeviceToggle(device.id, !isOn)}
        activeOpacity={0.8}
      >
        <LinearGradient colors={gradient} style={styles.cardGradient}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name={getIconName(device.type)} size={20} color={isOn ? '#0F172A' : '#4B5563'} />
            </View>
            <View style={[styles.statusDot, isOn && styles.statusDotOn]} />
          </View>
          
          <View style={styles.cardContent}>
            <Text style={[styles.deviceName, !isOn && styles.textOff]}>{device.name}</Text>
            <Text style={[styles.deviceStatus, !isOn && styles.textOff]}>
              {displayStatus}
            </Text>
            
            {/* Extra info between status and battery */}
            {device.type === 'purifier' && device.filterHealth && isOn && (
              <Text style={styles.extraText}>Filter: {device.filterHealth}%</Text>
            )}

            {device.type === 'sensor' && isOn && (
              <View style={styles.sensorInfo}>
                <View style={styles.sensorPill}>
                  <Ionicons name="thermometer-outline" size={12} color="#0F172A" />
                  <Text style={styles.sensorText}>{device.temperature}°C</Text>
                </View>
                <View style={styles.sensorPill}>
                  <Ionicons name="water-outline" size={12} color="#0F172A" />
                  <Text style={styles.sensorText}>{device.humidity}%</Text>
                </View>
              </View>
            )}
          </View>

          {device.battery !== undefined && (
            <View style={styles.batteryRow}>
              <View style={styles.batteryPill}>
                <Ionicons name="battery-charging-outline" size={12} color={isOn ? '#0F172A' : '#4B5563'} />
                <View style={styles.batteryBarTrack}>
                  <LinearGradient
                    colors={['#22C55E', '#16A34A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.batteryBarFill, { width: `${Math.min(Math.max(device.battery, 0), 100)}%` }]}
                  />
                </View>
                <Text style={[styles.batteryText, !isOn && styles.textOff]}>{device.battery}%</Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const AddDeviceCard = () => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => console.log('Add new device')}
        activeOpacity={0.7}
      >
        <LinearGradient colors={['#8B5CF6', '#A78BFA']} style={styles.cardGradient}>
          <View style={styles.addCardContent}>
            <View style={styles.addIconCircle}>
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.addText}>Add Device</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SwipeNavigator currentRoute="devices">
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.outer, { paddingTop: insets.top + 6 }]}>
          <View style={styles.containerOuter}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <Text style={styles.subheading}>{devices.filter(d => d.isOn).length} active</Text>
              </View>

              <View style={styles.grid}>
                {devices.map((device) => (
                  <DeviceCard key={device.id} device={device} />
                ))}
                <AddDeviceCard />
              </View>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </SwipeNavigator>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0B0E',
  },
  outer: {
    flex: 1,
    backgroundColor: '#0B0B0E',
  },
  containerOuter: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#F6F7FB',
    padding: 18,
    paddingTop: 28,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 18,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: cardWidth,
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  cardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#475569',
  },
  statusDotOn: {
    backgroundColor: '#22C55E',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  deviceStatus: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: 6,
  },
  textOff: {
    color: '#4B5563',
  },
  batteryRow: {
    marginTop: 0,
  },
  batteryText: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
  },
  extraText: {
    fontSize: 10,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 4,
  },
  sensorInfo: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  sensorText: {
    fontSize: 10,
    color: '#0F172A',
    fontWeight: '700',
  },
  addCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  addIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  addText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  sensorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  batteryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 110,
  },
  batteryBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(15,23,42,0.12)',
    overflow: 'hidden',
  },
  batteryBarFill: {
    height: '100%',
    borderRadius: 6,
  },
});
