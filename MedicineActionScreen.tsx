import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity,
  Alert,
  Vibration,
  Platform
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { PatientStackParamList, Medicine } from '../types';
import { 
  getMedicinesByPatientId, 
  updateMedicineStock,
  createMedicineLog,
  saveAdherenceStats,
  getTodaysLogsByPatientId,
  getConnectedUsersForPatient,
  getUserById
} from '../services/database';
import { useApp } from '../context/AppContext';

// Snooze settings
const SNOOZE_SECONDS = 20;
const MAX_SNOOZE_COUNT = 3;
const LOW_STOCK_THRESHOLD = 2;

type MedicineActionScreenProps = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'MedicineAction'>;
  route: {
    params: {
      medicineId: number;
      scheduleType: string;
    }
  };
};

const MedicineActionScreen: React.FC<MedicineActionScreenProps> = ({ navigation, route }) => {
  const { medicineId, scheduleType } = route.params;
  const { user } = useApp();
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [loading, setLoading] = useState(true);
  const [snoozeCount, setSnoozeCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const snoozeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMedicine();
    // Vibrate to get attention
    Vibration.vibrate([500, 200, 500]);

    // Speak medicine name
    if (medicine) {
      speakMedicineName(medicine.name);
    }

    return () => {
      // Cleanup timer on unmount
      if (snoozeTimerRef.current) {
        clearTimeout(snoozeTimerRef.current);
      }
    };
  }, []);

  const speakMedicineName = (name: string): void => {
    try {
      Speech.speak(`Time to take ${name}`, {
        language: 'en',
        rate: 1.0,
      });
    } catch (error) {
      console.log('[MedicineAction] Speech not available:', error);
    }
  };

  const loadMedicine = async () => {
    try {
      if (user?.id) {
        const medicines = await getMedicinesByPatientId(user.id);
        const med = medicines.find(m => m.id === medicineId);
        setMedicine(med || null);
      }
    } catch (error) {
      console.error('Error loading medicine:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaken = async () => {
    if (!medicine || !user) return;

    try {
      // Decrease stock by 1
      const newStock = Math.max(0, medicine.stockCount - 1);
      await updateMedicineStock(medicine.id, newStock);

      // Log the action
      await createMedicineLog(
        medicine.id,
        scheduleType,
        'Taken',
        snoozeCount,
        new Date().toISOString()
      );

      // Update adherence stats
      await updateAdherence('Taken');

      // Check for low stock after taking medicine
      if (newStock <= LOW_STOCK_THRESHOLD && newStock > 0) {
        // Send low stock alert to doctor and family
        await sendLowStockAlert({ ...medicine, stockCount: newStock }, user.id);
      }

      // Cancel any pending snooze notifications
      cancelSnoozeTimer();

      Alert.alert(
        '✅ Medicine Taken!',
        `Great job! ${medicine.name} has been marked as taken. Stock remaining: ${newStock}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error marking as taken:', error);
      Alert.alert('Error', 'Failed to log medicine. Please try again.');
    }
  };

  const handleSnooze = async () => {
    if (!medicine || !user) return;

    const newSnoozeCount = snoozeCount + 1;
    setSnoozeCount(newSnoozeCount);

    if (newSnoozeCount >= MAX_SNOOZE_COUNT) {
      // After 3 snoozes, send alert to caregiver/doctor
      await sendCaregiverDoctorAlert(medicine, user.id);
      
      // Log the missed medicine
      await createMedicineLog(
        medicine.id,
        scheduleType,
        'Missed',
        newSnoozeCount,
        new Date().toISOString()
      );
      
      await updateAdherence('Missed');

      Alert.alert(
        '⚠️ Maximum Snoozes Reached!',
        `You have snoozed ${MAX_SNOOZE_COUNT} times. Your caregiver/doctor has been notified.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      // Schedule another notification in 20 seconds
      startSnoozeTimer(medicine, newSnoozeCount);
      
      Alert.alert(
        '⏰ Snoozed',
        `Reminder will pop up again in ${SNOOZE_SECONDS} seconds (${newSnoozeCount}/${MAX_SNOOZE_COUNT})`,
        [{ text: 'OK' }]
      );
    }
  };

  const startSnoozeTimer = (med: Medicine, currentSnoozeCount: number) => {
    // Cancel any existing timer
    if (snoozeTimerRef.current) {
      clearTimeout(snoozeTimerRef.current);
    }

    setCountdown(SNOOZE_SECONDS);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Schedule snooze notification after 20 seconds
    snoozeTimerRef.current = setTimeout(async () => {
      clearInterval(countdownInterval);
      setCountdown(0);
      
      // Trigger snooze notification
      await triggerSnoozeNotification(med, currentSnoozeCount);
      
      // Speak medicine name again
      speakMedicineName(med.name);
      
      // Vibrate to get attention
      Vibration.vibrate([500, 200, 500]);
    }, SNOOZE_SECONDS * 1000);
  };

  const cancelSnoozeTimer = () => {
    if (snoozeTimerRef.current) {
      clearTimeout(snoozeTimerRef.current);
      snoozeTimerRef.current = null;
    }
    setCountdown(0);
  };

  const triggerSnoozeNotification = async (med: Medicine, currentSnoozeCount: number) => {
    if (Platform.OS !== 'web') {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Snoozed Reminder',
            body: `Take ${med.name} now! (Snooze ${currentSnoozeCount}/${MAX_SNOOZE_COUNT})`,
            data: { 
              medicineId: med.id, 
              scheduleType: med.scheduleType,
              action: 'snooze',
              snoozeCount: currentSnoozeCount
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
      } catch (error) {
        console.error('[MedicineAction] Error scheduling snooze notification:', error);
      }
    }
  };

  const sendCaregiverDoctorAlert = async (med: Medicine, patientId: number) => {
    console.log(`[MedicineAction] Sending caregiver/doctor alert for ${med.name}`);
    
    // Get connected users
    const connectedUsers = await getConnectedUsersForPatient(patientId);
    const patientInfo = await getUserById(patientId);
    
    if (Platform.OS !== 'web') {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ URGENT - Patient Not Responding!',
            body: `${patientInfo?.fullName || 'Patient'} has missed ${med.name} 3 times. Immediate attention required!`,
            data: {
              type: 'caregiver_alert',
              medicineId: med.id,
              medicineName: med.name,
              patientId: patientId,
              snoozeCount: MAX_SNOOZE_COUNT,
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: null,
        });
      } catch (error) {
        console.error('[MedicineAction] Error sending caregiver alert:', error);
      }
    }

    // Voice announcement
    try {
      Speech.speak(`Alert! ${med.name} not taken. Notifying caregiver and doctor!`, {
        language: 'en',
        rate: 1.0,
      });
    } catch (error) {
      console.log('[MedicineAction] Speech not available:', error);
    }

    console.log(`[MedicineAction] Alert sent to ${connectedUsers.length} connected users`);
  };

  const sendLowStockAlert = async (med: Medicine, patientId: number) => {
    console.log(`[MedicineAction] Sending low stock alert for ${med.name} (Stock: ${med.stockCount})`);
    
    const connectedUsers = await getConnectedUsersForPatient(patientId);
    
    if (connectedUsers.length > 0 && Platform.OS !== 'web') {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Low Medicine Stock Alert',
            body: `${med.name} is running low (${med.stockCount} pills left). Please refill soon!`,
            data: {
              type: 'low_stock_alert',
              medicineId: med.id,
              medicineName: med.name,
              stockCount: med.stockCount,
              patientId: patientId,
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
        
        // Voice announcement
        Speech.speak(`Warning! ${med.name} is running low. Only ${med.stockCount} pills left.`, {
          language: 'en',
          rate: 1.0,
        });
      } catch (error) {
        console.error('[MedicineAction] Error sending low stock alert:', error);
      }
    }
  };

  const handleSkip = async () => {
    if (!medicine || !user) return;

    try {
      // Log the skip
      await createMedicineLog(
        medicine.id,
        scheduleType,
        'Skipped',
        snoozeCount,
        new Date().toISOString()
      );

      // Update adherence stats
      await updateAdherence('Skipped');

      // Cancel any pending snooze
      cancelSnoozeTimer();

      Alert.alert(
        '⏭️ Skipped',
        `${medicine.name} has been skipped.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error marking as skipped:', error);
      Alert.alert('Error', 'Failed to log. Please try again.');
    }
  };

  const updateAdherence = async (status: 'Taken' | 'Skipped' | 'Missed') => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get all medicines for this patient
      const medicines = await getMedicinesByPatientId(user.id);
      const totalDoses = medicines.length;
      
      // Get today's medicine logs
      const todaysLogs = await getTodaysLogsByPatientId(user.id);
      
      // Count existing taken and skipped
      let takenDoses = todaysLogs.filter(log => log.status === 'Taken').length;
      let skippedDoses = todaysLogs.filter(log => log.status === 'Skipped').length;
      let missedDoses = todaysLogs.filter(log => log.status === 'Missed').length;
      
      // Add current action
      if (status === 'Taken') takenDoses++;
      if (status === 'Skipped') skippedDoses++;
      if (status === 'Missed') missedDoses++;
      
      // Calculate adherence percentage
      const adherencePercent = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

      console.log('[Adherence] Updating stats:', { totalDoses, takenDoses, skippedDoses, missedDoses, adherencePercent });

      await saveAdherenceStats(
        user.id,
        today,
        totalDoses,
        takenDoses,
        skippedDoses,
        missedDoses,
        adherencePercent
      );
      
      console.log('[Adherence] Stats saved successfully');
    } catch (error) {
      console.error('[Adherence] Error updating adherence:', error);
    }
  };

  if (loading || !medicine) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Medicine Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>💊</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Time for Medicine!</Text>

        {/* Medicine Name */}
        <Text style={styles.medicineName}>{medicine.name}</Text>

        {/* Schedule */}
        <Text style={styles.schedule}>
          {scheduleType === 'Breakfast' && '🌅 Morning'}
          {scheduleType === 'After Lunch' && '☀️ Afternoon'}
          {scheduleType === 'Dinner' && '🌙 Evening'}
          {scheduleType === 'Custom Time' && '⏰ Custom Time'}
        </Text>

        {/* Disease */}
        {medicine.disease && (
          <Text style={styles.disease}>For: {medicine.disease}</Text>
        )}

        {/* Stock Info */}
        <View style={styles.stockContainer}>
          <Text style={styles.stockLabel}>Current Stock:</Text>
          <Text style={[
            styles.stockValue,
            medicine.stockCount <= 2 && styles.lowStock
          ]}>
            {medicine.stockCount} pills
          </Text>
        </View>

        {/* Countdown Timer (when snoozed) */}
        {countdown > 0 && (
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownText}>Next alarm in: {countdown}s</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* TAKEN Button */}
          <TouchableOpacity 
            style={[styles.button, styles.takenButton]}
            onPress={handleTaken}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>✓</Text>
            <Text style={styles.buttonText}>TAKEN</Text>
          </TouchableOpacity>

          {/* SNOOZE Button */}
          <TouchableOpacity 
            style={[styles.button, styles.snoozeButton]}
            onPress={handleSnooze}
            activeOpacity={0.8}
            disabled={countdown > 0}
          >
            <Text style={styles.buttonIcon}>⏰</Text>
            <Text style={styles.buttonText}>SNOOZE</Text>
            <Text style={styles.snoozeHint}>{countdown > 0 ? `${countdown}s` : '20 sec'}</Text>
          </TouchableOpacity>

          {/* SKIP Button */}
          <TouchableOpacity 
            style={[styles.button, styles.skipButton]}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>⏭️</Text>
            <Text style={styles.buttonText}>SKIP</Text>
          </TouchableOpacity>
        </View>

        {/* Snooze Counter */}
        {snoozeCount > 0 && (
          <Text style={styles.snoozeCounter}>
            Snoozed {snoozeCount}/{MAX_SNOOZE_COUNT} times
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontSize: FontSizes.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    fontSize: 60,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: Spacing.md,
  },
  medicineName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  schedule: {
    fontSize: FontSizes.lg,
    color: '#CCC',
    marginBottom: Spacing.sm,
  },
  disease: {
    fontSize: FontSizes.md,
    color: '#999',
    marginBottom: Spacing.md,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  stockLabel: {
    fontSize: FontSizes.md,
    color: '#999',
    marginRight: Spacing.sm,
  },
  stockValue: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  lowStock: {
    color: '#F44336',
  },
  countdownContainer: {
    backgroundColor: '#FF9800',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  countdownText: {
    color: '#FFF',
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  takenButton: {
    backgroundColor: '#4CAF50',
  },
  snoozeButton: {
    backgroundColor: '#FF9800',
  },
  skipButton: {
    backgroundColor: '#757575',
  },
  buttonIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  buttonText: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#FFF',
  },
  snoozeHint: {
    fontSize: FontSizes.xs,
    color: '#FFF',
    opacity: 0.8,
    marginLeft: Spacing.sm,
  },
  snoozeCounter: {
    fontSize: FontSizes.sm,
    color: '#FF9800',
    marginTop: Spacing.md,
  },
});

export default MedicineActionScreen;
