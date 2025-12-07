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
import { useUserProfileStore } from '@/store/userProfileStore';

export default function ProfileScreen() {
  const { profile, updateProfile } = useUserProfileStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [age, setAge] = useState(String(profile?.age || 30));
  const [hasAsthma, setHasAsthma] = useState(profile?.hasAsthma || false);
  const [allergies, setAllergies] = useState({
    pollen: profile?.allergies.includes('pollen') || false,
    dust: profile?.allergies.includes('dust') || false,
    pollution: profile?.allergies.includes('pollution') || false,
  });
  const [conditions, setConditions] = useState({
    copd: profile?.respiratoryConditions.includes('copd') || false,
    bronchitis: profile?.respiratoryConditions.includes('bronchitis') || false,
    heartDisease: profile?.otherConditions.includes('heart_disease') || false,
  });

  const handleSave = async () => {
    if (!age || parseInt(age) < 0 || parseInt(age) > 150) {
      Alert.alert('Invalid Age', 'Please enter a valid age');
      return;
    }

    setIsSaving(true);
    const allergyList = Object.keys(allergies).filter((k) => allergies[k as keyof typeof allergies]);
    const respiratoryConditionsList = hasAsthma
      ? [
          'asthma',
          ...Object.keys(conditions).filter(
            (k) => conditions[k as keyof typeof conditions] && k !== 'heartDisease'
          ),
        ]
      : Object.keys(conditions).filter(
          (k) => conditions[k as keyof typeof conditions] && k !== 'heartDisease'
        );

    try {
      await updateProfile({
        hasCompletedOnboarding: true,
        age: parseInt(age),
        hasAsthma,
        allergies: allergyList,
        respiratoryConditions: respiratoryConditionsList,
        otherConditions: conditions.heartDisease ? ['heart_disease'] : [],
        medications: [],
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setAge(String(profile?.age || 30));
    setHasAsthma(profile?.hasAsthma || false);
    setAllergies({
      pollen: profile?.allergies.includes('pollen') || false,
      dust: profile?.allergies.includes('dust') || false,
      pollution: profile?.allergies.includes('pollution') || false,
    });
    setConditions({
      copd: profile?.respiratoryConditions.includes('copd') || false,
      bronchitis: profile?.respiratoryConditions.includes('bronchitis') || false,
      heartDisease: profile?.otherConditions.includes('heart_disease') || false,
    });
    setIsEditing(false);
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Health Profile</Text>
          <Text style={styles.subtitle}>Personalized air quality alerts based on your health</Text>
        </View>

        {/* Age Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Age</Text>
          </View>
          {isEditing ? (
            <TextInput
              style={styles.input}
              placeholder="Enter your age"
              placeholderTextColor="#999"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
            />
          ) : (
            <Text style={styles.value}>{profile.age} years</Text>
          )}
        </View>

        {/* Asthma Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Do you have asthma?</Text>
            {!isEditing && (
              <Text style={styles.statusBadge}>{profile.hasAsthma ? '✓ Yes' : '✗ No'}</Text>
            )}
          </View>
          {isEditing ? (
            <Switch
              value={hasAsthma}
              onValueChange={setHasAsthma}
              trackColor={{ false: '#e0e0e0', true: '#4285F4' }}
              thumbColor={hasAsthma ? '#1a73e8' : '#f0f0f0'}
            />
          ) : null}
        </View>

        {/* Allergies Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          {['pollen', 'dust', 'pollution'].map((allergy) => (
            <View key={allergy} style={styles.itemRow}>
              {isEditing ? (
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() =>
                    setAllergies((p) => ({
                      ...p,
                      [allergy]: !p[allergy as keyof typeof allergies],
                    }))
                  }
                >
                  <View
                    style={[
                      styles.checkbox,
                      allergies[allergy as keyof typeof allergies] && styles.checkboxChecked,
                    ]}
                  />
                  <Text style={styles.checkboxLabel}>
                    {allergy.charAt(0).toUpperCase() + allergy.slice(1)}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={styles.itemLabel}>
                    {allergy.charAt(0).toUpperCase() + allergy.slice(1)}
                  </Text>
                  <Text style={styles.statusBadge}>
                    {profile.allergies.includes(allergy) ? '✓' : '✗'}
                  </Text>
                </>
              )}
            </View>
          ))}
        </View>

        {/* Health Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Conditions</Text>
          {[
            { key: 'copd', label: 'COPD' },
            { key: 'bronchitis', label: 'Chronic Bronchitis' },
            { key: 'heartDisease', label: 'Heart Disease' },
          ].map(({ key, label }) => (
            <View key={key} style={styles.itemRow}>
              {isEditing ? (
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() =>
                    setConditions((p) => ({
                      ...p,
                      [key]: !p[key as keyof typeof conditions],
                    }))
                  }
                >
                  <View
                    style={[
                      styles.checkbox,
                      conditions[key as keyof typeof conditions] && styles.checkboxChecked,
                    ]}
                  />
                  <Text style={styles.checkboxLabel}>{label}</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={styles.itemLabel}>{label}</Text>
                  <Text style={styles.statusBadge}>
                    {key === 'heartDisease'
                      ? profile.otherConditions.includes('heart_disease')
                        ? '✓'
                        : '✗'
                      : profile.respiratoryConditions.includes(key)
                        ? '✓'
                        : '✗'}
                  </Text>
                </>
              )}
            </View>
          ))}
        </View>

        {/* Last Updated */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Last updated: {new Date(profile.updatedAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Action Buttons */}
        {isEditing ? (
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, isSaving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}

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
  loadingText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
  value: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E3F2FD',
    color: '#1565C0',
    borderRadius: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemLabel: {
    fontSize: 14,
    color: '#333',
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
    marginTop: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  infoBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4285F4',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  editButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpace: {
    height: 40,
  },
});
