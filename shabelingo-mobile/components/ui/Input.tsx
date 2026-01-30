import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Layout } from '../../constants/Colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export function Input({ label, error, fullWidth, style, ...props }: InputProps) {
  return (
    <View style={[styles.container, fullWidth && styles.fullWidth, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error ? styles.inputError : null,
          props.multiline && styles.textArea
        ]}
        placeholderTextColor={Colors.mutedForeground}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    color: Colors.foreground,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.radius - 4,
    padding: 12,
    color: Colors.foreground,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: Colors.destructive,
  },
  errorText: {
    color: Colors.destructive,
    fontSize: 12,
    marginLeft: 4,
  },
});
