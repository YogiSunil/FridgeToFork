import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import { loadCartThunk } from '../../store/slices/cartSlice';

const getLast7Days = (receipts) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const total = receipts
      .filter(r => new Date(r.scannedAt).toDateString() === d.toDateString())
      .reduce((s, r) => s + r.total, 0);
    return { day: days[d.getDay()], total, isToday: i === 6 };
  });
};

export default function CartHomeScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const nav = useNavigation();
  const { receipts, budgetGoal } = useSelector(s => s.cart);

  useEffect(() => { dispatch(loadCartThunk()); }, []);

  const now = new Date();
  const monthlySpend = receipts
    .filter(r => {
      const d = new Date(r.scannedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, r) => s + r.total, 0);

  const budgetPct = Math.min((monthlySpend / budgetGoal) * 100, 100);
  const budgetColor =
    budgetPct > 90 ? colors.error :
    budgetPct > 70 ? colors.warning :
    colors.primary;

  const weeklyData = getLast7Days(receipts);
  const s = styles(colors);

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={receipts}
        keyExtractor={r => r.id}
        ListHeaderComponent={
          <View>
            {/* Budget Card */}
            <View style={s.card}>
              <Text style={s.cardTitle}>💰 Monthly Budget</Text>
              <View style={s.budgetRow}>
                <Text style={[s.spendAmt, { color: budgetColor }]}>
                  ${monthlySpend.toFixed(2)}
                </Text>
                <Text style={s.budgetOf}>of ${budgetGoal}</Text>
              </View>
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${budgetPct}%`, backgroundColor: budgetColor }]} />
              </View>
              <Text style={s.cardSub}>
                ${(budgetGoal - monthlySpend).toFixed(2)} remaining this month
              </Text>
            </View>

            {/* Weekly Chart */}
            <View style={s.card}>
              <Text style={s.cardTitle}>📊 Last 7 Days</Text>
              <View style={s.barsRow}>
                {weeklyData.map(d => {
                  const maxVal = Math.max(...weeklyData.map(x => x.total), 1);
                  const h = Math.max((d.total / maxVal) * 80, 4);
                  return (
                    <View key={d.day} style={s.barCol}>
                      <Text style={s.barAmt}>
                        {d.total > 0 ? `$${d.total.toFixed(0)}` : ''}
                      </Text>
                      <View style={[
                        s.barRect,
                        { height: h, backgroundColor: d.isToday ? colors.primary : colors.primary + '60' },
                      ]} />
                      <Text style={s.barDay}>{d.day}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity style={s.scanBtn} onPress={() => nav.push('ReceiptScan')}>
              <Text style={s.scanBtnText}>📸 Scan New Receipt</Text>
            </TouchableOpacity>

            <Text style={s.sectionTitle}>Receipt History ({receipts.length})</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.receiptCard}>
            <View style={s.receiptTop}>
              <Text style={s.receiptDate}>
                {new Date(item.scannedAt).toLocaleDateString()}
              </Text>
              <Text style={[s.receiptTotal, { color: colors.primary }]}>
                ${item.total.toFixed(2)}
              </Text>
            </View>
            <Text style={s.receiptItems}>{item.items.length} items scanned</Text>
            {item.swaps && item.swaps.length > 0 && (
              <TouchableOpacity
                style={s.swapsBadge}
                onPress={() => nav.push('SwapSuggestion', { swaps: item.swaps, items: item.items })}
              >
                <Text style={s.swapsBadgeText}>
                  💡 {item.swaps.length} swap suggestions
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <Text style={s.empty}>No receipts yet.{'\n'}Scan a receipt to start tracking!</Text>
        }
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
      />
    </SafeAreaView>
  );
}

const styles = (c) => StyleSheet.create({
  safe:          { flex: 1, backgroundColor: c.background },
  card:          { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  cardTitle:     { ...typography.h4, color: c.text, marginBottom: spacing.sm },
  cardSub:       { ...typography.bodyS, color: c.textSecondary },
  budgetRow:     { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.sm },
  spendAmt:      { ...typography.h1 },
  budgetOf:      { ...typography.body, color: c.textSecondary },
  barBg:         { height: 10, backgroundColor: c.surfaceSecond, borderRadius: radius.full, marginBottom: spacing.xs, overflow: 'hidden' },
  barFill:       { height: '100%', borderRadius: radius.full },
  barsRow:       { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110, marginTop: spacing.sm },
  barCol:        { alignItems: 'center', flex: 1 },
  barAmt:        { ...typography.caption, color: c.textMuted, marginBottom: 2 },
  barRect:       { width: 24, borderRadius: 4 },
  barDay:        { ...typography.caption, color: c.textSecondary, marginTop: 4 },
  scanBtn:       { backgroundColor: c.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md, ...shadows.md },
  scanBtnText:   { ...typography.h4, color: '#fff' },
  sectionTitle:  { ...typography.h3, color: c.text, marginBottom: spacing.sm },
  receiptCard:   { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  receiptTop:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  receiptDate:   { ...typography.body, color: c.textSecondary },
  receiptTotal:  { ...typography.h4 },
  receiptItems:  { ...typography.bodyS, color: c.textMuted },
  swapsBadge:    { backgroundColor: c.primary + '20', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, marginTop: spacing.xs, alignSelf: 'flex-start' },
  swapsBadgeText:{ ...typography.label, color: c.primary },
  empty:         { textAlign: 'center', ...typography.body, color: c.textMuted, marginTop: spacing.xxl, lineHeight: 28 },
});