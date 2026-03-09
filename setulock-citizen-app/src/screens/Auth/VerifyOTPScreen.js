import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import api from '../../api/client';
import { SecureStorage } from '../../security/SecureStorage';
import * as Device from 'expo-device';

export default function VerifyOTPScreen({ route, navigation }) {
    const { phone } = route.params;
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const verifyOTP = async () => {
        if (otp.length < 6) {
            Alert.alert('Error', 'Please enter the 6-digit OTP.');
            return;
        }

        setLoading(true);
        try {
            // Create a basic device fingerprint for device binding
            const deviceFingerprint = `${Device.brand}_${Device.modelName}_${Device.osBuildId}`;

            const res = await api.post('/auth/verify-otp', {
                phone,
                otp,
                deviceFingerprint
            });

            // Securely store the JWT and User info
            await SecureStorage.save('user_jwt', res.data.token);
            await SecureStorage.save('user_data', JSON.stringify(res.data.user));

            if (res.data.requiresEmailVerification) {
                // Example: route to an interim screen if new device
                // navigation.navigate('EmailVerification');
                Alert.alert('Notice', 'New device detected. You may need to verify your email later.');
            }

            // Reset routing stack and go to Dashboard
            navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
            });

        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Invalid OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>Sent to +91 {phone}</Text>

            <TextInput
                style={styles.input}
                placeholder="Enter 6-digit OTP"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
                secureTextEntry // Mask OTP input
            />

            <Button
                title={loading ? "Verifying..." : "Verify & Login"}
                onPress={verifyOTP}
                disabled={loading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 30, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8, marginBottom: 20, fontSize: 18, textAlign: 'center', letterSpacing: 5 }
});
