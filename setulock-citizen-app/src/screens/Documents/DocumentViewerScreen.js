import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { enableScreenshotProtection, disableScreenshotProtection } from '../../security/EnvironmentGuards';
import api from '../../api/client';

export default function DocumentViewerScreen({ route, navigation }) {
    // const { documentId } = route.params;
    const documentId = 'mock_id';
    const [downloading, setDownloading] = useState(false);

    // Critical Government App features:
    useEffect(() => {
        // 1. Prevent Screenshots while viewing sensitive docs
        enableScreenshotProtection();

        // 2. Remove protection when navigating away
        return () => {
            disableScreenshotProtection();
        };
    }, []);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            // Backend handles decryption logic and returns raw file
            const response = await api.get(`/documents/${documentId}/download`, {
                responseType: 'blob'
            });
            console.log('Document downloaded successfully (Memory Blob).');
            // Further logic to present File System save/view Dialog here
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.warning}>🔒 Secure View Active</Text>
            <Text style={styles.info}>Screenshots are blocked on this screen.</Text>

            <Button
                title={downloading ? "Decrypting..." : "Download & Decrypt Document"}
                onPress={handleDownload}
                disabled={downloading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
    warning: { color: 'green', fontWeight: 'bold', fontSize: 18, marginBottom: 10 },
    info: { color: '#666', marginBottom: 20 }
});
