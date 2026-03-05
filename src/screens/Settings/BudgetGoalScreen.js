import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import { setBudgetGoal } from '../../store/slices/cartSlice';
import * as Haptics from 'expo-haptics';

const PRESETS = [100, 150, 200, 300, 400, 500];

export default function BudgetGoalScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const nav = useNavigation();
  const { budgetGoal } = useSelector(s => s.cart);
  const [input, setInput] = useState(budgetGoal.toString());
  const s = styles(colors);

  const handleSave = () => {
    const val = parseInt(input, 10);
    if (!isNaN(val) && val > 0) {
      dispatch(setBudgetGoal(val));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      nav.goBack();
    } else {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount.');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={s.title}>Set Monthly Budget</Text>
        <Text style={s.sub}>
          We'll alert you when you're close to your food spending limit.
        </Text>

        <View style={s.inputCard}>
          <Text style={s.inputLabel}>CUSTOM AMOUNT</Text>
          <View style={s.inputRow}>
            <Text style={s.dollar}>$</Text>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              keyboardType="numeric"
              placeholder="200"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <Text style={s.presetsLabel}>QUICK SELECT</Text>
        <View style={s.presetsRow}>
          {PRESETS.map(p => (
            <TouchableOpacity
              key={p}
              style={[s.presetBtn, parseInt(input) === p && s.presetActive]}
              onPress={() => { setInput(p.toString()); Haptics.selectionAsync(); }}
            >
              <Text style={[s.presetText, parseInt(input) === p && { color: '#fff' }]}>
                ${p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnText}>Save Budget Goal</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c) => StyleSheet.create({
  safe:         { flex: 1, backgroundColor: c.background },
  title:        { ...typography.h2, color: c.text, marginBottom: spacing.sm },
  sub:          { ...typography.body, color: c.textSecondary, marginBottom: spacing.xl },
  inputCard:    { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg, ...shadows.sm },
  inputLabel:   { ...typography.label, color: c.textSecondary, marginBottom: spacing.sm },
  inputRow:     { flexDirection: 'row', alignItems: 'center' },
  dollar:       { ...typography.h2, color: c.primary, marginRight: spacing.xs },
  input:        { ...typography.h2, color: c.text, flex: 1 },
  presetsLabel: { ...typography.label, color: c.textSecondary, marginBottom: spacing.sm },
  presetsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  presetBtn:    { backgroundColor: c.surface, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...shadows.sm },
  presetActive: { backgroundColor: c.primary },
  presetText:   { ...typography.body, color: c.text },
  saveBtn:      { backgroundColor: c.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', ...shadows.md },
  saveBtnText:  { ...typography.h4, color: '#fff' },
});