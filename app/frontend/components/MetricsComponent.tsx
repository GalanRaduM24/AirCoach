import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PersonalizedAlertComponent } from './PersonalizedAlertComponent';

interface MetricsComponentProps {
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  temperature: number;
  humidity: number;
  uvIndex: number;
  visibility: number;
}

const METRIC_INFO: Record<string, { title: string; description: string; ranges: string }> = {
  pm25: {
    title: 'PM2.5 (Fine Particles)',
    description: 'Fine particulate matter less than 2.5 micrometers in diameter. Can penetrate deep into the lungs and enter the bloodstream.',
    ranges: 'Good: 0-12 | Moderate: 12-35 | Unhealthy: >35',
  },
  pm10: {
    title: 'PM10 (Coarse Particles)',
    description: 'Inhalable particulate matter less than 10 micrometers in diameter. Can irritate eyes, nose, and throat.',
    ranges: 'Good: 0-54 | Moderate: 54-154 | Unhealthy: >154',
  },
  no2: {
    title: 'Nitrogen Dioxide (NO₂)',
    description: 'A gas from burning fuel. Irritates airways and can aggravate respiratory diseases like asthma.',
    ranges: 'Good: 0-53 | Moderate: 53-100 | Unhealthy: >100',
  },
  o3: {
    title: 'Ozone (O₃)',
    description: 'Ground-level ozone is a harmful air pollutant created by chemical reactions between oxides of nitrogen and volatile organic compounds.',
    ranges: 'Good: 0-70 | Moderate: 70-120 | Unhealthy: >120',
  },
  temperature: {
    title: 'Temperature',
    description: 'Current air temperature.',
    ranges: 'Comfortable: 18-26°C',
  },
  humidity: {
    title: 'Humidity',
    description: 'The amount of water vapor in the air. High humidity can make it feel hotter, while low humidity can dry out skin and airways.',
    ranges: 'Comfortable: 40-60%',
  },
  uvIndex: {
    title: 'UV Index',
    description: 'Measure of the strength of sunburn-producing ultraviolet radiation.',
    ranges: 'Low: 0-2 | Moderate: 3-5 | High: 6-7 | Very High: 8-10',
  },
  visibility: {
    title: 'Visibility',
    description: 'The distance one can clearly see. Reduced by pollution, fog, or haze.',
    ranges: 'Good: >10km',
  },
};

