import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  RefreshControl,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { PatientStackParamList, Medicine, AdherenceStats, User } from '../types';
import { 
  getMedicinesByPatientId, 
  getAdherenceStatsByPatientId, 
  getWeeklyAdherenceStats,
  getUserByUniqueCode,
  createRelationship,
  getPatientsByCaregiverId,
  getPatientsByDoctorId
} from '../services/database';
import { useApp } from '../context/AppContext';
import { addNotificationResponseListener } from '../services/reminderService';

type PatientHomeScreenProps = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'PatientHome'>;
};

const PatientHomeScreen: React.FC<PatientHomeScreenProps> = ({ navigation }) => {
  const { user, isDemoMode } = useApp();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [adherenceStats, setAdherenceStats] = useState<AdherenceStats[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [todaysAdherence, setTodaysAdherence] = useState(0);
  
  // Link caregiver/doctor states
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [providerCode, setProviderCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<{caregivers: User[], doctors: User[]}>({ caregivers: [], doctors: [] });

  // Listen for notification taps
  useEffect(() => {
    const subscription = addNotificationResponseListener((medicineId: number, scheduleType: string) => {
      console.log('Notification tapped in PatientHomeScreen:', medicineId, scheduleType);
      // Navigate to MedicineAction screen
      navigation.navigate('MedicineAction', { medicineId, scheduleType });
    });

    return () => {
      subscription.remove();
    };
  }, [navigation]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      const meds = await getMedicinesByPatientId(user.id);
      setMedicines(meds);

      const stats = await getAdherenceStatsByPatientId(user.id);
      setAdherenceStats(stats);

      // Calculate today's adherence
      const today = new Date().toISOString().split('T')[0];
      const todayStats = stats.find(s => s.date === today);
      if (todayStats) {
        setTodaysAdherence(todayStats.adherencePercent);
      }
      
      // Load linked providers
      await loadLinkedProviders();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadLinkedProviders = async () => {
    if (!user) return;
    
    try {
      // We need to find who is linked to this patient
      // For now, we'll show a simple message
      setLinkedProviders({ caregivers: [], doctors: [] });
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLinkProvider = async () => {
    if (!providerCode.trim()) {
      Alert.alert('Error', 'Please enter a code');
      return;
    }

    const code = providerCode.trim().toUpperCase();
    setLinking(true);
    
    try {
      // Find the caregiver/doctor by code
      const provider = await getUserByUniqueCode(code);
      
      if (!provider) {
        Alert.alert('Not Found', 'No caregiver or doctor found with this code. Please check and try again.');
        setLinking(false);
        return;
      }

      if (provider.role === 'Patient') {
        Alert.alert('Error', 'This is a patient code. Please enter a caregiver or doctor code.');
        setLinking(false);
        return;
      }

      // Create relationship
      if (user && user.id) {
        await createRelationship(
          user.id,
          provider.role === 'Caregiver' ? provider.id : undefined,
          provider.role === 'Doctor' ? provider.id : undefined
        );
        
        Alert.alert('Success', `You are now connected with ${provider.role} "${provider.fullName}"! They can now view your health data.`);
        setShowLinkModal(false);
        setProviderCode('');
      }
      
    } catch (error) {
      console.error('Error linking provider:', error);
      Alert.alert('Error', 'Failed to connect. Please try again.');
    } finally {
      setLinking(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getLowStockCount = () => {
    return medicines.filter(m => m.stockCount <= 2).length;
  };

  const getUpcomingDoses = () => {
    // Demo mode shows mock data
    if (isDemoMode || medicines.length === 0) {
      return [
        { time: '08:00 AM', medicine: 'Demo Medicine', status: 'pending' },
        { time: '02:00 PM', medicine: 'Demo Medicine', status: 'pending' },
        { time: '08:00 PM', medicine: 'Demo Medicine', status: 'pending' },
      ];
    }
    return medicines.slice(0, 3).map(m => ({
      time: m.scheduleType === 'Breakfast' ? '08:00 AM' : 
            m.scheduleType === 'After Lunch' ? '02:00 PM' : 
            m.scheduleType === 'Dinner' ? '08:00 PM' : m.customTime || '08:00 AM',
      medicine: m.name,
      status: 'pending'
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.fullName}</Text>
            <Text style={styles.patientCode}>Your Code: {user?.uniqueCode}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Demo Mode Badge */}
        {isDemoMode && (
          <View style={styles.demoBadge}>
            <Text style={styles.demoText}>🔔 Demo Mode Active</Text>
          </View>
        )}

        {/* Share Health Data Section */}
        <TouchableOpacity 
          style={styles.shareSection}
          onPress={() => setShowLinkModal(true)}
        >
          <View style={styles.shareIconContainer}>
            <Text style={styles.shareIcon}>🔗</Text>
          </View>
          <View style={styles.shareInfo}>
            <Text style={styles.shareTitle}>Share Your Health Data</Text>
            <Text style={styles.shareDesc}>Connect with caregiver or doctor to share your health data</Text>
          </View>
          <Text style={styles.shareArrow}>›</Text>
        </TouchableOpacity>

        {/* Adherence Card */}
        <View style={styles.adherenceCard}>
          <Text style={styles.cardTitle}>Today's Adherence</Text>
          <View style={styles.adherenceCircle}>
            <Text style={styles.adherencePercent}>{Math.round(todaysAdherence)}%</Text>
          </View>
          <Text style={styles.adherenceLabel}>
            {todaysAdherence >= 80 ? 'Great job!' : 
             todaysAdherence >= 50 ? 'Keep it up!' : 
             'You can do it!'}
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{medicines.length}</Text>
            <Text style={styles.statLabel}>Medicines</Text>
          </View>
          <View style={[styles.statCard, getLowStockCount() > 0 && styles.warningCard]}>
            <Text style={[styles.statNumber, getLowStockCount() > 0 && styles.warningText]}>
              {getLowStockCount()}
            </Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{adherenceStats.length}</Text>
            <Text style={styles.statLabel}>Days Tracked</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('AddMedicine')}
            >
              <Text style={styles.actionIcon}>💊</Text>
              <Text style={styles.actionText}>Add Medicine</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('MedicineList')}
            >
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionText}>My Medicines</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('AdherenceDashboard')}
            >
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionText}>Adherence</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('FaceScan')}
            >
              <Text style={styles.actionIcon}>📷</Text>
              <Text style={styles.actionText}>Face Scan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Doses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Doses</Text>
          {getUpcomingDoses().map((dose, index) => (
            <View key={index} style={styles.doseItem}>
              <View style={styles.doseTime}>
                <Text style={styles.doseTimeText}>{dose.time}</Text>
              </View>
              <View style={styles.doseInfo}>
                <Text style={styles.doseMedicine}>{dose.medicine}</Text>
                <Text style={[
                  styles.doseStatus,
                  dose.status === 'taken' && styles.takenStatus,
                  dose.status === 'missed' && styles.missedStatus
                ]}>
                  {dose.status === 'taken' ? '✓ Taken' : 
                   dose.status === 'missed' ? '✗ Missed' : 
                   '○ Pending'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Search Bar */}
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => navigation.navigate('MedicineSearch')}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchText}>Search medicines...</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Link Provider Modal */}
      {showLinkModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Connect with Care Team</Text>
            <Text style={styles.modalDesc}>
              Enter your caregiver or doctor's unique code to share your health data with them
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Enter code (e.g., CD-XXXX or DR-XXXX)"
              placeholderTextColor="#999"
              value={providerCode}
              onChangeText={setProviderCode}
              autoCapitalize="characters"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowLinkModal(false);
                  setProviderCode('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmButton, linking && styles.buttonDisabled]}
                onPress={handleLinkProvider}
                disabled={linking}
              >
                <Text style={styles.confirmButtonText}>
                  {linking ? 'Connecting...' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.yourCodeText}>
              Your Code: <Text style={styles.highlightCode}>{user?.uniqueCode}</Text>
            </Text>
            <Text style={styles.shareHintText}>
              Share this code with your caregiver/doctor so they can view your data
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  greeting: {
    fontSize: FontSizes.md,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  patientCode: {
    fontSize: FontSizes.sm,
    color: '#4A90E2',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileIcon: {
    fontSize: 24,
  },
  demoBadge: {
    backgroundColor: '#FF9800',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  demoText: {
    color: '#FFF',
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Share Section
  shareSection: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#4A90E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  shareIcon: {
    fontSize: 24,
  },
  shareInfo: {
    flex: 1,
  },
  shareTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  shareDesc: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginTop: 2,
  },
  shareArrow: {
    fontSize: 24,
    color: '#CCC',
  },
  
  adherenceCard: {
    backgroundColor: '#4A90E2',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  cardTitle: {
    fontSize: FontSizes.md,
    color: '#FFF',
    opacity: 0.9,
    marginBottom: Spacing.sm,
  },
  adherenceCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  adherencePercent: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
  },
  adherenceLabel: {
    fontSize: FontSizes.md,
    color: '#FFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  warningCard: {
    backgroundColor: '#FFEBEE',
  },
  statNumber: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  warningText: {
    color: '#D32F2F',
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: '#666',
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: Spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: Spacing.sm,
  },
  actionText: {
    fontSize: FontSizes.sm,
    color: '#1A1A2E',
    fontWeight: '500',
  },
  doseItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  doseTime: {
    backgroundColor: '#4A90E2',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginRight: Spacing.md,
    minWidth: 70,
    alignItems: 'center',
  },
  doseTimeText: {
    color: '#FFF',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  doseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  doseMedicine: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  doseStatus: {
    fontSize: FontSizes.sm,
    color: '#666',
    marginTop: Spacing.xs,
  },
  takenStatus: {
    color: '#2E7D32',
  },
  missedStatus: {
    color: '#D32F2F',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  searchText: {
    fontSize: FontSizes.md,
    color: '#666',
  },
  
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: Spacing.xs,
  },
  modalDesc: {
    fontSize: FontSizes.md,
    color: '#666',
    marginBottom: Spacing.lg,
  },
  modalInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: Spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginLeft: Spacing.sm,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  yourCodeText: {
    fontSize: FontSizes.md,
    color: '#666',
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  highlightCode: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#4A90E2',
    fontSize: FontSizes.lg,
  },
  shareHintText: {
    fontSize: FontSizes.sm,
    color: '#999',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});

export default PatientHomeScreen;
