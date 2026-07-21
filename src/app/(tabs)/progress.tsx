import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { ComparisonBadge } from '@/components/ComparisonBadge';
import { DateRangeSelector } from '@/components/DateRangeSelector';
import { EmptyState } from '@/components/EmptyState';
import { ExerciseProgressSelector } from '@/components/ExerciseProgressSelector';
import { ExerciseProgressSummary } from '@/components/ExerciseProgressSummary';
import { FilterChip } from '@/components/FilterChip';
import { Header } from '@/components/Header';
import { MetricSelector } from '@/components/MetricSelector';
import { AppInput } from '@/components/AppInput';
import { AppButton } from '@/components/AppButton';
import { PersonalRecordCard } from '@/components/PersonalRecordCard';
import { ProgressChart } from '@/components/ProgressChart';
import { SectionHeader } from '@/components/SectionHeader';
import { StatisticsCard } from '@/components/StatisticsCard';
import { StatisticsGrid } from '@/components/StatisticsGrid';
import { StreakCard } from '@/components/StreakCard';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { listExercises } from '@/repositories/exerciseRepository';
import { getRecentPersonalRecords } from '@/repositories/personalRecordRepository';
import {
  getExerciseProgressDetail, getMostTrainedExercises, getMuscleGroupDistribution,
  getRecentlyTrainedExerciseIds, getStatisticsSummary, getVolumeTrendChart, getWorkoutFrequencyChart,
} from '@/repositories/statisticsRepository';
import { getExerciseRecordsWithDelta } from '@/services/personalRecordService';
import {
  formatDurationMinutes, formatVolumeKg, getStatisticsDateRange, selectChartValue,
} from '@/services/statisticsService';
import type { Exercise } from '@/types/exercise';
import type { PersonalRecord, PersonalRecordWithDelta } from '@/types/personalRecord';
import type {
  ExerciseProgressPoint, ExerciseProgressSummary as ExerciseProgressSummaryModel,
  MostTrainedExercise, MostTrainedRankingMetric, MuscleGroupSummary, ProgressChartMetric,
  StatisticsDatePreset, StatisticsSummary, VolumeTrendPoint, WorkoutFrequencyPoint,
} from '@/types/statistics';
import { getUserMessage } from '@/utils/errors';

