import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { PatientStackParamList, Medicine } from '../types';
import { getMedicines, deleteMedicine } from '../services/database';
import { useApp } from '../context/AppContext';

type MedicineListScreenProps = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'MedicineList'>;
};

const MedicineListScreen: React.FC<MedicineListScreenProps> = ({ navigation }) => {
  const { user } = useApp();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      if (user?.id) {
        const meds = await getMedicines(user.id);
        setMedicines(meds);
      }
    } catch (error) {
      console.error('Error loading medicines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (medicine: Medicine) => {
    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to delete ${medicine.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMedicine(medicine.id);
              loadMedicines();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete medicine');
            }
          }
        }
      ]
    );
  };

  const getScheduleEmoji = (schedule: string): string => {
    switch (schedule) {
      case 'Breakfast': return '🌅';
      case 'After Lunch': return '☀️';
      case 'Dinner': return '🌙';
      case 'Custom Time': return '⏰';
      default: return '💊';
    }
  };

  const getStockColor = (stock: number): string => {
    if (stock <= 2) return Colors.error;
    if (stock <= 5) return Colors.accent;
    return Colors.success;
  };

  const renderMedicine = ({ item }: { item: Medicine }) => (
    <View style={styles.medicineCard}>
      <View style={styles.medicineHeader}>
        <View style={styles.medicineInfo}>
          <Text style={styles.medicineName}>{item.name}</Text>
          <Text style={styles.medicineDisease}>{item.disease}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item)}>
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.medicineDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>{getScheduleEmoji(item.scheduleType)}</Text>
          <Text style={styles.detailText}>{item.scheduleType}</Text>
          {item.customTime && <Text style={styles.customTime}> ({item.customTime})</Text>}
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>💊</Text>
          <Text style={styles.detailText}>{item.dosePerDay} dose(s)/day</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📦</Text>
          <Text style={[styles.stockText, { color: getStockColor(item.stockCount) }]}>
            Stock: {item.stockCount}
          </Text>
          {item.stockCount <= 2 && (
            <Text style={styles.lowStockAlert}> Low!</Text>
          )}
        </View>
      </View>

      {item.appointmentDate && (
        <View style={styles.appointmentBanner}>
          <Text style={styles.appointmentText}>📅 Next Appointment: {item.appointmentDate}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Medicines</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddMedicine')}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {medicines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💊</Text>
          <Text style={styles.emptyTitle}>No Medicines Yet</Text>
          <Text style={styles.emptyText}>
            Add your first medicine to start tracking your medication adherence.
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => navigation.navigate('AddMedicine')}
          >
            <Text style={styles.emptyButtonText}>Add Medicine</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={medicines}
          renderItem={renderMedicine}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadows.small,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.md,
  },
  medicineCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  medicineDisease: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  deleteIcon: {
    fontSize: 20,
  },
  medicineDetails: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  detailText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  customTime: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  stockText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  lowStockAlert: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    fontWeight: 'bold',
  },
  appointmentBanner: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  appointmentText: {
    color: Colors.surface,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  emptyButtonText: {
    color: Colors.surface,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});

export default MedicineListScreen;
