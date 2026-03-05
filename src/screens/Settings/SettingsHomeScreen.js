import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Switch, ScrollView, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import { setUsername, setNotifications } from '../../store/slices/settingsSlice';
import { clearFridge } from '../../store/slices/fridgeSlice';
import { clearAll } from '../../utils/storage';
import { requestNotificationPermission, scheduleDailyMealReminder, cancelAllNotifications } from '../../utils/notifications';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';

export default function SettingsHomeScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const dispatch = useDispatch();
  const nav = useNavigation();
  const { username, notificationsEnabled, streak } = useSelector(s => s.settings);
  const { budgetGoal } = useSelector(s => s.cart);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(username);
  const s = styles(colors);

  const handleThemeToggle = () => {
    Haptics.selectionAsync();
    toggleTheme();
  };

  const handleNotifToggle = async (val) => {
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Permission Denied', 'Enable notifications in your device Settings.');
        return;
      }
      await scheduleDailyMealReminder();
    } else {
      await cancelAllNotifications();
    }
    dispatch(setNotifications(val));
    Haptics.selectionAsync();
  };

  const handleSaveName = () => {
    dispatch(setUsername(nameInput.trim() || 'Chef'));
    setEditingName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleClearData = () => {
    Alert.alert(
      '⚠️ Clear All Data',
      'This will delete all your recipes, receipts, and fridge data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            dispatch(clearFridge());
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('✅ Cleared', 'All data has been removed.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>

        {/* Profile */}
        <Text style={s.section}>Profile</Text>
        <View style={s.card}>
          <View style={s.avatarRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{username.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              {editingName ? (
                <View style={s.nameEditRow}>
                  <TextInput
                    style={s.nameInput}
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoFocus
                    placeholder="Your name"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity onPress={handleSaveName} style={s.saveNameBtn}>
                    <Text style={s.saveNameText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setEditingName(true)}>
                  <Text style={s.username}>{username}</Text>
                  <Text style={s.editHint}>Tap to edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={s.streakBadge}>
            <Text style={s.streakText}>🔥 {streak}-day streak</Text>
          </View>
        </View>

        {/* Preferences */}
        <Text style={s.section}>Preferences</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>🌙 Dark Mode</Text>
            <Switch
              value={isDark}
              onValueChange={handleThemeToggle}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <Text style={s.rowLabel}>🔔 Daily Reminders</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotifToggle}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <View style={s.divider} />
          <TouchableOpacity onPress={() => nav.push('BudgetGoal')}>
            <View style={s.row}>
              <Text style={s.rowLabel}>💰 Monthly Budget Goal</Text>
              <Text style={s.rowValue}>${budgetGoal} ›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={s.section}>About</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>📱 Version</Text>
            <Text style={s.rowValue}>1.0.0</Text>
          </View>
          <View style={s.divider} />
          <TouchableOpacity onPress={() => Linking.openURL('https://aimlapi.com')}>
            <View style={s.row}>
              <Text style={s.rowLabel}>🤖 Powered by AI/ML API</Text>
              <Text style={s.rowValue}>Visit ›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text style={s.section}>Data</Text>
        <TouchableOpacity style={s.dangerBtn} onPress={handleClearData}>
          <Text style={s.dangerText}>🗑️ Clear All Data</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c) => StyleSheet.create({
  safe:         { flex: 1, backgroundColor: c.background },
  section:      { ...typography.label, color: c.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md, textTransform: 'uppercase' },
  card:         { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  avatarRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar:       { width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { ...typography.h2, color: '#fff' },
  username:     { ...typography.h4, color: c.text },
  editHint:     { ...typography.bodyS, color: c.textMuted },
  nameEditRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nameInput:    { flex: 1, ...typography.body, color: c.text, borderBottomWidth: 1, borderBottomColor: c.primary, paddingVertical: 4 },
  saveNameBtn:  { backgroundColor: c.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  saveNameText: { ...typography.label, color: '#fff' },
  streakBadge:  { backgroundColor: c.primary + '20', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, alignSelf: 'flex-start', marginTop: spacing.sm },
  streakText:   { ...typography.label, color: c.primary },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  rowLabel:     { ...typography.body, color: c.text },
  rowValue:     { ...typography.body, color: c.textSecondary },
  divider:      { height: 1, backgroundColor: c.border },
  dangerBtn:    { backgroundColor: c.error + '15', borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: c.error + '30' },
  dangerText:   { ...typography.body, color: c.error },
});