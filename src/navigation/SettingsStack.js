import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import SettingsHomeScreen from '../screens/Settings/SettingsHomeScreen';
import BudgetGoalScreen from '../screens/Settings/BudgetGoalScreen';

const Stack = createNativeStackNavigator();

export default function SettingsStack() {
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
        name="SettingsHome"
        component={SettingsHomeScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="BudgetGoal"
        component={BudgetGoalScreen}
        options={{ title: 'Budget Goal' }}
      />
    </Stack.Navigator>
  );
}
