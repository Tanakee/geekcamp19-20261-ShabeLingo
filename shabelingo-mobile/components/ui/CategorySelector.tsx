import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { subscribeCategories, addCategory, deleteCategory } from '../../lib/firestore';
import { Category } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface CategorySelectorProps {
  selectedCategoryIds: string[];
  onSelect: (ids: string[]) => void;
  multiSelect?: boolean;
}

export function CategorySelector({ selectedCategoryIds, onSelect, multiSelect = false }: CategorySelectorProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);

  // カテゴリーの監視
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeCategories(user.uid, (data) => {
      setCategories(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSelect = (id: string) => {
    if (multiSelect) {
      if (selectedCategoryIds.includes(id)) {
        onSelect(selectedCategoryIds.filter(catId => catId !== id));
      } else {
        onSelect([...selectedCategoryIds, id]);
      }
    } else {
      onSelect([id]);
    }
  };

  const handleAddStart = () => {
    setIsAdding(true);
    setNewCategoryName('');
  };

  const handleAddSubmit = async () => {
    if (!newCategoryName.trim() || !user) {
      setIsAdding(false);
      return;
    }
    try {
      await addCategory(user.uid, newCategoryName.trim());
      setIsAdding(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add category');
    }
  };

  const handleDelete = (category: Category) => {
    Alert.alert(
      'Delete Category',
      `Delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(category.id);
              // 選択中だったら選択解除
              if (selectedCategoryIds.includes(category.id)) {
                onSelect(selectedCategoryIds.filter(id => id !== category.id));
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return <ActivityIndicator size="small" color={Colors.primary} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {categories.map((cat) => {
          const isSelected = selectedCategoryIds.includes(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                { borderColor: cat.color || Colors.primary }
              ]}
              onPress={() => handleSelect(cat.id)}
              onLongPress={() => handleDelete(cat)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Add Button / Input */}
        {isAdding ? (
          <View style={[styles.chip, styles.chipInput]}>
            <TextInput
              style={styles.input}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="New..."
              placeholderTextColor={Colors.mutedForeground}
              autoFocus
              onBlur={() => {
                // 入力がなければキャンセル、あれば追加試行
                if (newCategoryName.trim()) handleAddSubmit();
                else setIsAdding(false);
              }}
              onSubmitEditing={handleAddSubmit}
              returnKeyType="done"
            />
          </View>
        ) : (
          <TouchableOpacity style={[styles.chip, styles.addButton]} onPress={handleAddStart}>
            <MaterialIcons name="add" size={20} color={Colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.mutedForeground,
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  addButton: {
    borderStyle: 'dashed',
    paddingHorizontal: 12,
  },
  chipInput: {
    borderColor: Colors.primary,
    paddingVertical: 0, // Inputの高さに合わせる
    paddingHorizontal: 12,
  },
  input: {
    color: Colors.foreground,
    minWidth: 60,
    height: 36,
  },
});
