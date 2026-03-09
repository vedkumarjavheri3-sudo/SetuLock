import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Alert } from 'react-native';
import api from '../../api/client';

export default function FamilyScreen() {
    const [members, setMembers] = useState([]);
    const [name, setName] = useState('');
    const [relation, setRelation] = useState('');
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchFamily();
    }, []);

    const fetchFamily = async () => {
        setLoading(true);
        try {
            const res = await api.get('/family');
            setMembers(res.data.members || []);
        } catch (err) {
            console.error('Fetch Family Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const addFamilyMember = async () => {
        if (!name || !relation) {
            Alert.alert('Validation Error', 'Please enter Name and Relation.');
            return;
        }

        setAdding(true);
        try {
            const res = await api.post('/family', {
                name,
                relation,
                dob: '2000-01-01', // Mock static DOP for MVP
                is_minor: false
            });

            Alert.alert('Success', 'Family member added to your account.');
            setName('');
            setRelation('');
            fetchFamily(); // Refresh list

        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to add family member.');
        } finally {
            setAdding(false);
        }
    };

    const renderMember = ({ item }) => (
        <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.relation}>Relation: {item.relation}</Text>
            <Text style={styles.subText}>{item.is_minor ? 'Minor Account' : 'Adult'}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Family Hub</Text>
            <Text style={styles.subtitle}>Link family members to manage their documents securely under one household.</Text>

            <View style={styles.form}>
                <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
                <TextInput style={styles.input} placeholder="Relationship (e.g. Spouse, Child)" value={relation} onChangeText={setRelation} />
                <Button title={adding ? "Adding..." : "Add Member"} onPress={addFamilyMember} disabled={adding} />
            </View>

            <Text style={styles.sectionTitle}>Linked Members ({members.length})</Text>

            <FlatList
                data={members}
                keyExtractor={(item) => item.id}
                renderItem={renderMember}
                refreshing={loading}
                onRefresh={fetchFamily}
                ListEmptyComponent={<Text style={styles.emptyText}>No family members linked yet.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9', padding: 20 },
    title: { fontSize: 26, fontWeight: 'bold', marginBottom: 5 },
    subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
    form: { backgroundColor: '#fff', padding: 15, borderRadius: 10, shadowColor: '#000', elevation: 2, marginBottom: 25 },
    input: { borderWidth: 1, borderColor: '#eee', padding: 12, borderRadius: 6, marginBottom: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0' },
    name: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    relation: { fontSize: 14, color: '#555', marginTop: 4 },
    subText: { fontSize: 12, color: '#999', marginTop: 4 },
    emptyText: { textAlign: 'center', color: '#888', marginTop: 20 }
});
