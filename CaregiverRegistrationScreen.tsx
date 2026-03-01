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
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { RootStackParamList } from '../types';
import { createUser, createRelationship, getUserByUniqueCode, isUsernameAvailable, generateUniqueCode } from '../services/database';
import { useApp } from '../context/AppContext';

type CaregiverRegistrationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CaregiverRegistration'>;
};

const RELATIONS = ['Father', 'Mother', 'Wife', 'Husband', 'Brother', 'Sister', 'Son', 'Daughter', 'Other'];

const CaregiverRegistrationScreen: React.FC<CaregiverRegistrationScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [relation, setRelation] = useState('');
  const [patientCode, setPatientCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRelations, setShowRelations] = useState(false);
  const { setUser } = useApp();

  const handleRegister = async () => {
    console.log('Caregiver Register clicked!');
    
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    if (!relation) {
      Alert.alert('Error', 'Please select your relation to the patient');
      return;
    }

    setIsLoading(true);
    try {
      // Check if username is available (Caregivers can share usernames with other Caregivers/Doctors)
      const available = await isUsernameAvailable(username, 'Caregiver');
      if (!available) {
        Alert.alert('Error', 'Username already exists. Please choose another one.');
        setIsLoading(false);
        return;
      }

      // Try to find patient (optional - allow registration without linking)
      let patient = null;
      if (patientCode.trim()) {
        try {
          patient = await getUserByUniqueCode(patientCode.toUpperCase());
          if (!patient || patient.role !== 'Patient') {
            Alert.alert('Warning', 'Patient code not found. You can link patients later from the home screen.');
            patient = null;
          }
        } catch (e) {
          console.log('Could not validate patient code, continuing anyway');
        }
      }

      // Generate unique code for caregiver (so patients can connect with them)
      const caregiverCode = 'CD-' + generateUniqueCode().substring(3);
      
      // Create caregiver user
      const userId = await createUser(
        username,
        name,
        0,
        'Caregiver',
        caregiverCode,
        relation
      );

      // Link to patient if found and valid
      if (patient && patient.id) {
        await createRelationship(patient.id, userId);
      }

      // Set user in context
      await setUser({
        id: userId,
        username: username,
        fullName: name,
        role: 'Caregiver',
        uniqueCode: caregiverCode,
        relation,
        createdAt: new Date().toISOString()
      });
      
      Alert.alert('Registration Successful!', `Your unique code is: ${caregiverCode}\n\nShare this code with your patients so they can connect with you.`);

      console.log('Caregiver registered, navigating...');
      
      // Navigate using replace to avoid back button
      navigation.replace('CaregiverStack');
      
    } catch (error) {
      console.error('Caregiver Registration error:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Caregiver Registration</Text>
            <Text style={styles.subtitle}>Create your account</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor={Colors.disabled}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Choose a username"
                placeholderTextColor={Colors.disabled}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>You can share usernames with other caregivers/doctors</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Relation to Patient</Text>
              <TouchableOpacity 
                style={styles.selectButton}
                onPress={() => setShowRelations(!showRelations)}
              >
                <Text style={relation ? styles.selectText : styles.placeholderText}>
                  {relation || 'Select relation'}
                </Text>
              </TouchableOpacity>
              {showRelations && (
                <View style={styles.optionsContainer}>
                  {RELATIONS.map((rel) => (
                    <TouchableOpacity
                      key={rel}
                      style={styles.option}
                      onPress={() => {
                        setRelation(rel);
                        setShowRelations(false);
                      }}
                    >
                      <Text style={styles.optionText}>{rel}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Patient Unique Code (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter patient's code to link"
                placeholderTextColor={Colors.disabled}
                value={patientCode}
                onChangeText={setPatientCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>You can link more patients later from home screen</Text>
            </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Registering...' : 'Register'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>Back to Role Selection</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.surface,
    opacity: 0.8,
    marginTop: Spacing.xs,
  },
  form: {
    padding: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  helperText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectButton: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  placeholderText: {
    fontSize: FontSizes.md,
    color: Colors.disabled,
  },
  optionsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  option: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  button: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  buttonDisabled: {
    backgroundColor: Colors.disabled,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  backButton: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});

export default CaregiverRegistrationScreen;
