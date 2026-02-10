import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { getSharedCollection, importSharedCollection } from '../../../lib/collections';
import { SharedCollection } from '../../../types';
import { Colors, Layout } from '../../../constants/Colors';
import { Button } from '../../../components/ui/Button';
import { Download, Check, ChevronLeft } from 'lucide-react-native';

export default function SharedCollectionImportScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();

    const [data, setData] = useState<SharedCollection | null>(null);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        if (!id) return;
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getSharedCollection(id!);
            if (res) {
                setData(res);
            } else {
                Alert.alert('Error', 'Shared collection not found');
                router.back();
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to load shared collection');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!user || !id) return;
        try {
            setImporting(true);
            const newColId = await importSharedCollection(user.uid, id);
            Alert.alert('Success', 'Collection imported successfully!', [
                { text: 'View Collection', onPress: () => router.replace(`/collections/${newColId}`) }
            ]);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to import collection');
        } finally {
            setImporting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!data) return null;

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'Import Collection' }} />
            
            <View style={styles.header}>
                <Button variant="ghost" size="icon" icon={<ChevronLeft size={24} color={Colors.foreground} />} onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Import Collection</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.title}>{data.title}</Text>
                    {data.description ? (
                        <Text style={styles.desc}>{data.description}</Text>
                    ) : null}
                    
                    <View style={styles.stats}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Items</Text>
                            <Text style={styles.statValue}>{data.memos.length}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Created</Text>
                            <Text style={styles.statValue}>{new Date(data.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Preview Items</Text>
                {data.memos.slice(0, 5).map((memo, index) => (
                    <View key={index} style={styles.memoItem}>
                        <Text style={styles.memoOriginal}>{memo.originalText}</Text>
                        <Text style={styles.memoMeaning}>{memo.meaning || memo.translatedText}</Text>
                    </View>
                ))}
                {data.memos.length > 5 && (
                    <Text style={styles.moreText}>+ {data.memos.length - 5} more items</Text>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <Button 
                    variant="primary" 
                    size="lg" 
                    title={importing ? "Importing..." : "Import to My Library"} 
                    icon={!importing && <Download size={20} color="#fff" />}
                    onPress={handleImport}
                    disabled={importing}
                    style={{ width: '100%' }}
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
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.foreground,
    },
    content: {
        padding: 24,
    },
    card: {
        backgroundColor: Colors.card,
        borderRadius: Layout.radius,
        padding: 24,
        marginBottom: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: Colors.foreground,
        textAlign: 'center',
    },
    desc: {
        fontSize: 16,
        color: Colors.mutedForeground,
        textAlign: 'center',
        marginBottom: 24,
    },
    stats: {
        flexDirection: 'row',
        gap: 32,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: Colors.mutedForeground,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: Colors.foreground,
    },
    memoItem: {
        padding: 16,
        backgroundColor: Colors.card,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    memoOriginal: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.foreground,
    },
    memoMeaning: {
        fontSize: 14,
        color: Colors.mutedForeground,
        marginTop: 4,
    },
    moreText: {
        textAlign: 'center',
        color: Colors.mutedForeground,
        marginTop: 8,
        fontStyle: 'italic',
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.background,
    },
});
