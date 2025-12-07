import React from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useAppStore } from '../store/appStore';
import { getAQIColor, getAQILabel } from '../mockData/airQuality';
import { getDeviceStatusColor } from '../mockData/devices';

const { width } = Dimensions.get('window');

export const HomeScreen = ({ navigation }) => {
  const { airQuality, devices } = useAppStore();
  const aqiColor = getAQIColor(airQuality.aqi);
  const aqiLabel = getAQILabel(airQuality.aqi);

  const getDeviceIcon = (type) => {
    const icons = {
      window: '🪟',
      purifier: '💨',
      uvLamp: '☀️',
      sensor: '📊',
    };
    return icons[type] || '⚙️';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>AirCoach</Text>
        <Text style={styles.location}>{airQuality.location}</Text>
      </View>

      {/* Main AQI Card */}
      <TouchableOpacity
        style={[styles.aqiCard, { backgroundColor: aqiColor + '20' }]}
        onPress={() => navigation.navigate('Map')}
        activeOpacity={0.7}
      >
        <View style={styles.aqiContent}>
          <Text style={styles.aqiLabel}>Air Quality Index</Text>
          <View style={styles.aqiValueContainer}>
            <Text style={[styles.aqiValue, { color: aqiColor }]}>
              {airQuality.aqi}
            </Text>
            <View style={[styles.aqiBadge, { backgroundColor: aqiColor }]}>
              <Text style={styles.aqiBadgeText}>{aqiLabel}</Text>
            </View>
          </View>
          <Text style={styles.aqiDescription}>
            Tap to explore the air quality map
          </Text>
        </View>
      </TouchableOpacity>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💨</Text>
          <Text style={styles.statLabel}>PM2.5</Text>
          <Text style={styles.statValue}>{airQuality.pm25}</Text>
          <Text style={styles.statUnit}>µg/m³</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🌡️</Text>
          <Text style={styles.statLabel}>Temp</Text>
          <Text style={styles.statValue}>{airQuality.temperature}°</Text>
          <Text style={styles.statUnit}>C</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💧</Text>
          <Text style={styles.statLabel}>Humidity</Text>
          <Text style={styles.statValue}>{airQuality.humidity}%</Text>
          <Text style={styles.statUnit}>RH</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>☀️</Text>
          <Text style={styles.statLabel}>UV Index</Text>
          <Text style={styles.statValue}>{airQuality.uvIndex}</Text>
          <Text style={styles.statUnit}>Low</Text>
        </View>
      </View>

      {/* Agent Advice Section */}
      <TouchableOpacity
        style={styles.agentSection}
        onPress={() => navigation.navigate('Agent')}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🤖 Health Advice</Text>
          <Text style={styles.seeAll}>See all →</Text>
        </View>
        <View style={styles.adviceCard}>
          <Text style={styles.adviceTitle}>Window Opening Recommendation</Text>
          <Text style={styles.adviceText} numberOfLines={2}>
            Current AQI is 65 (Moderate). Windows are safe to open for 10-15
            minutes in the morning or evening.
          </Text>
        </View>
      </TouchableOpacity>

      {/* Smart Devices Section */}
      <View style={styles.devicesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏠 Smart Devices</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Devices')}>
            <Text style={styles.seeAll}>Manage →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.devicesList}
        >
          {devices.map((device) => (
            <View key={device.id} style={styles.deviceItem}>
              <View
                style={[
                  styles.deviceIconBox,
                  {
                    backgroundColor: getDeviceStatusColor(device.status) + '20',
                  },
                ]}
              >
                <Text style={styles.deviceIcon}>{getDeviceIcon(device.type)}</Text>
              </View>
              <Text style={styles.deviceName}>{device.name}</Text>
              <Text
                style={[
                  styles.deviceStatus,
                  { color: getDeviceStatusColor(device.status) },
                ]}
              >
                {device.status}
              </Text>
              {device.battery && (
                <Text style={styles.deviceBattery}>🔋 {device.battery}%</Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Recent Trend */}
      <View style={styles.trendSection}>
        <Text style={styles.sectionTitle}>📈 Today's AQI Trend</Text>
        <View style={styles.trendChart}>
          {airQuality.hourlyTrend && airQuality.hourlyTrend.map((point, index) => (
            <View key={index} style={styles.trendItem}>
              <View
                style={[
                  styles.trendBar,
                  {
                    height: (point.aqi / 100) * 80,
                    backgroundColor: getAQIColor(point.aqi),
                  },
                ]}
              />
              <Text style={styles.trendTime}>{point.time}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  aqiCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  aqiContent: {
    alignItems: 'center',
  },
  aqiLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  aqiValueContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  aqiValue: {
    fontSize: 56,
    fontWeight: '700',
    marginBottom: 8,
  },
  aqiBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  aqiBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  aqiDescription: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statUnit: {
    fontSize: 11,
    color: '#ccc',
    marginTop: 2,
  },
  agentSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  seeAll: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  adviceCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  adviceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  adviceText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  devicesSection: {
    marginBottom: 20,
  },
  devicesList: {
    paddingHorizontal: 16,
  },
  deviceItem: {
    width: 90,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  deviceIconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceIcon: {
    fontSize: 24,
  },
  deviceName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  deviceStatus: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  deviceBattery: {
    fontSize: 9,
    color: '#999',
  },
  trendSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    height: 140,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  trendItem: {
    alignItems: 'center',
    flex: 1,
  },
  trendBar: {
    width: '60%',
    borderRadius: 4,
    marginBottom: 8,
  },
  trendTime: {
    fontSize: 10,
    color: '#999',
  },
  spacer: {
    height: 40,
  },
});