export const MetricsComponent: React.FC<MetricsComponentProps> = ({
  aqi,
  pm25,
  pm10,
  no2,
  o3,
  temperature,
  humidity,
  uvIndex,
  visibility,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const scaleColor = (value: number, ranges: Array<{ max: number; color: string }>, fallback = '#6B7280') => {
    for (const r of ranges) {
      if (value <= r.max) return r.color;
    }
    return fallback;
  };

  const getMetricColor = (metric: string, value: number) => {
    switch (metric) {
      case 'pm25':
        return scaleColor(value, [
          { max: 12, color: '#22C55E' },
          { max: 35, color: '#F59E0B' },
          { max: 55, color: '#EF4444' },
        ], '#7C3AED');
      case 'pm10':
        return scaleColor(value, [
          { max: 54, color: '#22C55E' },
          { max: 154, color: '#F59E0B' },
          { max: 254, color: '#EF4444' },
        ], '#7C3AED');
      case 'no2':
        return scaleColor(value, [
          { max: 53, color: '#22C55E' },
          { max: 100, color: '#F59E0B' },
          { max: 360, color: '#EF4444' },
        ], '#7C3AED');
      case 'o3':
        return scaleColor(value, [
          { max: 70, color: '#22C55E' },
          { max: 120, color: '#F59E0B' },
          { max: 200, color: '#EF4444' },
        ], '#7C3AED');
      case 'temperature':
        if (value >= 18 && value <= 26) return '#22C55E';
        if (value >= 10 && value < 18) return '#F59E0B';
        if (value > 26 && value <= 32) return '#F59E0B';
        return '#EF4444';
      case 'humidity':
        if (value >= 40 && value <= 60) return '#22C55E';
        if ((value >= 30 && value < 40) || (value > 60 && value <= 70)) return '#F59E0B';
        return '#EF4444';
      case 'uvIndex':
        return scaleColor(value, [
          { max: 2, color: '#22C55E' },
          { max: 5, color: '#F59E0B' },
          { max: 7, color: '#F97316' },
          { max: 10, color: '#EF4444' },
        ], '#7C3AED');
      case 'visibility':
        return scaleColor(value, [
          { max: 2, color: '#EF4444' },
          { max: 6, color: '#F59E0B' },
          { max: 10, color: '#22C55E' },
        ], '#22C55E');
      default:
        return '#6B7280';
    }
  };

  const getAQIColor = (value: number) => {
    if (value <= 50) return '#4CAF50';
    if (value <= 100) return '#FFC107';
    if (value <= 150) return '#FF9800';
    if (value <= 200) return '#F44336';
    if (value <= 300) return '#9C27B0';
    return '#4A148C';
  };

  const getAQILabel = (value: number) => {
    if (value <= 50) return 'Good';
    if (value <= 100) return 'Moderate';
    if (value <= 150) return 'Unhealthy for Sensitive';
    if (value <= 200) return 'Unhealthy';
    if (value <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  const MetricCard = ({ iconName, label, value, unit, metricKey }: { iconName: keyof typeof Ionicons.glyphMap; label: string; value: any; unit: string; metricKey: string }) => {
    const color = getMetricColor(metricKey, Number(value));
    return (
      <TouchableOpacity 
        style={styles.metricCard} 
        onPress={() => setSelectedMetric(metricKey)}
        activeOpacity={0.7}
      >
        <View style={[styles.metricIconCircle, { backgroundColor: `${color}22` }]}>
          <Ionicons name={iconName} size={18} color={color} />
        </View>
        <View style={styles.metricTextBlock}>
          <Text style={styles.metricLabel}>{label}</Text>
          <Text style={styles.metricValue}>{value}<Text style={styles.metricUnit}> {unit}</Text></Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Main AQI Summary */}
      <View style={[styles.aqiSummary, { borderColor: getAQIColor(aqi) + '44' }]}>
        <Text style={styles.aqiLabel}>Air Quality Index</Text>
        <Text style={[styles.aqiValue, { color: getAQIColor(aqi) }]}>{aqi}</Text>
        <View style={[styles.aqiBadge, { backgroundColor: getAQIColor(aqi) }]}>
          <Text style={styles.aqiBadgeText}>{getAQILabel(aqi)}</Text>
        </View>
      </View>

      {/* Personalized safety metric directly below AQI */}
      <View style={styles.alertWrapper}>
        <PersonalizedAlertComponent
          aqi={aqi}
          pm25={pm25}
          pm10={pm10}
          temperature={temperature}
          humidity={humidity}
          uvIndex={uvIndex}
        />
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard iconName="leaf-outline" label="PM2.5" value={pm25} unit="µg/m³" metricKey="pm25" />
        <MetricCard iconName="cloud-outline" label="PM10" value={pm10} unit="µg/m³" metricKey="pm10" />
        <MetricCard iconName="flask-outline" label="NO₂" value={no2} unit="ppb" metricKey="no2" />
        <MetricCard iconName="flash-outline" label="O₃" value={o3} unit="ppb" metricKey="o3" />
        <MetricCard iconName="thermometer-outline" label="Temp" value={temperature} unit="°C" metricKey="temperature" />
        <MetricCard iconName="water-outline" label="Humidity" value={humidity} unit="%" metricKey="humidity" />
        <MetricCard iconName="sunny-outline" label="UV Index" value={uvIndex} unit="" metricKey="uvIndex" />
        <MetricCard iconName="eye-outline" label="Visibility" value={visibility} unit="km" metricKey="visibility" />
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedMetric}
        onRequestClose={() => setSelectedMetric(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedMetric(null)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            {selectedMetric && METRIC_INFO[selectedMetric] && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{METRIC_INFO[selectedMetric].title}</Text>
                  <TouchableOpacity onPress={() => setSelectedMetric(null)}>
                    <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.modalDescription}>
                  {METRIC_INFO[selectedMetric].description}
                </Text>
                
                {METRIC_INFO[selectedMetric].ranges && (
                  <View style={styles.rangeContainer}>
                    <Text style={styles.rangeTitle}>Ranges:</Text>
                    <Text style={styles.rangeText}>{METRIC_INFO[selectedMetric].ranges}</Text>
                  </View>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F6F7FB',
    paddingVertical: 18,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    marginTop: -12,
  },
  aqiSummary: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
  },
  alertWrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  aqiLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  aqiValue: {
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 8,
  },
  aqiBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
  },
  aqiBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  metricCard: {
    flexBasis: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  metricIcon: {
    fontSize: 20,
  },
  metricIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1EAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTextBlock: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  metricUnit: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 16,
  },
  rangeContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
  },
  rangeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  rangeText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
});
