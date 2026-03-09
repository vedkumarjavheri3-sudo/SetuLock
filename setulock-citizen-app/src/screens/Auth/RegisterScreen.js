import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import api from '../../api/client';

export default function RegisterScreen({ navigation }) {
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!email || !password || phone.length < 10) {
            Alert.alert('Error', 'Please fill all fields correctly.');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/register-email', {
                email,
                password,
                phone
            });

            Alert.alert('Success', 'Registration successful! You can now log in.');
            navigation.navigate('EmailLogin');
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to register.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create Account</Text>

            <TextInput
                style={styles.input}
                placeholder="Mobile Number (10 digits)"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
            />

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
                title={loading ? "Registering..." : "Register"}
                onPress={handleRegister}
                disabled={loading}
            />

            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('EmailLogin')}
            >
                <Text style={styles.linkText}>Already have an account? Login</Text>
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
