import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import api from '../../api/client';
import { SecureStorage } from '../../security/SecureStorage';

export default function EmailLoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter your email and password.');
            return;
        }

        setLoading(true);
        try {
            // Get device fingerprint for session management
            const deviceFingerprint = await SecureStorage.getDeviceFingerprint();

            const response = await api.post('/auth/login-email', {
                email,
                password,
                deviceFingerprint
            });

            const { token, user } = response.data;

            // Store token securely
            await SecureStorage.set('user_jwt', token);
            await SecureStorage.set('user_data', JSON.stringify(user));

            Alert.alert('Success', 'Logged in successfully!');
            navigation.replace('Dashboard'); // Replace to prevent going back to login
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to log in.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Email Login</Text>

            <TextInput
                style={styles.input}
                placeholder="Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <Button
                title={loading ? "Logging in..." : "Login"}
                onPress={handleLogin}
                disabled={loading}
            />

            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('Register')}
            >
                <Text style={styles.linkText}>Don't have an account? Register</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.linkText}>Back to Phone Login</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 15, borderRadius: 8, marginBottom: 20, fontSize: 16 },
    linkButton: { marginTop: 15, alignItems: 'center' },
    linkText: { color: '#0066cc', fontSize: 16 }
});
