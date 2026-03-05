import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import { loadFridgeThunk, removeIngredient } from '../../store/slices/fridgeSlice';
import { loadRecipesThunk, deleteRecipe } from '../../store/slices/recipesSlice';
import * as Haptics from 'expo-haptics';

export default function ChefHomeScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const nav = useNavigation();
  const { ingredients } = useSelector(s => s.fridge);
  const { saved } = useSelector(s => s.recipes);

  useEffect(() => {
    dispatch(loadFridgeThunk());
    dispatch(loadRecipesThunk());
  }, []);

  const handleDelete = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete Recipe', 'Remove this recipe?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteRecipe(id)) },
    ]);
  };

  const diffColor = (d) =>
    d === 'Easy' ? colors.success :
    d === 'Medium' ? colors.warning :
    colors.error;

  const s = styles(colors);

  return (
    <SafeAreaView style={s.safe}>
      <FlatList
        data={saved}
        keyExtractor={(r, index) => r?.id ? String(r.id) : `recipe-${index}`}
        ListHeaderComponent={
          <View>
            <View style={s.fridgeCard}>
              <View style={s.fridgeTop}>
                <Text style={s.fridgeTitle}>🧊 My Fridge</Text>
                <Text style={s.fridgeCount}>{ingredients.length} items</Text>
              </View>
              <View style={s.chipRow}>
                {ingredients.slice(0, 6).map((i, index) => (
                  <TouchableOpacity
                    key={`${i?.name || 'ingredient'}-${index}`}
                    style={s.chip}
                    onLongPress={() => dispatch(removeIngredient(i.name))}
                  >
                    <Text style={s.chipText}>{i.name}</Text>
                  </TouchableOpacity>
                ))}
                {ingredients.length > 6 && (
                  <View style={s.chip}>
                    <Text style={s.chipText}>+{ingredients.length - 6} more</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={s.scanBtn} onPress={() => nav.push('FridgeScan')}>
                <Text style={s.scanBtnText}>📸 Scan Fridge</Text>
              </TouchableOpacity>
            </View>

            {ingredients.length > 0 && (
              <TouchableOpacity
                style={s.generateBtn}
                onPress={() => nav.push('RecipeResult')}
              >
                <Text style={s.generateBtnText}>✨ Generate Recipe from My Fridge</Text>
              </TouchableOpacity>
            )}

            <Text style={s.sectionTitle}>Saved Recipes ({saved.length})</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.recipeCard}
            onPress={() => nav.push('RecipeDetail', { recipe: item })}
            onLongPress={() => handleDelete(item.id)}
          >
            <View style={s.recipeTop}>
              <Text style={s.recipeTitle}>{item.title}</Text>
              <View style={[s.diffBadge, { backgroundColor: diffColor(item.difficulty) }]}>
                <Text style={s.diffText}>{item.difficulty}</Text>
              </View>
            </View>
            <Text style={s.recipeDesc} numberOfLines={2}>{item.description}</Text>
            <View style={s.recipeMeta}>
              <Text style={s.metaText}>⏱ {item.prepTime}</Text>
              <Text style={s.metaText}>🍽 {item.servings} servings</Text>
              <Text style={s.metaText}>🌍 {item.cuisine}</Text>
              {item.calories && <Text style={s.metaText}>🔥 {item.calories} cal</Text>}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={s.empty}>No saved recipes yet.{'\n'}Scan your fridge to get started!</Text>
        }
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
      />
    </SafeAreaView>
  );
}

const styles = (c) => StyleSheet.create({
  safe:            { flex: 1, backgroundColor: c.background },
  fridgeCard:      { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  fridgeTop:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  fridgeTitle:     { ...typography.h4, color: c.text },
  fridgeCount:     { ...typography.body, color: c.primary },
  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip:            { backgroundColor: c.surfaceSecond, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  chipText:        { ...typography.bodyS, color: c.textSecondary },
  scanBtn:         { backgroundColor: c.surfaceSecond, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  scanBtnText:     { ...typography.body, color: c.text },
  generateBtn:     { backgroundColor: c.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md, ...shadows.md },
  generateBtnText: { ...typography.h4, color: '#fff' },
  sectionTitle:    { ...typography.h3, color: c.text, marginBottom: spacing.sm },
  recipeCard:      { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, ...shadows.sm },
  recipeTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  recipeTitle:     { ...typography.h4, color: c.text, flex: 1, marginRight: spacing.sm },
  diffBadge:       { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  diffText:        { ...typography.label, color: '#fff' },
  recipeDesc:      { ...typography.bodyS, color: c.textSecondary, marginBottom: spacing.sm },
  recipeMeta:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaText:        { ...typography.bodyS, color: c.textMuted },
  empty:           { textAlign: 'center', ...typography.body, color: c.textMuted, marginTop: spacing.xxl, lineHeight: 28 },
});