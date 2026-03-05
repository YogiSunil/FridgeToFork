import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import CartHomeScreen from '../screens/Cart/CartHomeScreen';
import ReceiptScanScreen from '../screens/Cart/ReceiptScanScreen';
import SwapSuggestionScreen from '../screens/Cart/SwapSuggestionScreen';

const Stack = createNativeStackNavigator();

export default function CartStack() {
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
        name="CartHome"
        component={CartHomeScreen}
        options={{ title: 'Smart Cart' }}
      />
      <Stack.Screen
        name="ReceiptScan"
        component={ReceiptScanScreen}
        options={{ title: 'Scan Receipt' }}
      />
      <Stack.Screen
        name="SwapSuggestion"
        component={SwapSuggestionScreen}
        options={{ title: 'Healthier Swaps' }}
      />
    </Stack.Navigator>
  );
}