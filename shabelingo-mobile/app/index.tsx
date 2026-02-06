import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, Image, TouchableOpacity, Modal, ScrollView, StatusBar } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, Play, Filter, X } from 'lucide-react-native';
import { Colors, Layout } from '../constants/Colors';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useMemoContext } from '../context/MemoContext';
import { useAuth } from '../context/AuthContext';
import { subscribeCategories } from '../lib/firestore';
import { Category, LANGUAGES, SupportedLanguage } from '../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { memos } = useMemoContext();
  const [categories, setCategories] = useState<Record<string, Category>>({});
  
  // Filter States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterLang, setFilterLang] = useState<SupportedLanguage | 'all'>('all');
  const [filterCat, setFilterCat] = useState<string | 'all'>('all');

  // Filtering Logic
  const filteredMemos = memos.filter(m => {
    const langMatch = filterLang === 'all' ? true : m.language === filterLang;
    const catMatch = filterCat === 'all' || (m.categoryIds && m.categoryIds.includes(filterCat));
    return langMatch && catMatch;
  });

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeCategories(user.uid, (list) => {
      const map = list.reduce((acc, cat) => ({ ...acc, [cat.id]: cat }), {});
      setCategories(map);
    });
    return () => unsubscribe();
  }, [user]);

  const getCategoryName = (idOrName: string) => {
    const cat = categories[idOrName];
    return cat ? cat.name : idOrName;
  };

  const activeFiltersCount = (filterLang !== 'all' ? 1 : 0) + (filterCat !== 'all' ? 1 : 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header since headerShown is false in _layout.tsx */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ShabeLingo</Text>
        <View style={styles.headerActions}>
            {/* Filter Button */}
            <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.headerBtn}>
                <Filter size={24} color={activeFiltersCount > 0 ? Colors.primary : "#ffffff"} />
                {activeFiltersCount > 0 && <View style={styles.badgeDot} />}
            </TouchableOpacity>

            {/* Review Button */}
            <TouchableOpacity onPress={() => router.push('/review')} style={styles.headerBtn}>
                <Play size={24} color="#ffffff" />
            </TouchableOpacity>
        </View>
      </View>
      
      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet" // iOS looking modal
        onRequestClose={() => setShowFilterModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter Memos</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                    <X size={24} color={Colors.foreground} />
                </TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={styles.modalContent}>
                {/* Language Filter */}
                <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Language</Text>
                    <View style={styles.chipContainer}>
                        <TouchableOpacity 
                            style={[styles.chip, filterLang === 'all' && styles.chipActive]}
                            onPress={() => setFilterLang('all')}
                        >
                            <Text style={[styles.chipText, filterLang === 'all' && styles.chipTextActive]}>All</Text>
                        </TouchableOpacity>
                        {LANGUAGES.map(l => (
                            <TouchableOpacity 
                                key={l.code} 
                                style={[styles.chip, filterLang === l.code && styles.chipActive]}
                                onPress={() => setFilterLang(l.code)}
                            >
                                <Text style={{marginRight: 4}}>{l.flag}</Text>
                                <Text style={[styles.chipText, filterLang === l.code && styles.chipTextActive]}>{l.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Category Filter */}
                <View style={styles.filterSection}>
                    <Text style={styles.filterLabel}>Category</Text>
                    <View style={styles.chipContainer}>
                        <TouchableOpacity 
                            style={[styles.chip, filterCat === 'all' && styles.chipActive]}
                            onPress={() => setFilterCat('all')}
                        >
                            <Text style={[styles.chipText, filterCat === 'all' && styles.chipTextActive]}>All</Text>
                        </TouchableOpacity>
                        {Object.values(categories).map(c => (
                            <TouchableOpacity 
                                key={c.id} 
                                style={[styles.chip, filterCat === c.id && styles.chipActive]}
                                onPress={() => setFilterCat(c.id)}
                            >
                                <Text style={[styles.chipText, filterCat === c.id && styles.chipTextActive]}>{c.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                
                <Button 
                    title={`Show ${filteredMemos.length} Memos`}
                    onPress={() => setShowFilterModal(false)}
                    style={{ marginTop: 32 }}
                />
            </ScrollView>
        </SafeAreaView>
      </Modal>

      <FlatList
        data={filteredMemos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/memo/${item.id}`)} activeOpacity={0.9}>
            <Card style={styles.card}>
              <View style={styles.cardContent}>
                <View style={styles.cardMain}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {getCategoryName(item.categoryIds && item.categoryIds.length > 0 ? item.categoryIds[0] : 'Uncategorized')}
                        </Text>
                        </View>
                        {item.language && (
                             <Text style={styles.langEmoji}>
                                 {LANGUAGES.find(l => l.code === item.language)?.flag}
                             </Text>
                        )}
                    </View>
                    <Text style={styles.date}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.cardText} numberOfLines={3}>{item.originalText}</Text>
                </View>
                
                {item.imageUrl && (
                  <Image 
                    source={{ uri: item.imageUrl }} 
                    style={styles.cardThumbnail} 
                    resizeMode="cover"
                  />
                )}
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No memos found.</Text>
            {(filterCat !== 'all' || filterLang !== 'all') && (
                <Button 
                    variant="ghost" 
                    title="Clear Filters" 
                    onPress={() => {
                        setFilterCat('all');
                        setFilterLang('all');
                    }}
                />
            )}
          </View>
        }
      />

      <View style={styles.fabContainer}>
        <Button 
          variant="primary" 
          size="lg" 
          title="New Memo"
          icon={<Plus size={24} color="#fff" />}
          onPress={() => router.push('/create')}
          style={styles.fab}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.padding,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#27272a', // Explicitly dark grey
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  listContent: {
    padding: Layout.padding,
    paddingBottom: 100, // Space for FAB
    gap: 16,
  },
  badgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.card,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  modalContent: {
    padding: 24,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.foreground,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
  },
  cardContent: {
    flexDirection: 'row',
    gap: 12,
  },
  cardMain: {
    flex: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langEmoji: {
    fontSize: 16,
  },
  badge: {
    backgroundColor: 'rgba(157, 78, 221, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(157, 78, 221, 0.3)',
  },
  badgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    color: Colors.mutedForeground,
    fontSize: 12,
  },
  cardText: {
    color: Colors.foreground,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 28,
  },
  cardThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  empty: {
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    color: Colors.mutedForeground,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 24,
  },
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  }
});
