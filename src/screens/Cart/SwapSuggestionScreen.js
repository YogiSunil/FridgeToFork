import React from 'react';
import {
  View, Text, FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';

export default function SwapSuggestionScreen({ route }) {
  const { colors } = useTheme();
  const { swaps = [], items = [] } = route.params || {};
  const s = styles(colors);

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={swaps}
        keyExtractor={(_, i) => i.toString()}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.title}>💡 Swap Suggestions</Text>
            <Text style={s.sub}>{swaps.length} suggestions for {items.length} items</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.original}>❌ {item.original}</Text>
            {item.healthierSwap && (
              <View style={s.swapRow}>
                <Text style={s.swapHealthy}>✅ {item.healthierSwap}</Text>
                <Text style={s.reason}>{item.healthierReason}</Text>
              </View>
            )}
            {item.cheaperSwap && (
              <View style={s.swapRow}>
                <Text style={s.swapCheap}>💰 {item.cheaperSwap}</Text>
                <Text style={s.reason}>
                  {item.cheaperReason}
                  {item.savings ? ` • Save $${item.savings}` : ''}
                </Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={s.empty}>No swap suggestions available.</Text>
        }
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
      />
    </SafeAreaView>
  );
}

const styles = (c) => StyleSheet.create({
  safe:        { flex: 1, backgroundColor: c.background },
  header:      { marginBottom: spacing.md },
  title:       { ...typography.h2, color: c.text },
  sub:         { ...typography.body, color: c.textSecondary, marginTop: spacing.xs },
  card:        { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  original:    { ...typography.body, color: c.error, marginBottom: spacing.xs },
  swapRow:     { marginTop: spacing.xs },
  swapHealthy: { ...typography.body, color: c.success },
  swapCheap:   { ...typography.body, color: c.primary },
  reason:      { ...typography.bodyS, color: c.textSecondary, marginTop: 2 },
  empty:       { textAlign: 'center', ...typography.body, color: c.textMuted, marginTop: spacing.xxl },
});