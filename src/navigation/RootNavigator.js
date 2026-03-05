import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { shadows } from '../theme';
import HomeStack from './HomeStack';
import ChefStack from './ChefStack';
import CartStack from './CartStack';
import SettingsStack from './SettingsStack';

const Tab = createBottomTabNavigator();

const TabIcon = ({ emoji, label, focused, color }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 3, width: 72 }}>
    <Text style={{ fontSize: focused ? 24 : 20 }}>{emoji}</Text>
    <Text
      numberOfLines={1}
      ellipsizeMode="clip"
      style={{
        fontSize: 10,
        color,
        fontWeight: focused ? '600' : '400',
        marginTop: 2,
        textAlign: 'center',
        width: '100%',
      }}
    >
      {label}
    </Text>
  </View>
);

export default function RootNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          ...shadows.sm,
        },
        tabBarItemStyle: {
          paddingHorizontal: 2,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ChefTab"
        component={ChefStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🍳" label="Chef" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🛒" label="Cart" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="⚙️" label="Settings" focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}