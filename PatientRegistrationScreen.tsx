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
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { RootStackParamList } from '../types';
import { createUser, generateUniqueCode, getUserByUsername } from '../services/database';
import { useApp } from '../context/AppContext';

type PatientRegistrationScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PatientRegistration'>;
};

const PatientRegistrationScreen: React.FC<PatientRegistrationScreenProps> = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useApp();

  const handleRegister = async () => {
    console.log('Register button clicked!');
    console.log('fullName:', fullName);
    console.log('age:', age);
    console.log('username:', username);
    
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }
    if (!age.trim() || isNaN(Number(age)) || Number(age) < 1 || Number(age) > 150) {
      Alert.alert('Error', 'Please enter a valid age');
      return;
    }
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Creating user...');
      
      // Check if username already exists
      const existingUser = await getUserByUsername(username);
      if (existingUser) {
        Alert.alert('Error', 'Username already exists. Please choose another one.');
        setIsLoading(false);
        return;
      }

      // Generate unique patient code based on name
      const uniqueCode = generateUniqueCode(fullName);
      console.log('Generated code:', uniqueCode);
      
      // Create user
      const userId = await createUser(
        username,
        fullName,
        Number(age),
        'Patient',
        uniqueCode
      );

      console.log('User created with ID:', userId);

      // Set user in context
      await setUser({
        id: userId,
        username,
        fullName,
        age: Number(age),
        role: 'Patient',
        uniqueCode,
        createdAt: new Date().toISOString()
      });

      console.log('User set in context, navigating...');
      
      // Navigate to PatientStack using replace to avoid back button
      navigation.replace('PatientStack');
      
    } catch (error) {
      console.error('Registration error:', error);
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
            <Text style={styles.title}>Patient Registration</Text>
            <Text style={styles.subtitle}>Create your patient account</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.disabled}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your age"
                placeholderTextColor={Colors.disabled}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
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
    backgroundColor: Colors.primary,
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
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
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
    color: Colors.secondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});

export default PatientRegistrationScreen;
