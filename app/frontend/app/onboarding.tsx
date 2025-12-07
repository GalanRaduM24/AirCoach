import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
  TextInput,
  Alert,
} from 'react-native';
import { useUserProfileStore, UserProfile } from '@/store/userProfileStore';

export default function OnboardingScreen() {
  const { completeOnboarding } = useUserProfileStore();
  const [age, setAge] = useState('30');
  const [hasAsthma, setHasAsthma] = useState(false);
  const [allergies, setAllergies] = useState({
    pollen: false,
    dust: false,
    pollution: false,
  });
  const [conditions, setConditions] = useState({
    copd: false,
    bronchitis: false,
    heartDisease: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    if (!age || parseInt(age) < 0 || parseInt(age) > 150) {
      Alert.alert('Invalid Age', 'Please enter a valid age');
      return;
    }

    setIsLoading(true);
    const allergyList = Object.keys(allergies).filter((k) => allergies[k as keyof typeof allergies]);
    const conditionsList = Object.keys(conditions).filter((k) => conditions[k as keyof typeof conditions]);

    try {
      await completeOnboarding({
        age: parseInt(age),
        hasAsthma,
        allergies: allergyList,
        respiratoryConditions: hasAsthma ? ['asthma', ...conditionsList] : conditionsList,
        otherConditions: conditions.heartDisease ? ['heart_disease'] : [],
        medications: [],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to save your profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AirCoach Setup</Text>
          <Text style={styles.subtitle}>Help us personalize your experience</Text>
        </View>

        {/* Age Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your age"
            placeholderTextColor="#999"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
          />
        </View>

        {/* Asthma Section */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.sectionTitle}>Do you have asthma?</Text>
            <Switch
              value={hasAsthma}
              onValueChange={setHasAsthma}
              trackColor={{ false: '#e0e0e0', true: '#4285F4' }}
              thumbColor={hasAsthma ? '#1a73e8' : '#f0f0f0'}
            />
          </View>
        </View>

        {/* Allergies Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAllergies((p) => ({ ...p, pollen: !p.pollen }))}
          >
            <View style={[styles.checkbox, allergies.pollen && styles.checkboxChecked]} />
            <Text style={styles.checkboxLabel}>Pollen Allergies</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAllergies((p) => ({ ...p, dust: !p.dust }))}
          >
            <View style={[styles.checkbox, allergies.dust && styles.checkboxChecked]} />
            <Text style={styles.checkboxLabel}>Dust Allergies</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAllergies((p) => ({ ...p, pollution: !p.pollution }))}
          >
            <View style={[styles.checkbox, allergies.pollution && styles.checkboxChecked]} />
            <Text style={styles.checkboxLabel}>Pollution Sensitivity</Text>
          </TouchableOpacity>
        </View>

        {/* Other Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Conditions</Text>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setConditions((p) => ({ ...p, copd: !p.copd }))}
          >
            <View style={[styles.checkbox, conditions.copd && styles.checkboxChecked]} />
            <Text style={styles.checkboxLabel}>COPD</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setConditions((p) => ({ ...p, bronchitis: !p.bronchitis }))}
          >
            <View style={[styles.checkbox, conditions.bronchitis && styles.checkboxChecked]} />
            <Text style={styles.checkboxLabel}>Chronic Bronchitis</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setConditions((p) => ({ ...p, heartDisease: !p.heartDisease }))}
          >
            <View style={[styles.checkbox, conditions.heartDisease && styles.checkboxChecked]} />
            <Text style={styles.checkboxLabel}>Heart Disease</Text>
          </TouchableOpacity>
        </View>

        {/* Complete Button */}
        <TouchableOpacity
          style={[styles.completeButton, isLoading && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={isLoading}
        >
          <Text style={styles.completeButtonText}>{isLoading ? 'Saving...' : 'Get Started'}</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#f5f5f5',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  completeButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpace: {
    height: 40,
  },
});
