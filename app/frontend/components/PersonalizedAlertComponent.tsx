import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUserProfileStore } from '@/store/userProfileStore';

interface PersonalizedAlertProps {
  aqi: number;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  uvIndex: number;
}

interface AlertLevel {
  level: 'safe' | 'caution' | 'warning' | 'danger';
  title: string;
  message: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const PersonalizedAlertComponent = ({
  aqi,
  pm25,
  pm10,
  temperature,
  humidity,
  uvIndex,
}: PersonalizedAlertProps) => {
  const { profile } = useUserProfileStore();

  const alert = useMemo<AlertLevel>(() => {
    if (!profile) {
      return {
        level: 'safe',
        title: 'Air Quality',
        message: 'Loading profile...',
        bgColor: '#E3F2FD',
        textColor: '#1565C0',
        borderColor: '#1565C0',
      };
    }

    // Calculate risk score based on user profile and environmental factors
    let riskScore = 0;
    let riskFactors: string[] = [];

    // Age-related risk (elderly at higher risk)
    if (profile.age > 65) {
      riskScore += 2;
      if (aqi > 100) riskFactors.push('Age + Poor Air Quality');
    } else if (profile.age < 5) {
      riskScore += 2;
      if (aqi > 75) riskFactors.push('Age + Air Quality');
    }

    // Respiratory conditions multiplier
    const hasRespiratoryCondition =
      profile.hasAsthma || profile.respiratoryConditions.length > 0;
    if (hasRespiratoryCondition) {
      riskScore += 3;

      if (pm25 > 35) {
        riskFactors.push('PM2.5 + Respiratory Condition');
      }
      if (aqi > 100) {
        riskFactors.push('Poor Air Quality + Asthma/COPD');
      }
    }

    // Pollen allergy + high pollen days (spring weather patterns)
    if (profile.allergies.includes('pollen')) {
      // High pollen typically in spring/early summer with warm temperatures
      if (temperature > 20 && temperature < 25) {
        riskScore += 1;
        riskFactors.push('Pollen Season (Optimal Temperature)');
      }
    }

    // Dust allergy + humidity + PM10
    if (profile.allergies.includes('dust')) {
      if (pm10 > 50) {
        riskScore += 2;
        riskFactors.push('Dust Level + Dust Sensitivity');
      }
      // Low humidity increases dust
      if (humidity < 30 && pm10 > 30) {
        riskScore += 1;
        riskFactors.push('Low Humidity + Dust');
      }
    }

    // Pollution sensitivity
    if (profile.allergies.includes('pollution')) {
      if (aqi > 100 || pm25 > 35) {
        riskScore += 2;
        riskFactors.push('High Pollution Levels');
      }
    }

    // Heart disease - oxygen levels and air quality matter
    if (profile.otherConditions.includes('heart_disease')) {
      riskScore += 2;
      if (aqi > 75) {
        riskFactors.push('Air Quality + Heart Condition');
      }
    }

    // UV index risk (especially for health conditions)
    if (uvIndex > 8 && hasRespiratoryCondition) {
      riskScore += 1;
      riskFactors.push('High UV + Respiratory Condition');
    }

    // Determine alert level
    if (riskScore >= 7) {
      return {
        level: 'danger',
        title: '⚠️ Danger Zone',
        message:
          riskFactors.length > 0
            ? `⛔ ${riskFactors[0]} - Stay indoors if possible`
            : '⛔ Air quality is dangerous for you. Stay indoors.',
        bgColor: '#FFEBEE',
        textColor: '#C62828',
        borderColor: '#C62828',
      };
    } else if (riskScore >= 5) {
      return {
        level: 'warning',
        title: '⚠️ Warning',
        message:
          riskFactors.length > 0
            ? `⚠️ ${riskFactors[0]} - Avoid strenuous outdoor activity`
            : '⚠️ Air conditions may affect your health. Limit outdoor activities.',
        bgColor: '#FFF3E0',
        textColor: '#E65100',
        borderColor: '#E65100',
      };
    } else if (riskScore >= 2) {
      return {
        level: 'caution',
        title: '⚠️ Take Caution',
        message:
          riskFactors.length > 0
            ? `⚠️ ${riskFactors[0]} - Monitor your symptoms`
            : '⚠️ Monitor air quality. Some symptoms may occur for sensitive groups.',
        bgColor: '#FFFDE7',
        textColor: '#F57F17',
        borderColor: '#F57F17',
      };
    } else {
      return {
        level: 'safe',
        title: '✅ Safe',
        message: '✅ Air quality is good. Safe for outdoor activities.',
        bgColor: '#E8F5E9',
        textColor: '#2E7D32',
        borderColor: '#2E7D32',
      };
    }
  }, [profile, aqi, pm25, pm10, temperature, humidity, uvIndex]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: alert.bgColor,
          borderColor: alert.borderColor,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: alert.textColor }]}>Personal safety</Text>
        <View style={[styles.badge, { backgroundColor: alert.textColor + '22', borderColor: alert.borderColor }]}
        >
          <Text style={[styles.badgeText, { color: alert.textColor }]}>{alert.title}</Text>
        </View>
      </View>

      <Text style={[styles.message, { color: alert.textColor }]}>{alert.message}</Text>

      {/* Quick factors */}
      <View style={styles.chipRow}>
        <View style={[styles.chip, { borderColor: alert.borderColor }]}>
          <Text style={[styles.chipLabel, { color: alert.textColor }]}>AQI {aqi}</Text>
        </View>
        <View style={[styles.chip, { borderColor: alert.borderColor }]}>
          <Text style={[styles.chipLabel, { color: alert.textColor }]}>PM2.5 {pm25} µg/m³</Text>
        </View>
        <View style={[styles.chip, { borderColor: alert.borderColor }]}>
          <Text style={[styles.chipLabel, { color: alert.textColor }]}>PM10 {pm10} µg/m³</Text>
        </View>
      </View>

      {/* Risk factors list */}
      {alert.level !== 'safe' && (
        <View style={styles.infoBox}>
          <Text style={[styles.infoLabel, { color: alert.textColor }]}>Why:</Text>
          <Text style={[styles.infoValue, { color: alert.textColor }]}>
            {alert.message}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 0,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 10,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 12,
    lineHeight: 18,
  },
});
