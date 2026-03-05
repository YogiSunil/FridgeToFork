import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import ChefHomeScreen from '../screens/Chef/ChefHomeScreen';
import FridgeScanScreen from '../screens/Chef/FridgeScanScreen';
import RecipeResultScreen from '../screens/Chef/RecipeResultScreen';
import RecipeDetailScreen from '../screens/Chef/RecipeDetailScreen';

const Stack = createNativeStackNavigator();

export default function ChefStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="ChefHome"
        component={ChefHomeScreen}
        options={{ title: 'My Kitchen' }}
      />
      <Stack.Screen
        name="FridgeScan"
        component={FridgeScanScreen}
        options={{ title: 'Scan Fridge' }}
      />
      <Stack.Screen
        name="RecipeResult"
        component={RecipeResultScreen}
        options={{ title: 'Your Recipe' }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ title: 'Recipe Detail' }}
      />
    </Stack.Navigator>
  );
}