// frontend/components/battle/ErrorBanner.tsx
import { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  message: string | null;
  errorId: number;
}

export function ErrorBanner({ message, errorId }: Props) {
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message || errorId === 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    slideY.setValue(-80);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideY, { toValue: -80, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 3000);
  }, [errorId]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.banner, { top: insets.top + 8, opacity, transform: [{ translateY: slideY }] }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', left: 16, right: 16, zIndex: 100,
    backgroundColor: '#450a0a', borderColor: '#7f1d1d', borderWidth: 1, borderRadius: 12,
    padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 10,
  },
  text: { color: '#fca5a5', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
