import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { PatientStackParamList, ScheduleType, Medicine } from '../types';
import { createMedicine, getMedicines } from '../services/database';
import { useApp } from '../context/AppContext';
import { scheduleMedicineReminder, requestNotificationPermissions, testNotification } from '../services/reminderService';

type AddMedicineScreenProps = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'AddMedicine'>;
};

interface MedicineFormData {
  id: string;
  name: string;
  disease: string;
  scheduleType: ScheduleType;
  dosePerDay: string;
  stockCount: string;
  customTime: string;
  voiceEnabled: boolean;
}

const SCHEDULE_TYPES: { label: string; value: ScheduleType }[] = [
  { label: '🌅 Morning (8 AM)', value: 'Breakfast' },
  { label: '☀️ Afternoon (2 PM)', value: 'After Lunch' },
  { label: '🌙 Evening (8 PM)', value: 'Dinner' },
  { label: '⏰ Custom Time', value: 'Custom Time' },
];

const HOURS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const AM_PM = ['AM', 'PM'];

const AddMedicineScreen: React.FC<AddMedicineScreenProps> = ({ navigation }) => {
  const { user } = useApp();
  const [medicines, setMedicines] = useState<MedicineFormData[]>([
    {
      id: '1',
      name: '',
      disease: '',
      scheduleType: 'Breakfast',
      dosePerDay: '1',
      stockCount: '30',
      customTime: '08:00 AM',
      voiceEnabled: false,
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const addMedicineField = () => {
    setMedicines([...medicines, {
      id: Date.now().toString(),
      name: '',
      disease: '',
      scheduleType: 'Breakfast',
      dosePerDay: '1',
      stockCount: '30',
      customTime: '08:00 AM',
      voiceEnabled: false,
    }]);
  };

  const removeMedicineField = (id: string) => {
    if (medicines.length > 1) {
      setMedicines(medicines.filter(m => m.id !== id));
    }
  };

  const updateMedicine = (id: string, field: keyof MedicineFormData, value: any) => {
    setMedicines(medicines.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSave = async () => {
    console.log('Save clicked, user:', user?.id);
    
    const validMedicines = medicines.filter(m => m.name.trim() && m.disease.trim());
    
    if (validMedicines.length === 0) {
      Alert.alert('Error', 'Please add medicine name and disease');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    setIsLoading(true);
    
    try {
      // Request notification permissions first
      await requestNotificationPermissions();
      
      let savedCount = 0;
      
      for (const med of validMedicines) {
        console.log('Saving medicine:', med.name, 'for patient:', user.id);
        
        const medicineId = await createMedicine(
          user.id,
          med.name,
          med.disease,
          med.scheduleType,
          parseInt(med.dosePerDay) || 1,
          parseInt(med.stockCount) || 30,
          med.scheduleType === 'Custom Time' ? med.customTime : undefined,
          med.voiceEnabled,
          undefined
        );
        
        console.log('Medicine saved with ID:', medicineId);
        
        // Create medicine object for reminder
        const newMedicine: Medicine = {
          id: medicineId,
          patientId: user.id,
          name: med.name,
          disease: med.disease,
          scheduleType: med.scheduleType,
          dosePerDay: parseInt(med.dosePerDay) || 1,
          stockCount: parseInt(med.stockCount) || 30,
          customTime: med.scheduleType === 'Custom Time' ? med.customTime : undefined,
          voiceEnabled: med.voiceEnabled,
          createdAt: new Date().toISOString()
        };
        
        // Schedule reminder
        await scheduleMedicineReminder(newMedicine, user.id);
        console.log('Reminder scheduled for:', med.name);
        
        // Send test notification immediately to verify it works
        await testNotification(newMedicine);
        console.log('Test notification sent for:', med.name);
        
        savedCount++;
      }

      // Verify saved medicines
      const allMedicines = await getMedicines(user.id);
      console.log('Total medicines for user:', allMedicines.length);
      
      Alert.alert('Success', `${savedCount} medicine(s) saved with reminders!\n\nYou received a TEST notification - check if you heard it!\n\nReminder will also pop at the scheduled time.\n\nSnooze = 20 seconds, max 3 times.\nAfter 3 snoozes, caregiver/doctor will be alerted.`);
      navigation.goBack();
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTimePicker = (medicine: MedicineFormData) => {
    const currentHour = medicine.customTime.split(':')[0] || '08';
    const currentMin = medicine.customTime.split(':')[1]?.split(' ')[0] || '00';
    const currentAmPm = medicine.customTime.split(' ')[1] || 'AM';

    return (
      <View style={styles.timePickerContainer}>
        <View style={styles.pickerColumn}>
          <Text style={styles.pickerLabel}>Hour</Text>
          <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
            {HOURS.map((h) => (
              <TouchableOpacity
                key={h}
                style={[styles.pickerItem, currentHour === h && styles.pickerItemActive]}
                onPress={() => updateMedicine(medicine.id, 'customTime', `${h}:${currentMin} ${currentAmPm}`)}
              >
                <Text style={[styles.pickerText, currentHour === h && styles.pickerTextActive]}>{h}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Text style={styles.pickerColon}>:</Text>

        <View style={styles.pickerColumn}>
          <Text style={styles.pickerLabel}>Min</Text>
          <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
            {MINUTES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.pickerItem, currentMin === m && styles.pickerItemActive]}
                onPress={() => updateMedicine(medicine.id, 'customTime', `${currentHour}:${m} ${currentAmPm}`)}
              >
                <Text style={[styles.pickerText, currentMin === m && styles.pickerTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.pickerColumn}>
          <Text style={styles.pickerLabel}>AM/PM</Text>
          <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
            {AM_PM.map((ap) => (
              <TouchableOpacity
                key={ap}
                style={[styles.pickerItem, currentAmPm === ap && styles.pickerItemActive]}
                onPress={() => updateMedicine(medicine.id, 'customTime', `${currentHour}:${currentMin} ${ap}`)}
              >
                <Text style={[styles.pickerText, currentAmPm === ap && styles.pickerTextActive]}>{ap}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderMedicineForm = (medicine: MedicineFormData, index: number) => (
    <View key={medicine.id} style={styles.medicineCard}>
      <View style={styles.medicineHeader}>
        <Text style={styles.medicineTitle}>Medicine #{index + 1}</Text>
        {medicines.length > 1 && (
          <TouchableOpacity onPress={() => removeMedicineField(medicine.id)}>
            <Text style={styles.removeText}>✕ Remove</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Medicine Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter medicine name"
          placeholderTextColor={Colors.disabled}
          value={medicine.name}
          onChangeText={(v) => updateMedicine(medicine.id, 'name', v)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Disease *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter disease name"
          placeholderTextColor={Colors.disabled}
          value={medicine.disease}
          onChangeText={(v) => updateMedicine(medicine.id, 'disease', v)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Schedule Time (IST)</Text>
        <View style={styles.scheduleOptions}>
          {SCHEDULE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[styles.scheduleOption, medicine.scheduleType === type.value && styles.scheduleOptionActive]}
              onPress={() => updateMedicine(medicine.id, 'scheduleType', type.value)}
            >
              <Text style={[styles.scheduleText, medicine.scheduleType === type.value && styles.scheduleTextActive]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {medicine.scheduleType === 'Custom Time' && (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Select Time</Text>
          {renderTimePicker(medicine)}
          <Text style={styles.selectedTimeText}>Selected: {medicine.customTime}</Text>
        </View>
      )}

      <View style={styles.row}>
        <View style={[styles.inputContainer, styles.halfWidth]}>
          <Text style={styles.label}>Dose/Day</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            placeholderTextColor={Colors.disabled}
            value={medicine.dosePerDay}
            onChangeText={(v) => updateMedicine(medicine.id, 'dosePerDay', v)}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.inputContainer, styles.halfWidth]}>
          <Text style={styles.label}>Stock</Text>
          <TextInput
            style={styles.input}
            placeholder="30"
            placeholderTextColor={Colors.disabled}
            value={medicine.stockCount}
            onChangeText={(v) => updateMedicine(medicine.id, 'stockCount', v)}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Voice Notification</Text>
        <Switch
          value={medicine.voiceEnabled}
          onValueChange={(v) => updateMedicine(medicine.id, 'voiceEnabled', v)}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.surface}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.infoText}>Add multiple medicines for same time</Text>
          {medicines.map((m, i) => renderMedicineForm(m, i))}

          <TouchableOpacity style={styles.addButton} onPress={addMedicineField}>
            <Text style={styles.addButtonText}>+ Add Another Medicine</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleSave} 
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{isLoading ? 'Saving...' : 'Save All Medicines'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollContent: { padding: Spacing.md },
  infoText: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
  medicineCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  medicineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  medicineTitle: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.primary },
  removeText: { color: Colors.error, fontSize: FontSizes.sm },
  inputContainer: { marginBottom: Spacing.md },
  label: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSizes.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  scheduleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  scheduleOption: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  scheduleOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  scheduleText: { fontSize: FontSizes.sm, color: Colors.text },
  scheduleTextActive: { color: Colors.surface },
  timePickerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  pickerColumn: { alignItems: 'center', marginHorizontal: Spacing.xs },
  pickerLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginBottom: Spacing.xs },
  pickerScroll: { height: 120, width: 50 },
  pickerItem: { padding: Spacing.xs, alignItems: 'center' },
  pickerItemActive: { backgroundColor: Colors.primary, borderRadius: BorderRadius.sm },
  pickerText: { fontSize: FontSizes.md, color: Colors.text },
  pickerTextActive: { color: Colors.surface, fontWeight: 'bold' },
  pickerColon: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.text },
  selectedTimeText: { textAlign: 'center', marginTop: Spacing.sm, fontSize: FontSizes.md, color: Colors.primary, fontWeight: '600' },
  row: { flexDirection: 'row', gap: Spacing.md },
  halfWidth: { flex: 1 },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  switchLabel: { fontSize: FontSizes.md, color: Colors.text },
  addButton: { backgroundColor: Colors.secondary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.md },
  addButtonText: { color: Colors.surface, fontSize: FontSizes.md, fontWeight: '600' },
  button: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  buttonDisabled: { backgroundColor: Colors.disabled },
  buttonText: { color: Colors.surface, fontSize: FontSizes.lg, fontWeight: '600' },
});

export default AddMedicineScreen;
