import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { RootStackParamList } from '../types';

type RoleSelectionScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoleSelection'>;
};

const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ navigation }) => {
  const handleRoleSelect = (role: 'Patient' | 'Caregiver' | 'Doctor') => {
    switch (role) {
      case 'Patient':
        navigation.navigate('PatientRegistration');
        break;
      case 'Caregiver':
        navigation.navigate('CaregiverRegistration');
        break;
      case 'Doctor':
        navigation.navigate('DoctorRegistration');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>OwnMediCare</Text>
        <Text style={styles.subtitle}>AI-Powered Healthcare Adherence Platform</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.selectText}>Select Your Role</Text>

        <TouchableOpacity 
          style={styles.roleButton}
          onPress={() => handleRoleSelect('Patient')}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.roleIcon}>👤</Text>
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Patient</Text>
            <Text style={styles.roleDescription}>
              Track your medicines and get reminders
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.roleButton}
          onPress={() => handleRoleSelect('Caregiver')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, { backgroundColor: Colors.secondary }]}>
            <Text style={styles.roleIcon}>👨‍👩‍👧</Text>
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Caregiver</Text>
            <Text style={styles.roleDescription}>
              Monitor your loved one's health
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.roleButton}
          onPress={() => handleRoleSelect('Doctor')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconContainer, { backgroundColor: Colors.accent }]}>
            <Text style={styles.roleIcon}>👨‍⚕️</Text>
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Doctor</Text>
            <Text style={styles.roleDescription}>
              Monitor patient compliance and health
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Your health companion, powered by AI
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    opacity: 0.8,
    marginTop: Spacing.xs,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  selectText: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleIcon: {
    fontSize: 28,
  },
  roleInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  roleTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  roleDescription: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  footer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default RoleSelectionScreen;
