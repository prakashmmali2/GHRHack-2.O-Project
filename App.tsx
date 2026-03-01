import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/database';
import { requestNotificationPermissions, addNotificationResponseListener } from './src/services/reminderService';
import { Colors } from './src/constants/theme';

export default function App() {
  const [isDbReady, setIsDbReady] = useState(Platform.OS === 'web');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setupApp = async () => {
      try {
        // On web, database is in-memory so it's instant
        // On native, we need to initialize SQLite
        if (Platform.OS !== 'web') {
          await initDatabase();
          await requestNotificationPermissions();
          
          // Add notification response listener
          // This will navigate to MedicineAction when user taps on notification
          addNotificationResponseListener((medicineId: number, scheduleType: string) => {
            console.log('Notification tapped:', medicineId, scheduleType);
            // Navigation will be handled by the navigator
            // We'll store this in a way that the PatientHomeScreen can access
          });
        }
        setIsDbReady(true);
      } catch (err) {
        console.error('App initialization error:', err);
        setError('Failed to initialize app');
      }
    };

    setupApp();
  }, []);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!isDbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading OwnMediCare...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
});
