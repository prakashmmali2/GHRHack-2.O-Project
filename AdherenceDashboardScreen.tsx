import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Colors, Spacing, FontSizes, BorderRadius, Shadows } from '../constants/theme';
import { getAdherenceStats, getMedicineLogs } from '../services/database';
import { AdherenceStats, MedicineLog } from '../types';
import { useApp } from '../context/AppContext';

const screenWidth = Dimensions.get('window').width;

const AdherenceDashboardScreen: React.FC = () => {
  const { user } = useApp();
  const [adherenceStats, setAdherenceStats] = useState<AdherenceStats[]>([]);
  const [medicineLogs, setMedicineLogs] = useState<MedicineLog[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (user?.id) {
        const stats = await getAdherenceStats(user.id);
        const logs = await getMedicineLogs(user.id);
        setAdherenceStats(stats);
        setMedicineLogs(logs);
      }
    } catch (error) {
      console.error('Error loading adherence data:', error);
    }
  };

  const calculateOverallAdherence = (): number => {
    if (adherenceStats.length === 0) return 0;
    const totalTaken = adherenceStats.reduce((sum, stat) => sum + stat.takenDoses, 0);
    const totalScheduled = adherenceStats.reduce((sum, stat) => sum + stat.totalDoses, 0);
    return totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;
  };

  const calculateSkipRate = (): number => {
    if (adherenceStats.length === 0) return 0;
    const totalSkipped = adherenceStats.reduce((sum, stat) => sum + stat.skippedDoses, 0);
    const totalScheduled = adherenceStats.reduce((sum, stat) => sum + stat.totalDoses, 0);
    return totalScheduled > 0 ? Math.round((totalSkipped / totalScheduled) * 100) : 0;
  };

  const calculateMissedCount = (): number => {
    return adherenceStats.reduce((sum, stat) => sum + stat.missedDoses, 0);
  };

  const getWeeklyData = () => ({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{ data: [85, 72, 90, 68, 95, 80, 88] }],
  });

  const getTimeOfDayData = () => ({
    labels: ['Morning', 'Afternoon', 'Evening'],
    datasets: [{ data: [85, 72, 90] }],
  });

  const overallAdherence = calculateOverallAdherence();
  const skipRate = calculateSkipRate();
  const missedCount = calculateMissedCount();

  const chartConfig = {
    backgroundColor: Colors.surface,
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
    labelColor: () => Colors.text,
    propsForDots: { r: '6', strokeWidth: '2', stroke: Colors.primary },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Adherence Dashboard</Text>
          <Text style={styles.subtitle}>Track your medication compliance</Text>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{overallAdherence}%</Text>
            <Text style={styles.summaryLabel}>Overall Adherence</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <View style={styles.miniCard}>
              <Text style={styles.miniValue}>{100 - skipRate}%</Text>
              <Text style={styles.miniLabel}>Taken</Text>
            </View>
            <View style={styles.miniCard}>
              <Text style={[styles.miniValue, styles.missedValue]}>{missedCount}</Text>
              <Text style={styles.miniLabel}>Missed</Text>
            </View>
            <View style={styles.miniCard}>
              <Text style={[styles.miniValue, styles.skipValue]}>{skipRate}%</Text>
              <Text style={styles.miniLabel}>Skip Rate</Text>
            </View>
          </View>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly Adherence</Text>
          <LineChart data={getWeeklyData()} width={screenWidth - 64} height={200} chartConfig={chartConfig} bezier style={styles.chart} />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Adherence by Time of Day</Text>
          <BarChart data={getTimeOfDayData()} width={screenWidth - 64} height={200} chartConfig={chartConfig} style={styles.chart} yAxisSuffix="%" yAxisLabel="" />
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.chartTitle}>Statistics</Text>
          <View style={styles.statItem}><Text style={styles.statLabel}>Total Doses</Text><Text style={styles.statValue}>{adherenceStats.reduce((s, st) => s + st.totalDoses, 0)}</Text></View>
          <View style={styles.statItem}><Text style={styles.statLabel}>Doses Taken</Text><Text style={styles.statValue}>{adherenceStats.reduce((s, st) => s + st.takenDoses, 0)}</Text></View>
          <View style={styles.statItem}><Text style={styles.statLabel}>Doses Skipped</Text><Text style={styles.statValue}>{adherenceStats.reduce((s, st) => s + st.skippedDoses, 0)}</Text></View>
          <View style={styles.statItem}><Text style={styles.statLabel}>Doses Missed</Text><Text style={[styles.statValue, styles.missedValue]}>{missedCount}</Text></View>
          <View style={styles.statItem}><Text style={styles.statLabel}>Avg Delay</Text><Text style={styles.statValue}>~5 min</Text></View>
          <View style={styles.statItem}><Text style={styles.statLabel}>Most Missed</Text><Text style={styles.statValue}>Afternoon</Text></View>
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.chartTitle}>Tips to Improve</Text>
          <Text style={styles.tipText}>• Set consistent reminder times{'\n'}• Keep medicines visible{'\n'}• Use voice notifications{'\n'}• Review weekly</Text>
        </View>
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
  summaryContainer: { marginBottom: Spacing.md },
  summaryCard: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md, ...Shadows.medium },
  summaryValue: { fontSize: 48, fontWeight: 'bold', color: Colors.surface },
  summaryLabel: { fontSize: FontSizes.lg, color: Colors.surface, opacity: 0.9 },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm },
  miniCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', ...Shadows.small },
  miniValue: { fontSize: FontSizes.xl, fontWeight: 'bold', color: Colors.success },
  miniLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  missedValue: { color: Colors.error },
  skipValue: { color: Colors.accent },
  chartCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.small },
  chartTitle: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md },
  chart: { borderRadius: BorderRadius.md },
  statsCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.small },
  statItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statLabel: { fontSize: FontSizes.md, color: Colors.textSecondary },
  statValue: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  tipsCard: { backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md },
  tipText: { fontSize: FontSizes.md, color: Colors.surface, lineHeight: 24 },
});

export default AdherenceDashboardScreen;
