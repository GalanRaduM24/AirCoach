import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import { HomeScreen } from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HomeNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="HomeTab" component={HomeScreen} />
  </Stack.Navigator>
);

const PlaceholderScreen = () => null;

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Map') {
              iconName = focused ? 'map' : 'map-outline';
            } else if (route.name === 'Agent') {
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            } else if (route.name === 'Devices') {
              iconName = focused ? 'settings' : 'settings-outline';
            }

            return (
              <Ionicons
                name={iconName}
                size={size}
                color={color}
              />
            );
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            borderTopColor: '#E0E0E0',
            borderTopWidth: 1,
            backgroundColor: '#fff',
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeNavigator}
          options={{
            tabBarLabel: 'Home',
          }}
        />
        <Tab.Screen
          name="Map"
          component={PlaceholderScreen}
          options={{
            tabBarLabel: 'Map',
          }}
        />
        <Tab.Screen
          name="Agent"
          component={PlaceholderScreen}
          options={{
            tabBarLabel: 'Agent',
          }}
        />
        <Tab.Screen
          name="Devices"
          component={PlaceholderScreen}
          options={{
            tabBarLabel: 'Devices',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
