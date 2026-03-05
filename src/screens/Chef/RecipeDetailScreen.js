import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, radius, typography, shadows } from '../../theme';
import * as Haptics from 'expo-haptics';

export default function RecipeDetailScreen({ route }) {
  const { colors } = useTheme();
  const recipe = route?.params?.recipe || {};
  const safeIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const safeSteps = Array.isArray(recipe.steps) ? recipe.steps : [];
  const [activeStep, setActiveStep] = useState(0);
  const s = styles(colors);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        <Text style={s.title}>{recipe.title}</Text>
        <Text style={s.desc}>{recipe.description}</Text>

        <View style={s.metaRow}>
          <View style={s.metaItem}><Text style={s.metaEmoji}>⏱</Text><Text style={s.metaText}>{recipe.prepTime}</Text></View>
          <View style={s.metaItem}><Text style={s.metaEmoji}>🍳</Text><Text style={s.metaText}>{recipe.cookTime}</Text></View>
          <View style={s.metaItem}><Text style={s.metaEmoji}>👥</Text><Text style={s.metaText}>{recipe.servings} servings</Text></View>
          {recipe.calories && <View style={s.metaItem}><Text style={s.metaEmoji}>🔥</Text><Text style={s.metaText}>{recipe.calories} cal</Text></View>}
        </View>

        <Text style={s.sectionHead}>Ingredients</Text>
        {safeIngredients.map((ing, i) => (
          <Text key={i} style={s.listItem}>• {ing.amount} {ing.name}</Text>
        ))}

        <Text style={s.sectionHead}>Step-by-Step</Text>
        {safeSteps.map((step, i) => (
          <TouchableOpacity
            key={step.step}
            style={[
              s.stepRow,
              activeStep === i && { backgroundColor: colors.primary + '15', borderRadius: radius.md, padding: spacing.xs },
            ]}
            onPress={() => {
              setActiveStep(i);
              Haptics.selectionAsync();
            }}
          >
            <View style={[s.stepNum, { backgroundColor: activeStep === i ? colors.primary : colors.surfaceSecond }]}>
              <Text style={[s.stepNumText, { color: activeStep === i ? '#fff' : colors.textSecondary }]}>
                {step.step}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepText}>{step.instruction}</Text>
              {step.duration && (
                <Text style={s.stepDuration}>⏱ {step.duration}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {recipe.tips && (
          <View style={s.tipsCard}>
            <Text style={s.tipsTitle}>💡 Chef's Tip</Text>
            <Text style={s.tipsText}>{recipe.tips}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (c) => StyleSheet.create({
  safe:        { flex: 1, backgroundColor: c.background },
  title:       { ...typography.h2, color: c.text, marginBottom: spacing.xs },
  desc:        { ...typography.body, color: c.textSecondary, marginBottom: spacing.md },
  metaRow:     { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: c.surface, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md, ...shadows.sm },
  metaItem:    { alignItems: 'center' },
  metaEmoji:   { fontSize: 20 },
  metaText:    { ...typography.caption, color: c.textSecondary, marginTop: 2 },
  sectionHead: { ...typography.h4, color: c.text, marginTop: spacing.md, marginBottom: spacing.sm },
  listItem:    { ...typography.body, color: c.textSecondary, marginBottom: 4 },
  stepRow:     { flexDirection: 'row', marginBottom: spacing.sm, alignItems: 'flex-start' },
  stepNum:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm, marginTop: 2 },
  stepNumText: { ...typography.label },
  stepText:    { ...typography.body, color: c.text, flex: 1, lineHeight: 22 },
  stepDuration:{ ...typography.bodyS, color: c.textMuted, marginTop: 2 },
  tipsCard:    { backgroundColor: c.primary + '20', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  tipsTitle:   { ...typography.h4, color: c.primary, marginBottom: spacing.xs },
  tipsText:    { ...typography.body, color: c.text },
});