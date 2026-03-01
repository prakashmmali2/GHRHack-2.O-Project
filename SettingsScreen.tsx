import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  Switch,
  Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';

const SettingsScreen: React.FC = () => {
  const [demoMode, setDemoMode] = useState(false);
  const [voiceNotifications, setVoiceNotifications] = useState(true);

  const toggleDemoMode = async (value: boolean) => {
    setDemoMode(value);
    await AsyncStorage.setItem('demoMode', value ? 'true' : 'false');
    if (value) {
      Alert.alert(
        'Demo Mode Enabled',
        'Notifications will trigger in 10 seconds and escalation in 30 seconds for testing purposes.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Demo Mode Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demo Mode</Text>
          <Text style={styles.sectionDescription}>
            Enable demo mode for mentor presentations. Notifications trigger faster.
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Demo Mode</Text>
              <Text style={styles.settingValue}>
                {demoMode ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <Switch
              value={demoMode}
              onValueChange={toggleDemoMode}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Voice Notifications</Text>
              <Text style={styles.settingValue}>
                {voiceNotifications ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <Switch
              value={voiceNotifications}
              onValueChange={setVoiceNotifications}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>📤</Text>
            <Text style={styles.actionText}>Export Data</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => {
              Alert.alert(
                'Clear Data',
                'Are you sure you want to clear all data? This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Clear', 
                    style: 'destructive',
                    onPress: async () => {
                      await AsyncStorage.clear();
                      Alert.alert('Success', 'All data cleared. Please restart the app.');
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.actionIcon}>🗑️</Text>
            <Text style={[styles.actionText, styles.dangerText]}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Build</Text>
            <Text style={styles.infoValue}>Production</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>React Native (Expo)</Text>
          </View>
        </View>

        {/* Features Info */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>App Features</Text>
          <Text style={styles.featuresList}>
            • Multi-role support (Patient, Caregiver, Doctor){'\n'}
            • AI-powered face scanning{'\n'}
            • Smart medication reminders{'\n'}
            • Adherence tracking & analytics{'\n'}
            • Multi-language support{'\n'}
            • Medicine information search{'\n'}
            • Stock management & alerts
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sectionDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  settingValue: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
  },
  actionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  dangerText: {
    color: Colors.error,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  featuresCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  featuresTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.surface,
    marginBottom: Spacing.sm,
  },
  featuresList: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    lineHeight: 24,
    opacity: 0.9,
  },
});

export default SettingsScreen;
