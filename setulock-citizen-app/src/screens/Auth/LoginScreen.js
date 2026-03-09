import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import api from '../../api/client';

export default function LoginScreen({ navigation }) {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const requestOTP = async () => {
        if (phone.length < 10) {
            Alert.alert('Error', 'Please enter a valid 10-digit phone number.');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/request-otp', { phone });

            if (response.data && response.data.devOtp) {
                Alert.alert('SMS Received', `SetuLock: Your OTP is ${response.data.devOtp}`);
            } else {
                Alert.alert('Success', 'OTP sent to your mobile number.');
            }

            navigation.navigate('VerifyOTP', { phone });
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to send OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>SetuLock</Text>
            <Text style={styles.subtitle}>Enter your mobile number to continue securely.</Text>

            <TextInput
                style={styles.input}
                placeholder="Mobile Number"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
            />

            <Button
                title={loading ? "Sending OTP..." : "Request OTP"}
                onPress={requestOTP}
                disabled={loading}
            />

            <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.divider} />
            </View>

            <Button
                title="Login with Email"
                onPress={() => navigation.navigate('EmailLogin')}
                color="#4a90e2"
            />

            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('Register')}
            >
                <Text style={styles.linkText}>Don't have an account? Register</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 30, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8, marginBottom: 20, fontSize: 18 },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    divider: { flex: 1, height: 1, backgroundColor: '#ccc' },
    dividerText: { marginHorizontal: 10, color: '#666', fontWeight: 'bold' },
    linkButton: { marginTop: 20, alignItems: 'center' },
    linkText: { color: '#0066cc', fontSize: 16 }
});
