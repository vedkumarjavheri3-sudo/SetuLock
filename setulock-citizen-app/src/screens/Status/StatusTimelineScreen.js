import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import api from '../../api/client';

export default function StatusTimelineScreen() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatuses();
    }, []);

    const fetchStatuses = async () => {
        try {
            const res = await api.get('/status');
            setApplications(res.data.applications || []);
        } catch (err) {
            console.error('Failed to fetch status timeline:', err);
        } finally {
            setLoading(false);
        }
    };

    const renderTimeline = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.appType}>{item.application_type}</Text>
                <Text style={styles.statusBadge(item.current_status)}>{item.current_status}</Text>
            </View>
            <Text style={styles.operatorText}>Assigned to: {item.operator_info?.name || 'Pending Assignment'}</Text>

            <View style={styles.timelineContainer}>
                {item.timeline && item.timeline.map((step, idx) => (
                    <View key={step.id} style={styles.step}>
                        <View style={styles.dot} />
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>{step.status}</Text>
                            <Text style={styles.stepNote}>{step.notes}</Text>
                            <Text style={styles.stepTime}>{new Date(step.timestamp).toLocaleDateString()}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Application Tracking</Text>
            <FlatList
                data={applications}
                keyExtractor={(item) => item.id}
                renderItem={renderTimeline}
                contentContainerStyle={{ paddingBottom: 30 }}
                ListEmptyComponent={<Text style={styles.emptyText}>No active applications found.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5', padding: 15 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
    card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    appType: { fontSize: 18, fontWeight: '600' },
    operatorText: { fontSize: 14, color: '#666', marginBottom: 15 },
    statusBadge: (status) => ({
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 5,
        overflow: 'hidden',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
        backgroundColor: status === 'APPROVED' ? '#4caf50' : status === 'REJECTED' ? '#f44336' : '#ff9800',
    }),
    timelineContainer: { borderLeftWidth: 2, borderLeftColor: '#e0e0e0', marginLeft: 10, paddingLeft: 15 },
    step: { marginBottom: 15, position: 'relative' },
    dot: { position: 'absolute', left: -20, top: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#2196f3' },
    stepContent: { marginLeft: 10 },
    stepTitle: { fontSize: 14, fontWeight: 'bold' },
    stepNote: { fontSize: 13, color: '#555', marginTop: 2 },
    stepTime: { fontSize: 11, color: '#999', marginTop: 4 }
});
