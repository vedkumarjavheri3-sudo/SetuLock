import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { requireBiometricUnlock } from '../../security/AppLock';
import { SecureStorage } from '../../security/SecureStorage';
import api from '../../api/client';

export default function DashboardScreen({ navigation }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Requirement: App Lock triggers on Dashboard Focus/Startup
    useEffect(() => {
        const lockCheck = async () => {
            // Typically wrapped in a Navigation Focus listener, but simulating on mount:
            const authResult = await requireBiometricUnlock('Unlock to view your digital wallet');
            if (authResult.success) {
                setIsAuthenticated(true);
                fetchDocuments();
            } else {
                // Fallback or force logout if biometrics repeatedly fail
                console.warn('Authentication failed, booting to home.');
            }
        };
        lockCheck();
    }, []);

    const fetchDocuments = async () => {
        try {
            // Will automatically attach secure JWT
            const res = await api.get('/documents');
            setDocuments(res.data.documents || []);
        } catch (err) {
            console.error('Failed to fetch docs:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <View style={styles.container}>
                <Text>Securing App...</Text>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Your Digital Wallet</Text>
            {loading ? (
                <ActivityIndicator />
            ) : (
                documents.length === 0 ? (
                    <Text>No documents found.</Text>
                ) : (
                    documents.map((doc, idx) => (
                        <Text key={idx}>- {doc.title} ({doc.status})</Text>
                    ))
                )
            )}
            <Button title="Logout" onPress={async () => {
                await SecureStorage.delete('user_jwt');
                // navigation.navigate('Auth');
            }} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 }
});
