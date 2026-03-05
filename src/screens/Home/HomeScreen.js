import React, { useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import { loadFridgeThunk } from '../../store/slices/fridgeSlice';
import { loadRecipesThunk } from '../../store/slices/recipesSlice';
import { loadCartThunk } from '../../store/slices/cartSlice';
import { loadSettingsThunk, incrementStreak, setWeeklySummary } from '../../store/slices/settingsSlice';
import { generateWeeklySummary } from '../../utils/claudeApi';

export default function HomeScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const nav = useNavigation();

  const { ingredients } = useSelector(s => s.fridge);
  const { saved: savedRecipes } = useSelector(s => s.recipes);
  const { receipts, budgetGoal } = useSelector(s => s.cart);
  const { username, streak, weeklySummary } = useSelector(s => s.settings);

  const streakAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dispatch(loadFridgeThunk());
    dispatch(loadRecipesThunk());
    dispatch(loadCartThunk());
    dispatch(loadSettingsThunk());
    dispatch(incrementStreak());
  }, []);

  useEffect(() => {
    Animated.spring(streakAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 7,
    }).start();
  }, [streak]);

  const now = new Date();
  const monthlySpend = receipts
    .filter(r => {
      const d = new Date(r.scannedAt);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((s, r) => s + r.total, 0);

  const budgetPct = Math.min((monthlySpend / budgetGoal) * 100, 100);
  const budgetColor =
    budgetPct > 90 ? colors.error :
    budgetPct > 70 ? colors.warning :
    colors.primary;

  const fridgeScore = Math.min(ingredients.length * 10, 30);
  const budgetScore = Math.round((1 - budgetPct / 100) * 40);
  const streakScore = Math.min(streak * 5, 30);
  const dailyScore = fridgeScore + budgetScore + streakScore;

  useEffect(() => {
    if (!weeklySummary && savedRecipes.length > 0) {
      generateWeeklySummary({
        recipesCooked: savedRecipes.length,
        totalSpend: monthlySpend,
        budgetGoal,
        topIngredients: ingredients.slice(0, 3).map(i => i.name),
        streak,
      }).then(s => dispatch(setWeeklySummary(s)));
    }
  }, [savedRecipes.length]);

  const getTimeOfDay = () => {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  };

  const handleStatPress = (label) => {
    if (label === 'Receipts') {
      nav.navigate('CartTab', { screen: 'CartHome' });
      return;
    }
    nav.navigate('ChefTab', { screen: 'ChefHome' });
  };

  const s = styles(colors);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Good {getTimeOfDay()} 👋</Text>
            <Text style={s.name}>{username}</Text>
          </View>
          <Animated.View style={[s.scoreCircle, { transform: [{ scale: streakAnim }] }]}>
            <Text style={s.scoreNum}>{dailyScore}</Text>
            <Text style={s.scoreLabel}>score</Text>
          </Animated.View>
        </View>

        {/* Streak */}
        <View style={s.card}>
          <Text style={s.cardTitle}>🔥 Cooking Streak</Text>
          <Text style={s.streakNum}>{streak} days</Text>
          <Text style={s.cardSub}>Keep logging meals to maintain your streak!</Text>
        </View>

        {/* Budget Bar */}
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.cardTitle}>💰 Monthly Budget</Text>
            <Text style={[s.budgetAmt, { color: budgetColor }]}>
              ${monthlySpend.toFixed(2)} / ${budgetGoal}
            </Text>
          </View>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${budgetPct}%`, backgroundColor: budgetColor }]} />
          </View>
          <Text style={s.cardSub}>{(100 - budgetPct).toFixed(0)}% of budget remaining</Text>
        </View>

        {/* Quick Actions */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => nav.navigate('ChefTab', { screen: 'FridgeScan' })}
          >
            <Text style={s.actionEmoji}>📸</Text>
            <Text style={s.actionLabel}>Scan Fridge</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => nav.navigate('CartTab', { screen: 'ReceiptScan' })}
          >
            <Text style={s.actionEmoji}>🧾</Text>
            <Text style={s.actionLabel}>Scan Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => nav.navigate('ChefTab', { screen: 'ChefHome' })}
          >
            <Text style={s.actionEmoji}>🍳</Text>
            <Text style={s.actionLabel}>My Recipes</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <Text style={s.sectionTitle}>This Month</Text>
        <View style={s.statsRow}>
          {[
            { emoji: '🥦', val: ingredients.length, label: 'Ingredients' },
            { emoji: '📖', val: savedRecipes.length, label: 'Recipes' },
            { emoji: '🧾', val: receipts.length, label: 'Receipts' },
          ].map(stat => (
            <TouchableOpacity
              key={stat.label}
              style={s.statCard}
              onPress={() => handleStatPress(stat.label)}
              activeOpacity={0.8}
            >
              <Text style={s.statEmoji}>{stat.emoji}</Text>
              <Text style={s.statVal}>{stat.val}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AI Summary */}
        {weeklySummary ? (
          <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
            <Text style={s.cardTitle}>🤖 AI Weekly Insight</Text>
            <Text style={[s.cardSub, { marginTop: spacing.sm }]}>{weeklySummary}</Text>
          </View>
        ) : null}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c) => StyleSheet.create({
  safe:         { flex: 1, backgroundColor: c.background },
  scroll:       { flex: 1, paddingHorizontal: spacing.md },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.md },
  greeting:     { ...typography.body, color: c.textSecondary },
  name:         { ...typography.h2, color: c.text },
  scoreCircle:  { width: 64, height: 64, borderRadius: 32, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  scoreNum:     { ...typography.h3, color: '#fff' },
  scoreLabel:   { ...typography.caption, color: 'rgba(255,255,255,0.8)' },
  card:         { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  cardTitle:    { ...typography.h4, color: c.text, marginBottom: spacing.xs },
  cardSub:      { ...typography.bodyS, color: c.textSecondary },
  streakNum:    { ...typography.h1, color: c.primary },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetAmt:    { ...typography.h4 },
  barBg:        { height: 8, backgroundColor: c.surfaceSecond, borderRadius: radius.full, marginVertical: spacing.sm, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: radius.full },
  sectionTitle: { ...typography.h4, color: c.text, marginBottom: spacing.sm },
  actionsRow:   { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actionBtn:    { flex: 1, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', ...shadows.sm },
  actionEmoji:  { fontSize: 28, marginBottom: spacing.xs },
  actionLabel:  { ...typography.label, color: c.textSecondary, textAlign: 'center' },
  statsRow:     { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard:     { flex: 1, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', ...shadows.sm },
  statEmoji:    { fontSize: 24 },
  statVal:      { ...typography.h2, color: c.primary },
  statLabel:    { ...typography.caption, color: c.textSecondary },
});