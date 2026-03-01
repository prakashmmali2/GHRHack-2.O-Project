import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  Alert,
  Vibration 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { FaceScanReport } from '../types';
import { saveFaceScanReport } from '../services/database';
import { useApp } from '../context/AppContext';

const FaceScanScreen: React.FC = () => {
  const { user } = useApp();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<FaceScanReport | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkDemoMode();
  }, []);

  const checkDemoMode = async () => {
    const demoMode = await AsyncStorage.getItem('demoMode');
    setIsMockMode(demoMode === 'true');
  };

  const performMockScan = (): FaceScanReport => {
    const heartRate = Math.floor(Math.random() * (100 - 60 + 1)) + 60;
    const emotions = ['Happy', 'Neutral', 'Calm', 'Stressed', 'Anxious'];
    const stressLevels = ['Low', 'Medium', 'High'];
    
    const randomEmotion = emotions[Math.floor(Math.random() * 3)];
    const stressLevel = randomEmotion === 'Stressed' || randomEmotion === 'Anxious' 
      ? stressLevels[Math.floor(Math.random() * 3)]
      : stressLevels[0];

    return {
      id: Date.now(),
      patientId: user?.id || 0,
      heartRate,
      emotion: randomEmotion,
      stressLevel,
      suggestion: getSuggestion(randomEmotion, stressLevel),
      scannedAt: new Date().toISOString(),
    };
  };

  const getSuggestion = (emotion: string, stressLevel: string): string => {
    if (stressLevel === 'High') {
      return 'Consider practicing deep breathing exercises and meditation. If stress persists, please consult your doctor.';
    } else if (stressLevel === 'Medium') {
      return 'Try to take regular breaks and maintain a healthy work-life balance.';
    } else {
      return 'Your stress levels appear normal. Continue maintaining your healthy routine.';
    }
  };

  const performScan = async () => {
    setIsScanning(true);
    Vibration.vibrate(200);

    setTimeout(async () => {
      const result = performMockScan();
      setScanResult(result);
      setIsScanning(false);
    }, 3000);
  };

  const handleSaveReport = async () => {
    if (!scanResult || !user) {
      Alert.alert('Error', 'User not logged in');
      return;
    }
    
    setIsSaving(true);
    try {
      await saveFaceScanReport(
        user.id.toString(),
        scanResult.heartRate,
        scanResult.emotion,
        scanResult.stressLevel,
        scanResult.suggestion
      );
      Alert.alert('Success', 'Face scan report saved successfully!');
    } catch (error) {
      console.error('Error saving report:', error);
      Alert.alert('Error', 'Failed to save report.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Face Scan</Text>
          <Text style={styles.subtitle}>
            Analyze your health metrics using advanced face detection
          </Text>
          {isMockMode && (
            <View style={styles.mockBadge}>
              <Text style={styles.mockBadgeText}>Demo Mode</Text>
            </View>
          )}
        </View>

        <View style={styles.cameraContainer}>
          <View style={styles.cameraPreview}>
            <Text style={styles.cameraPlaceholder}>
              {isScanning ? '🔍 Scanning...' : '📷 Face Preview'}
            </Text>
            <Text style={styles.cameraHint}>
              {isScanning ? 'Please stay still...' : 'Position your face in the frame'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
          onPress={performScan}
          disabled={isScanning}
        >
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : 'Start Scan'}
          </Text>
        </TouchableOpacity>

        {scanResult && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Scan Results</Text>
            
            <View style={styles.resultGrid}>
              <View style={styles.resultItem}>
                <Text style={styles.resultIcon}>❤️</Text>
                <Text style={styles.resultLabel}>Heart Rate</Text>
                <Text style={styles.resultValue}>{scanResult.heartRate} BPM</Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultIcon}>😊</Text>
                <Text style={styles.resultLabel}>Emotion</Text>
                <Text style={styles.resultValue}>{scanResult.emotion}</Text>
              </View>
              
              <View style={styles.resultItem}>
                <Text style={styles.resultIcon}>📊</Text>
                <Text style={styles.resultLabel}>Stress Level</Text>
                <Text style={[
                  styles.resultValue,
                  scanResult.stressLevel === 'High' && styles.stressHigh,
                  scanResult.stressLevel === 'Medium' && styles.stressMedium,
                  scanResult.stressLevel === 'Low' && styles.stressLow,
                ]}>
                  {scanResult.stressLevel}
                </Text>
              </View>
            </View>

            <View style={styles.suggestionSection}>
              <Text style={styles.suggestionTitle}>💡 Suggestion</Text>
              <Text style={styles.suggestionText}>{scanResult.suggestion}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveReport}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save Report'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            Our AI analyzes your face to estimate heart rate, detect emotions, and assess stress levels.
          </Text>
          <Text style={styles.disclaimer}>
            * This is for informational purposes only and is not a medical diagnosis.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.md },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  title: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs },
  mockBadge: { backgroundColor: Colors.accent, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.sm },
  mockBadgeText: { color: Colors.surface, fontSize: FontSizes.sm, fontWeight: '600' },
  cameraContainer: { backgroundColor: Colors.text, borderRadius: BorderRadius.lg, height: 250, overflow: 'hidden', marginBottom: Spacing.md },
  cameraPreview: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraPlaceholder: { fontSize: FontSizes.xxl, color: Colors.surface },
  cameraHint: { fontSize: FontSizes.sm, color: Colors.surface, opacity: 0.8, marginTop: Spacing.sm },
  scanButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.lg },
  scanButtonDisabled: { backgroundColor: Colors.disabled },
  scanButtonText: { color: Colors.surface, fontSize: FontSizes.lg, fontWeight: '600' },
  resultCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.medium },
  resultTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md, textAlign: 'center' },
  resultGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.md },
  resultItem: { alignItems: 'center' },
  resultIcon: { fontSize: 32, marginBottom: Spacing.xs },
  resultLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  resultValue: { fontSize: FontSizes.lg, fontWeight: 'bold', color: Colors.text },
  stressHigh: { color: Colors.error },
  stressMedium: { color: Colors.accent },
  stressLow: { color: Colors.success },
  suggestionSection: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  suggestionTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  suggestionText: { fontSize: FontSizes.md, color: Colors.textSecondary, lineHeight: 22 },
  saveButton: { backgroundColor: Colors.secondary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: Colors.disabled },
  saveButtonText: { color: Colors.surface, fontSize: FontSizes.md, fontWeight: '600' },
  infoCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadows.small },
  infoTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  infoText: { fontSize: FontSizes.md, color: Colors.textSecondary, lineHeight: 22 },
  disclaimer: { fontSize: FontSizes.xs, color: Colors.textSecondary, fontStyle: 'italic', marginTop: Spacing.sm },
});

export default FaceScanScreen;
