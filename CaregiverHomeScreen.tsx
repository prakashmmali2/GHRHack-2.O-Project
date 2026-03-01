import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  FlatList
} from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { 
  getPatientsByCaregiverId, 
  getUserByUniqueCode, 
  linkPatientToCaregiver, 
  getAllUsers,
  getMedicinesByPatientId,
  getAdherenceStatsByPatientId
} from '../services/database';
import { User, Medicine, AdherenceStats } from '../types';

const CaregiverHomeScreen: React.FC = () => {
  const { user } = useApp();
  const [linkedPatients, setLinkedPatients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientCode, setPatientCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null);
  const [patientMedicines, setPatientMedicines] = useState<Medicine[]>([]);
  const [patientAdherence, setPatientAdherence] = useState<AdherenceStats[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadLinkedPatients();
  }, [user?.id]);

  const loadLinkedPatients = async () => {
    try {
      if (user?.id) {
        const patients = await getPatientsByCaregiverId(user.id);
        setLinkedPatients(patients);
      }
    } catch (error) {
      console.error('Error loading linked patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkPatient = async () => {
    if (!patientCode.trim()) {
      Alert.alert('Error', 'Please enter a patient code');
      return;
    }

    const code = patientCode.trim().toUpperCase();
    setLinking(true);
    
    try {
      const allUsers = await getAllUsers();
      const patient = await getUserByUniqueCode(code);
      
      if (!patient) {
        const patientList = allUsers.filter((u: User) => u.role === 'Patient').map((u: User) => `${u.fullName}: ${u.uniqueCode}`).join('\n');
        Alert.alert('Not Found', `No patient found with code "${code}".\n\nAvailable patients:\n${patientList || 'No patients registered'}`);
        setLinking(false);
        return;
      }

      if (patient.role !== 'Patient') {
        Alert.alert('Error', 'This code belongs to a ' + patient.role + ', not a Patient.');
        setLinking(false);
        return;
      }

      const alreadyLinked = linkedPatients.find((p: User) => p.id === patient.id);
      if (alreadyLinked) {
        Alert.alert('Info', `Patient "${patient.fullName}" is already linked to you.`);
        setLinking(false);
        return;
      }

      if (user && user.id) {
        await linkPatientToCaregiver(patient.id, user.id);
      }
      
      await loadLinkedPatients();
      
      setPatientCode('');
      Alert.alert('Success', `Patient "${patient.fullName}" has been linked successfully!`);
      
    } catch (error) {
      console.error('Error linking patient:', error);
      Alert.alert('Error', 'Failed to link patient. Please try again.');
    } finally {
      setLinking(false);
    }
  };

  const handleViewPatientDetails = async (patient: User) => {
    try {
      const medicines = await getMedicinesByPatientId(patient.id);
      const adherence = await getAdherenceStatsByPatientId(patient.id);
      setPatientMedicines(medicines);
      setPatientAdherence(adherence);
      setSelectedPatient(patient);
      setShowDetails(true);
    } catch (error) {
      console.error('Error loading patient details:', error);
      Alert.alert('Error', 'Failed to load patient details');
    }
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedPatient(null);
    setPatientMedicines([]);
    setPatientAdherence([]);
  };

  // Calculate average adherence
  const getAverageAdherence = () => {
    if (patientAdherence.length === 0) return 0;
    const total = patientAdherence.reduce((sum, stat) => sum + stat.adherencePercent, 0);
    return Math.round(total / patientAdherence.length);
  };

  const getAdherenceColor = (percent: number) => {
    if (percent >= 80) return '#4CAF50';
    if (percent >= 60) return '#FF9800';
    return '#F44336';
  };

  // If showing patient details
  if (showDetails && selectedPatient) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCloseDetails}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.detailName}>{selectedPatient.fullName}</Text>
            <Text style={styles.detailCode}>Code: {selectedPatient.uniqueCode}</Text>
            {selectedPatient.age && <Text style={styles.detailAge}>Age: {selectedPatient.age}</Text>}
          </View>

          {/* Adherence Summary */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>📊 Adherence Overview</Text>
            <View style={styles.adherenceCard}>
              <Text style={styles.adherenceValue}>{getAverageAdherence()}%</Text>
              <Text style={styles.adherenceLabel}>Average Adherence</Text>
            </View>
            
            {/* Recent adherence stats */}
            {patientAdherence.length > 0 ? (
              <View style={styles.adherenceHistory}>
                {patientAdherence.slice(0, 7).map((stat, index) => (
                  <View key={index} style={styles.adherenceDay}>
                    <Text style={styles.adherenceDayText}>{stat.date.slice(5)}</Text>
                    <View style={[styles.adherenceBar, { 
                      width: `${stat.adherencePercent}%`,
                      backgroundColor: getAdherenceColor(stat.adherencePercent)
                    }]} />
                    <Text style={styles.adherencePercentText}>{stat.adherencePercent}%</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noDataText}>No adherence data yet</Text>
            )}
          </View>

          {/* Medicines */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>💊 Medicines ({patientMedicines.length})</Text>
            {patientMedicines.length > 0 ? (
              patientMedicines.map((medicine, index) => (
                <View key={index} style={styles.medicineCard}>
                  <View style={styles.medicineHeader}>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                    <Text style={styles.medicineStock}>Stock: {medicine.stockCount}</Text>
                  </View>
                  <Text style={styles.medicineDisease}>{medicine.disease}</Text>
                  <View style={styles.medicineSchedule}>
                    <Text style={styles.scheduleText}>📅 {medicine.scheduleType}</Text>
                    <Text style={styles.doseText}>💊 {medicine.dosePerDay}x daily</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No medicines added yet</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Default view - patient list
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.fullName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Caregiver</Text>
          </View>
        </View>

        {/* Link Patient Section */}
        <View style={styles.linkSection}>
          <View style={styles.linkSectionHeader}>
            <View style={styles.linkIconContainer}>
              <Text style={styles.linkIcon}>+</Text>
            </View>
            <Text style={styles.linkSectionTitle}>Link New Patient</Text>
          </View>
          
          <Text style={styles.linkSectionDesc}>
            Enter the patient's unique code to connect with them
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter patient code"
              placeholderTextColor="#999"
              value={patientCode}
              onChangeText={setPatientCode}
              autoCapitalize="characters"
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.linkButton, linking && styles.linkButtonDisabled]}
            onPress={handleLinkPatient}
            disabled={linking}
          >
            <Text style={styles.linkButtonText}>
              {linking ? 'Connecting...' : 'Connect Patient'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Linked Patients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Patients</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{linkedPatients.length}</Text>
            </View>
          </View>
          
          {linkedPatients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No patients connected</Text>
              <Text style={styles.emptySubtext}>
                Enter a patient's unique code above to connect with them
              </Text>
            </View>
          ) : (
            linkedPatients.map((patient: User, index: number) => (
              <TouchableOpacity 
                key={index} 
                style={styles.patientCard}
                onPress={() => handleViewPatientDetails(patient)}
              >
                <View style={styles.patientHeader}>
                  <View style={styles.patientAvatar}>
                    <Text style={styles.patientAvatarText}>
                      {patient.fullName?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patient.fullName}</Text>
                    <Text style={styles.patientCode}>{patient.uniqueCode}</Text>
                    {patient.age && <Text style={styles.patientAge}>Age: {patient.age}</Text>}
                  </View>
                  <View style={styles.viewArrow}>
                    <Text style={styles.viewArrowText}>View →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F7FA' 
  },
  scrollContent: { 
    padding: Spacing.md 
  },
  header: {
    marginBottom: Spacing.lg,
  },
  greeting: { 
    fontSize: FontSizes.md, 
    color: '#666' 
  },
  name: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#1A1A2E',
    marginTop: 2 
  },
  roleBadge: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  roleText: {
    color: '#FFF',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  backButton: {
    color: '#4A90E2',
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  
  // Detail View Styles
  detailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  detailCode: {
    fontSize: FontSizes.md,
    color: '#666',
    fontFamily: 'monospace',
  },
  detailAge: {
    fontSize: FontSizes.md,
    color: '#666',
    marginTop: 4,
  },
  detailSection: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  detailSectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: Spacing.md,
  },
  adherenceCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  adherenceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  adherenceLabel: {
    fontSize: FontSizes.sm,
    color: '#666',
  },
  adherenceHistory: {
    marginTop: Spacing.sm,
  },
  adherenceDay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  adherenceDayText: {
    width: 50,
    fontSize: FontSizes.xs,
    color: '#666',
  },
  adherenceBar: {
    height: 8,
    borderRadius: 4,
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  adherencePercentText: {
    width: 35,
    fontSize: FontSizes.xs,
    color: '#666',
    textAlign: 'right',
  },
  medicineCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicineName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  medicineStock: {
    fontSize: FontSizes.sm,
    color: '#666',
  },
  medicineDisease: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginTop: 2,
  },
  medicineSchedule: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  scheduleText: {
    fontSize: FontSizes.sm,
    color: '#666',
  },
  doseText: {
    fontSize: FontSizes.sm,
    color: '#666',
  },
  noDataText: {
    fontSize: FontSizes.sm,
    color: '#999',
    textAlign: 'center',
    padding: Spacing.md,
  },
  
  // Link Section
  linkSection: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  linkIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  linkIcon: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  linkSectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  linkSectionDesc: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginBottom: Spacing.md,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  codeInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    textAlign: 'center',
    letterSpacing: 1,
  },
  linkButton: {
    backgroundColor: '#4A90E2',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  linkButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  linkButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: FontSizes.md,
  },
  
  // Other Styles
  section: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  countBadge: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: '#FFF',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  patientCard: {
    backgroundColor: '#F5F7FA',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  patientHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
  },
  patientAvatar: {
    width: 44, 
    height: 44, 
    borderRadius: 22,
    backgroundColor: '#4A90E2', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: Spacing.md,
  },
  patientAvatarText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#FFF' 
  },
  patientInfo: { flex: 1 },
  patientName: { 
    fontSize: FontSizes.md, 
    fontWeight: '600', 
    color: '#1A1A2E' 
  },
  patientCode: { 
    fontSize: FontSizes.xs, 
    color: '#666',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  patientAge: {
    fontSize: FontSizes.xs,
    color: '#666',
    marginTop: 2,
  },
  viewArrow: {
    padding: Spacing.sm,
  },
  viewArrowText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  
  emptyState: { 
    alignItems: 'center', 
    padding: Spacing.lg 
  },
  emptyIcon: { 
    fontSize: 48,
    marginBottom: Spacing.sm 
  },
  emptyText: { 
    fontSize: FontSizes.md, 
    fontWeight: '600', 
    color: '#666' 
  },
  emptySubtext: { 
    fontSize: FontSizes.sm, 
    color: '#999', 
    textAlign: 'center',
    marginTop: 4,
  },
});

export default CaregiverHomeScreen;
