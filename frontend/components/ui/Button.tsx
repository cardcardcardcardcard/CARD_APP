// frontend/components/ui/Button.tsx
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}

export function Button({ title, onPress, loading, disabled, variant = 'primary', style }: Props) {
  const bg = variant === 'primary' ? '#6366f1' : variant === 'danger' ? '#ef4444' : '#e5e7eb';
  const textColor = variant === 'secondary' ? '#111827' : '#fff';
  const isDisabled = loading || disabled;

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bg }, isDisabled && !loading && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  text: { fontWeight: '600', fontSize: 15 },
});
