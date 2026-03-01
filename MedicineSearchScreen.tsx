import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { searchMedicines, MedicineInfo } from '../services/medicineSearch';

const MedicineSearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineInfo | null>(null);
  const [language, setLanguage] = useState<string>('english');
  const [searchResults, setSearchResults] = useState<MedicineInfo[]>([]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const results = searchMedicines(searchQuery.trim());
      setSearchResults(results);
      if (results.length > 0) {
        setSelectedMedicine(results[0]);
      } else {
        setSelectedMedicine(null);
      }
    }
  };

  const renderLanguageToggle = () => (
    <View style={styles.languageContainer}>
      <TouchableOpacity
        style={[styles.langButton, language === 'english' && styles.langButtonActive]}
        onPress={() => { setLanguage('english'); setSearchQuery(''); setSelectedMedicine(null); }}
      >
        <Text style={[styles.langText, language === 'english' && styles.langTextActive]}>English</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.langButton, language === 'marathi' && styles.langButtonActive]}
        onPress={() => { setLanguage('marathi'); setSearchQuery(''); setSelectedMedicine(null); }}
      >
        <Text style={[styles.langText, language === 'marathi' && styles.langTextActive]}>मराठी</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.langButton, language === 'gujarati' && styles.langButtonActive]}
        onPress={() => { setLanguage('gujarati'); setSearchQuery(''); setSelectedMedicine(null); }}
      >
        <Text style={[styles.langText, language === 'gujarati' && styles.langTextActive]}>ગુજરાતી</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Medicine Search</Text>
          <Text style={styles.subtitle}>AI-powered medicine information</Text>
        </View>

        {renderLanguageToggle()}

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter medicine name..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        {selectedMedicine && (
          <View style={styles.resultCard}>
            <Text style={styles.medicineName}>{selectedMedicine.name}</Text>
            
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>What is it?</Text>
              <Text style={styles.sectionText}>{selectedMedicine.whatIsIt}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Why used?</Text>
              <Text style={styles.sectionText}>{selectedMedicine.whyUsed}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Who should take?</Text>
              <Text style={styles.sectionText}>{selectedMedicine.whoShouldTake}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>How to take?</Text>
              <Text style={styles.sectionText}>{selectedMedicine.howToTake}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Side effects</Text>
              <Text style={styles.sectionText}>{selectedMedicine.sideEffects}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Dosage</Text>
              <Text style={styles.sectionText}>{selectedMedicine.dosage}</Text>
            </View>

            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                ⚠️ Always consult your doctor before taking any medication
              </Text>
            </View>
          </View>
        )}

        {!selectedMedicine && searchQuery.length > 0 && searchResults.length === 0 && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>
              No medicine found. Please check the spelling or try a different search term.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.md },
  header: { marginBottom: Spacing.lg },
  title: { fontSize: FontSizes.xxl, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: Spacing.xs },
  languageContainer: { flexDirection: 'row', marginBottom: Spacing.lg, gap: Spacing.sm },
  langButton: { flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, alignItems: 'center', ...Shadows.small },
  langButtonActive: { backgroundColor: Colors.primary },
  langText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textSecondary },
  langTextActive: { color: Colors.surface },
  searchContainer: { flexDirection: 'row', marginBottom: Spacing.lg, gap: Spacing.sm },
  searchInput: { flex: 1, height: 50, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, fontSize: FontSizes.md, color: Colors.text, ...Shadows.small },
  searchButton: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, justifyContent: 'center', borderRadius: BorderRadius.md },
  searchButtonText: { color: Colors.surface, fontWeight: '600', fontSize: FontSizes.md },
  resultCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.medium },
  medicineName: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.primary, marginBottom: Spacing.md },
  infoSection: { marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.xs },
  sectionText: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 20 },
  warningCard: { backgroundColor: '#FFF3E0', padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.sm },
  warningText: { fontSize: FontSizes.sm, color: '#E65100', textAlign: 'center' },
  noResults: { padding: Spacing.xl, alignItems: 'center' },
  noResultsText: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center' },
});

export default MedicineSearchScreen;
