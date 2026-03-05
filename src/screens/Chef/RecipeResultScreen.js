import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import { generateRecipeThunk, saveRecipe, setSelectedCuisine } from '../../store/slices/recipesSlice';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const CUISINES = ['Any', 'Italian', 'Asian', 'Mexican', 'Indian', 'American', 'Mediterranean'];

export default function RecipeResultScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const nav = useNavigation();
  const { ingredients } = useSelector(s => s.fridge);
  const { generated, loading, error, selectedCuisine } = useSelector(s => s.recipes);
  const safeIngredients = Array.isArray(generated?.ingredients) ? generated.ingredients : [];
  const safeSteps = Array.isArray(generated?.steps) ? generated.steps : [];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const generate = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    dispatch(generateRecipeThunk({
      ingredients,
      cuisine: selectedCuisine === 'Any' ? undefined : selectedCuisine,
    })).then(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleSave = () => {
    if (!generated) return;
    dispatch(saveRecipe(generated));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('✅ Saved!', 'Recipe added to your cookbook.');
  };

  const handleShare = async () => {
    if (!generated) return;
    const text = `🍳 ${generated.title}\n\n${generated.description}\n\nIngredients:\n${safeIngredients.map(i => `• ${i.amount} ${i.name}`).join('\n')}\n\nSteps:\n${safeSteps.map(s => `${s.step}. ${s.instruction}`).join('\n')}\n\nShared from FridgeToFork 🥦`;
    const uri = `${FileSystem.cacheDirectory}recipe.txt`;
    await FileSystem.writeAsStringAsync(uri, text);
    await Sharing.shareAsync(uri);
  };

  const s = styles(colors);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>

        {/* Cuisine Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          {CUISINES.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.cuisineChip, selectedCuisine === c && s.cuisineActive]}
              onPress={() => dispatch(setSelectedCuisine(c))}
            >
              <Text style={[s.cuisineText, selectedCuisine === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Generate Button */}
        <TouchableOpacity
          style={[s.genBtn, (loading || ingredients.length === 0) && { opacity: 0.6 }]}
          onPress={generate}
          disabled={loading || ingredients.length === 0}
        >
          <Text style={s.genBtnText}>
            {loading ? '🤖 AI is cooking...' : '✨ Generate Recipe'}
          </Text>
        </TouchableOpacity>

        {ingredients.length === 0 && (
          <Text style={s.noIngredients}>
            No ingredients found. Scan your fridge first!
          </Text>
        )}

        {/* Loading */}
        {loading && (
          <View style={s.loadingCard}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={s.loadingText}>AI is creating your perfect recipe...</Text>
          </View>
        )}

        {/* Error */}
        {error && !loading && (
          <View style={s.errorCard}>
            <Text style={s.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={generate}>
              <Text style={s.retryText}>Tap to Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recipe Result */}
        {generated && !loading && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={s.recipeCard}>
              <Text style={s.recipeTitle}>{generated.title}</Text>
              <Text style={s.recipeDesc}>{generated.description}</Text>

              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <Text style={s.metaEmoji}>⏱</Text>
                  <Text style={s.metaText}>{generated.prepTime}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.metaEmoji}>🍳</Text>
                  <Text style={s.metaText}>{generated.cookTime}</Text>
                </View>
                <View style={s.metaItem}>
                  <Text style={s.metaEmoji}>👥</Text>
                  <Text style={s.metaText}>{generated.servings}</Text>
                </View>
                {generated.calories && (
                  <View style={s.metaItem}>
                    <Text style={s.metaEmoji}>🔥</Text>
                    <Text style={s.metaText}>{generated.calories}</Text>
                  </View>
                )}
              </View>

              <Text style={s.sectionHead}>Ingredients</Text>
              {safeIngredients.map((ing, i) => (
                <Text key={i} style={s.listItem}>• {ing.amount} {ing.name}</Text>
              ))}

              <Text style={s.sectionHead}>Instructions</Text>
              {safeSteps.map(step => (
                <View key={step.step} style={s.stepRow}>
                  <View style={s.stepNum}>
                    <Text style={s.stepNumText}>{step.step}</Text>
                  </View>
                  <Text style={s.stepText}>{step.instruction}</Text>
                </View>
              ))}

              {generated.tips && (
                <View style={s.tipsCard}>
                  <Text style={s.tipsTitle}>💡 Chef's Tip</Text>
                  <Text style={s.tipsText}>{generated.tips}</Text>
                </View>
              )}
            </View>

            <View style={s.actionsRow}>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>💾 Save Recipe</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
                <Text style={s.shareBtnText}>📤 Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={s.detailBtn}
              onPress={() => nav.push('RecipeDetail', { recipe: generated })}
            >
              <Text style={s.detailBtnText}>📋 View Full Detail</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c) => StyleSheet.create({
  safe:           { flex: 1, backgroundColor: c.background },
  cuisineChip:    { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: c.surface, marginRight: spacing.xs, ...shadows.sm },
  cuisineActive:  { backgroundColor: c.primary },
  cuisineText:    { ...typography.label, color: c.textSecondary },
  genBtn:         { backgroundColor: c.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md, ...shadows.md },
  genBtnText:     { ...typography.h4, color: '#fff' },
  noIngredients:  { ...typography.body, color: c.textMuted, textAlign: 'center', marginBottom: spacing.md },
  loadingCard:    { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md },
  loadingText:    { ...typography.body, color: c.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  errorCard:      { backgroundColor: c.error + '20', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, alignItems: 'center' },
  errorText:      { ...typography.body, color: c.error },
  retryText:      { ...typography.body, color: c.primary, marginTop: spacing.sm },
  recipeCard:     { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.md },
  recipeTitle:    { ...typography.h2, color: c.text, marginBottom: spacing.xs },
  recipeDesc:     { ...typography.body, color: c.textSecondary, marginBottom: spacing.md },
  metaRow:        { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: c.surfaceSecond, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  metaItem:       { alignItems: 'center' },
  metaEmoji:      { fontSize: 20 },
  metaText:       { ...typography.caption, color: c.textSecondary, marginTop: 2 },
  sectionHead:    { ...typography.h4, color: c.text, marginTop: spacing.md, marginBottom: spacing.sm },
  listItem:       { ...typography.body, color: c.textSecondary, marginBottom: 4 },
  stepRow:        { flexDirection: 'row', marginBottom: spacing.sm, alignItems: 'flex-start' },
  stepNum:        { width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm, marginTop: 2 },
  stepNumText:    { ...typography.label, color: '#fff' },
  stepText:       { ...typography.body, color: c.text, flex: 1, lineHeight: 22 },
  tipsCard:       { backgroundColor: c.primary + '20', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  tipsTitle:      { ...typography.h4, color: c.primary, marginBottom: spacing.xs },
  tipsText:       { ...typography.body, color: c.text },
  actionsRow:     { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  saveBtn:        { flex: 1, backgroundColor: c.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', ...shadows.sm },
  saveBtnText:    { ...typography.h4, color: '#fff' },
  shareBtn:       { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', paddingHorizontal: spacing.lg, ...shadows.sm },
  shareBtnText:   { ...typography.h4, color: c.text },
  detailBtn:      { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', ...shadows.sm },
  detailBtnText:  { ...typography.body, color: c.textSecondary },
});