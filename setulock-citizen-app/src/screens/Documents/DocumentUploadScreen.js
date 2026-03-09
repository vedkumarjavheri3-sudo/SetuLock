import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Image, Alert } from 'react-native';
import DocumentScanner from 'react-native-document-scanner-plugin';
import api from '../../api/client';

export default function DocumentUploadScreen({ navigation }) {
    const [scannedImage, setScannedImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    const scanDocument = async () => {
        try {
            // Launches the native OS document scanner with auto-cropping
            const { scannedImages } = await DocumentScanner.scanDocument();

            if (scannedImages?.length > 0) {
                // Save the URI of the cropped/enhanced image
                setScannedImage(scannedImages[0]);
            }
        } catch (error) {
            console.error('Scan Error:', error);
            Alert.alert('Scanner Error', 'Failed to launch the document scanner.');
        }
    };

    const uploadDocument = async () => {
        if (!scannedImage) return;

        setUploading(true);
        try {
            const formData = new FormData();

            // Append the file properly for React Native backend proxying
            formData.append('document', {
                uri: scannedImage,
                name: `scan_${Date.now()}.png`,
                type: 'image/png',
            });
            formData.append('title', `Scanned Document ${new Date().toLocaleDateString()}`);
            formData.append('category', 'Identity'); // Hardcoded for MVP example

            // This POST reaches the Node backend, which will encrypt the buffer
            // and deposit it into Supabase Storage.
            const res = await api.post('/documents/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            Alert.alert('Success', 'Document successfully scanned, encrypted, and uploaded.');
            setScannedImage(null);
            // navigation.goBack();

        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Upload Failed', error.response?.data?.error || 'Could not upload document securely.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Secure Document Scanner</Text>
            <Text style={styles.subtitle}>Auto-crops and enhances your physical documents before 256-bit encryption.</Text>

            {scannedImage ? (
                <View style={styles.imageContainer}>
                    <Image source={{ uri: scannedImage }} style={styles.preview} resizeMode="contain" />
                    <View style={styles.buttonRow}>
                        <Button title="Retake" onPress={() => setScannedImage(null)} color="gray" disabled={uploading} />
                        <Button title={uploading ? "Encrypting..." : "Secure Upload"} onPress={uploadDocument} disabled={uploading} />
                    </View>
                </View>
            ) : (
                <Button title="Launch Camera Scanner" onPress={scanDocument} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 14, color: '#666', marginBottom: 30, textAlign: 'center' },
    imageContainer: { flex: 1, width: '100%', alignItems: 'center' },
    preview: { flex: 1, width: '100%', minHeight: 300, marginBottom: 20 },
    buttonRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', paddingBottom: 20 }
});
