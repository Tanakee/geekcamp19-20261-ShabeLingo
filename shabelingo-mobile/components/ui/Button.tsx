import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors, Layout } from '../../constants/Colors';

interface ButtonProps {
  onPress: () => void;
  title?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
}

export function Button({ 
  onPress, 
  title, 
  variant = 'primary', 
  size = 'md', 
  loading, 
  disabled, 
  icon,
  style,
  textStyle,
  children 
}: ButtonProps) {
  
  const getVariantStyle = () => {
    switch (variant) {
      case 'secondary': return styles.secondary;
      case 'ghost': return styles.ghost;
      case 'destructive': return styles.destructive;
      case 'icon': return styles.icon;
      default: return styles.primary; // primary
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm': return styles.sm;
      case 'lg': return styles.lg;
      case 'icon': return styles.iconSize;
      default: return styles.md;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        getVariantStyle(),
        getSizeStyle(),
        disabled && styles.disabled,
        pressed && { opacity: 0.8 },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? Colors.foreground : '#fff'} />
      ) : (
        <>
          {icon}
          {title && (
            <Text style={[
              styles.textBase, 
              variant === 'ghost' ? styles.textGhost : styles.textPrimary,
              textStyle
            ]}>
              {title}
            </Text>
          )}
          {children}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  // Variants
  primary: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: Colors.destructive,
  },
  icon: {
    backgroundColor: Colors.muted,
  },
  // Sizes
  sm: {
    height: 32,
    paddingHorizontal: 16,
  },
  md: {
    height: 48,
    paddingHorizontal: 24,
  },
  lg: {
    height: 56,
    paddingHorizontal: 32,
  },
  iconSize: {
    width: 48,
    height: 48,
    paddingHorizontal: 0,
    borderRadius: 24,
  },
  // Text
  textBase: {
    fontWeight: '600',
    fontSize: 16,
  },
  textPrimary: {
    color: '#ffffff',
  },
  textGhost: {
    color: Colors.foreground,
  },
});
