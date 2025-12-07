import React, { ReactNode, useRef } from 'react';
import { PanResponder, PanResponderGestureState, View } from 'react-native';
import { router } from 'expo-router';

interface SwipeNavigatorProps {
  children: ReactNode;
  currentRoute: string; // use simple route names: 'index' | 'agent' | 'devices'
  routeOrder?: string[];
  swipeThreshold?: number;
  disabled?: boolean;
}

const DEFAULT_ROUTES = ['index', 'agent', 'devices'];

export const SwipeNavigator: React.FC<SwipeNavigatorProps> = ({
  children,
  currentRoute,
  routeOrder = DEFAULT_ROUTES,
  swipeThreshold = 28,
  disabled = false,
}) => {
  const routes = routeOrder;
  const currentIndex = routes.indexOf(currentRoute);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < routes.length - 1;

  const navigateTo = (index: number) => {
    const target = routes[index];
    if (!target) return;
    // Handle home route specifically
    if (target === 'index') {
      router.navigate('/(tabs)' as any);
    } else {
      router.navigate(`/(tabs)/${target}` as any);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) => {
        if (disabled) return false;
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      },
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        const { dx } = gestureState;
        if (dx > swipeThreshold && hasPrev) {
          navigateTo(currentIndex - 1);
        } else if (dx < -swipeThreshold && hasNext) {
          navigateTo(currentIndex + 1);
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...(disabled ? {} : panResponder.panHandlers)}>
      {children}
    </View>
  );
};