export default function ProgressScreen() {
  const db = useDatabase();
  const [datePreset, setDatePreset] = useState<StatisticsDatePreset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [mostTrainedMetric, setMostTrainedMetric] = useState<MostTrainedRankingMetric>('sessions');

  const [summary, setSummary] = useState<StatisticsSummary | null>(null);
  const [frequency, setFrequency] = useState<WorkoutFrequencyPoint[]>([]);
  const [volumeTrend, setVolumeTrend] = useState<VolumeTrendPoint[]>([]);
  const [mostTrained, setMostTrained] = useState<MostTrainedExercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupSummary[]>([]);
  const [recentRecords, setRecentRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [dateError, setDateError] = useState<string>();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [recentExerciseIds, setRecentExerciseIds] = useState<string[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [exerciseDetail, setExerciseDetail] = useState<{ summary: ExerciseProgressSummaryModel; points: ExerciseProgressPoint[] } | null>(null);
  const [exerciseRecords, setExerciseRecords] = useState<PersonalRecordWithDelta[]>([]);
  const [chartMetric, setChartMetric] = useState<ProgressChartMetric>('estimatedOneRepMax');

  const dateRange = useMemo(() => {
    try {
      const range = getStatisticsDateRange(datePreset, new Date(), datePreset === 'custom' ? { from: customFrom, to: customTo } : undefined);
      setDateError(undefined);
      return range;
    } catch (caught) {
      setDateError(getUserMessage(caught, 'Enter a valid date range.'));
      return null;
    }
  }, [datePreset, customFrom, customTo]);

  const load = useCallback(async () => {
    if (!dateRange) { setLoading(false); return; }
    try {
      setError(undefined);
      const bounds = { from: dateRange.from, to: dateRange.to };
      const [summaryData, frequencyData, volumeData, trainedData, muscleData, recentRecordsData] = await Promise.all([
        getStatisticsSummary(db, datePreset, datePreset === 'custom' ? { from: customFrom, to: customTo } : undefined),
        getWorkoutFrequencyChart(db, bounds), getVolumeTrendChart(db, bounds),
        getMostTrainedExercises(db, bounds, mostTrainedMetric, 5), getMuscleGroupDistribution(db, bounds),
        getRecentPersonalRecords(db, 5),
      ]);
      setSummary(summaryData); setFrequency(frequencyData); setVolumeTrend(volumeData);
      setMostTrained(trainedData); setMuscleGroups(muscleData); setRecentRecords(recentRecordsData);
    } catch (caught) { setError(getUserMessage(caught, 'Could not load your progress statistics.')); }
    finally { setLoading(false); }
  }, [dateRange, datePreset, customFrom, customTo, mostTrainedMetric, db]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useFocusEffect(useCallback(() => {
    void listExercises(db).then(setExercises);
    void getRecentlyTrainedExerciseIds(db, 8).then(setRecentExerciseIds);
  }, [db]));

  useEffect(() => {
    if (!selectedExerciseId) { setExerciseDetail(null); setExerciseRecords([]); return; }
    const exercise = exercises.find((item) => item.id === selectedExerciseId);
    if (!exercise) return;
    void Promise.all([
      getExerciseProgressDetail(db, selectedExerciseId, exercise.name),
      getExerciseRecordsWithDelta(db, selectedExerciseId),
    ]).then(([detail, records]) => {
      setExerciseDetail(detail);
      setExerciseRecords(records);
      setChartMetric(detail.summary.isBodyweight ? 'totalReps' : 'estimatedOneRepMax');
    }).catch((caught) => setError(getUserMessage(caught, 'Could not load exercise progress.')));
  }, [selectedExerciseId, exercises, db]);

  const mostTrainedExerciseIds = useMemo(() => mostTrained.map((item) => item.exerciseId), [mostTrained]);
  const maxMuscleVolume = useMemo(() => Math.max(1, ...muscleGroups.map((item) => item.totalVolumeKg)), [muscleGroups]);

  if (loading) return <AppScreen header={<Header title="Progress" />}><View style={styles.center}><ActivityIndicator color={colors.accent} /></View></AppScreen>;
  if (error) return <AppScreen header={<Header title="Progress" />}><EmptyState title="Progress unavailable" message={error} /></AppScreen>;
  if (!summary || (summary.overview.totalWorkouts === 0 && datePreset === 'all')) {
    return <AppScreen header={<Header title="Progress" />}><AppButton label="Open Body Progress" onPress={() => router.push('/body')} /><EmptyState title="Progress starts with a workout" message="Complete your first workout to unlock training progress." /></AppScreen>;
  }

  return (
    <AppScreen scroll header={<Header title="Progress" />}>
      <View style={styles.section}><SectionHeader>Body</SectionHeader><Text style={styles.hint}>Weight and body measurements are tracked separately from lifting volume.</Text><AppButton label="Open Body Progress" variant="secondary" onPress={() => router.push('/body')} /></View>
      <View style={styles.section}>
        <DateRangeSelector value={datePreset} onChange={setDatePreset} />
        {datePreset === 'custom' && (
          <View style={styles.customRow}>
            <AppInput containerStyle={styles.customInput} label="From" placeholder="YYYY-MM-DD" value={customFrom} onChangeText={setCustomFrom} />
            <AppInput containerStyle={styles.customInput} label="To" placeholder="YYYY-MM-DD" value={customTo} onChangeText={setCustomTo} />
          </View>
        )}
        {dateError && <Text style={styles.error}>{dateError}</Text>}
      </View>

      {summary.overview.totalWorkouts === 0 ? (
        <EmptyState title="No data for this period" message="No training data is available for this period." />
      ) : (
        <>
          <View style={styles.section}>
            <SectionHeader>Training Overview</SectionHeader>
            <StatisticsGrid>
              <StatisticsCard label="Workouts" value={String(summary.overview.totalWorkouts)}
                comparison={<ComparisonBadge comparison={summary.comparison.totalWorkouts} label="vs. last period" />} />
              <StatisticsCard label="Strength Workouts" value={String(summary.overview.strengthWorkouts)} />
              <StatisticsCard label="Training Time" value={formatDurationMinutes(summary.overview.totalDurationSeconds)} />
              <StatisticsCard label="Avg Duration" value={formatDurationMinutes(summary.overview.averageWorkoutDurationSeconds)}
                comparison={<ComparisonBadge comparison={summary.comparison.averageWorkoutDurationSeconds} label="vs. last period" />} />
              <StatisticsCard label="Completed Sets" value={String(summary.overview.completedSets)} />
              <StatisticsCard label="Repetitions" value={String(summary.overview.totalRepetitions)} />
              <StatisticsCard label="Volume Lifted" value={formatVolumeKg(summary.overview.totalVolumeKg)}
                comparison={<ComparisonBadge comparison={summary.comparison.totalVolumeKg} label="vs. last period" />} />
              <StatisticsCard label="Personal Records" value={String(summary.overview.personalRecordCount)} />
            </StatisticsGrid>
          </View>

          <View style={styles.section}>
            <SectionHeader>Workout Consistency</SectionHeader>
            <StreakCard streak={summary.streak} />
            <ProgressChart type="bar" points={frequency.map((point) => ({ label: point.periodLabel, value: point.workoutCount }))}
              unitLabel="workouts" formatValue={(value) => value.toFixed(0)} emptyMessage="No workouts in this period." />
          </View>

          <View style={styles.section}>
            <SectionHeader>Volume Trend</SectionHeader>
            <Text style={styles.hint}>Total training volume (weight × reps) lifted per period, not your maximum weight.</Text>
            <ProgressChart type="line" points={volumeTrend.map((point) => ({ label: point.periodLabel, value: point.volumeKg }))}
              unitLabel="kg" emptyMessage="No strength volume in this period." />
          </View>
        </>
      )}

      <View style={styles.section}>
        <SectionHeader>Exercise Progress</SectionHeader>
        <ExerciseProgressSelector exercises={exercises} recentExerciseIds={recentExerciseIds}
          mostTrainedExerciseIds={mostTrainedExerciseIds} selectedExerciseId={selectedExerciseId} onSelect={setSelectedExerciseId} />
        {!selectedExerciseId ? (
          <EmptyState title="Select an exercise" message="Choose an exercise to view its progress." />
        ) : !exerciseDetail || exerciseDetail.points.length === 0 ? (
          <EmptyState title="No history yet" message="Keep training to see progress for this exercise." />
        ) : (
          <>
            <ExerciseProgressSummary summary={exerciseDetail.summary} />
            <MetricSelector value={chartMetric} onChange={setChartMetric}
              availableMetrics={exerciseDetail.summary.isBodyweight ? ['totalReps', 'bestSetVolume'] : undefined} />
            <ProgressChart type="line" unitLabel={chartMetric === 'totalReps' ? 'reps' : 'kg'}
              points={exerciseDetail.points
                .map((point) => ({ label: new Date(point.workoutDate).toLocaleDateString(), value: selectChartValue(point, chartMetric) }))
                .filter((point): point is { label: string; value: number } => point.value !== null)}
              emptyMessage="No data for this metric yet." />
            {exerciseRecords.length > 0 && (
              <View style={styles.recordList}>
                {exerciseRecords.slice(0, 5).map((record) => (
                  <PersonalRecordCard key={record.id} record={record} onPress={() => router.push({ pathname: '/workout/[id]', params: { id: record.workoutId } })} />
                ))}
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader>Personal Records</SectionHeader>
        {recentRecords.length === 0 ? (
          <EmptyState title="No records yet" message="Keep training to set your first personal record." />
        ) : recentRecords.map((record) => (
          <PersonalRecordCard key={record.id} record={{ ...record, previousValue: null }}
            onPress={() => router.push({ pathname: '/workout/[id]', params: { id: record.workoutId } })} />
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader>Most Trained Exercises</SectionHeader>
        <View style={styles.chipRow}>
          <FilterChip label="Sessions" selected={mostTrainedMetric === 'sessions'} onPress={() => setMostTrainedMetric('sessions')} />
          <FilterChip label="Sets" selected={mostTrainedMetric === 'sets'} onPress={() => setMostTrainedMetric('sets')} />
          <FilterChip label="Volume" selected={mostTrainedMetric === 'volume'} onPress={() => setMostTrainedMetric('volume')} />
        </View>
        {mostTrained.length === 0 ? <EmptyState title="No data for this period" message="No training data is available for this period." />
          : mostTrained.map((item, index) => (
            <View key={item.exerciseId} style={styles.rankRow}>
              <Text style={styles.rankNumber}>{index + 1}</Text>
              <View style={styles.rankContent}>
                <Text style={styles.rankName}>{item.exerciseName}</Text>
                <Text style={styles.rankMeta}>{item.sessionCount} sessions · {item.completedSetCount} sets · {formatVolumeKg(item.totalVolumeKg)}</Text>
              </View>
            </View>
          ))}
      </View>

      <View style={[styles.section, styles.lastSection]}>
        <SectionHeader>Muscle Group Distribution</SectionHeader>
        <Text style={styles.hint}>Grouped by each exercise&rsquo;s primary category, so a set is never counted twice.</Text>
        {muscleGroups.length === 0 ? <EmptyState title="No data for this period" message="No training data is available for this period." />
          : muscleGroups.map((item) => (
            <View key={item.category} style={styles.muscleRow}>
              <View style={styles.muscleLabelRow}><Text style={styles.muscleLabel}>{item.category}</Text><Text style={styles.muscleValue}>{item.completedSetCount} sets</Text></View>
              <View style={styles.muscleTrack}><View style={[styles.muscleBar, { width: `${Math.round((item.totalVolumeKg / maxMuscleVolume) * 100)}%` }]} /></View>
            </View>
          ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { gap: spacing.sm, marginBottom: spacing.xl },
  lastSection: { marginBottom: spacing.xxl },
  customRow: { flexDirection: 'row', gap: spacing.sm },
  customInput: { flex: 1 },
  error: { ...typography.caption, color: colors.danger },
  hint: { ...typography.caption, color: colors.textMuted },
  recordList: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginTop: spacing.xs },
  rankNumber: { ...typography.heading, color: colors.accent, width: 28, textAlign: 'center' },
  rankContent: { flex: 1, gap: 2 },
  rankName: { ...typography.body, fontWeight: '700', color: colors.text },
  rankMeta: { ...typography.caption, color: colors.textMuted },
  muscleRow: { gap: spacing.xs, marginTop: spacing.xs },
  muscleLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  muscleLabel: { ...typography.label, color: colors.text },
  muscleValue: { ...typography.caption, color: colors.textMuted },
  muscleTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceElevated, overflow: 'hidden' },
  muscleBar: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
});
