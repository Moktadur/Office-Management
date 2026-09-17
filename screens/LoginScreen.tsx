import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { Field, Btn } from '../components/ui';

export default function LoginScreen() {
  const { login } = useApp();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');

  const doLogin = () => {
    const r = login(username, password);
    if (!r.ok) setErr(r.msg || 'Login failed');
    else setErr('');
  };

  return (
    <LinearGradient colors={['#0B2B4C', '#143A66', '#1D4E89']} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={styles.logoBox}>
          <View style={styles.logoCircle}>
            <Ionicons name="business" size={44} color="#0B2B4C" />
          </View>
          <Text style={styles.appName}>OfficeManager Pro</Text>
          <Text style={styles.tagline}>Employees • Payroll • Excel • Documents</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.sub}>Sign in to your office workspace</Text>
          <Field label="Username" value={username} onChange={setUsername} placeholder="admin / staff" />
          <View>
            <Field label="Password" value={password} onChange={setPassword} placeholder="Enter password" secure={!show} />
            <TouchableOpacity style={styles.eye} onPress={() => setShow(s => !s)}>
              <Ionicons name={show ? 'eye-off' : 'eye'} size={20} color="#6B7A90" />
            </TouchableOpacity>
          </View>
          {err ? (
            <View style={styles.errBox}>
              <Ionicons name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errText}>{err}</Text>
            </View>
          ) : null}
          <Btn title="Sign In" onPress={doLogin} icon="log-in" />
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Demo Accounts (tap to fill)</Text>
            <View style={styles.demoRow}>
              <TouchableOpacity style={styles.demoChip} onPress={() => { setUsername('admin'); setPassword('admin123'); }}>
                <Ionicons name="shield-checkmark" size={14} color="#C9A227" />
                <Text style={styles.demoText}> admin / admin123</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.demoChip} onPress={() => { setUsername('staff'); setPassword('staff123'); }}>
                <Ionicons name="person" size={14} color="#0EA5E9" />
                <Text style={styles.demoText}> staff / staff123</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.demoNote}>Admin: full access • Staff: view + attendance only</Text>
          </View>
        </View>
        <Text style={styles.foot}>Secure • Offline-first • Auto backup</Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  wrap: { flex: 1, justifyContent: 'center', padding: 22 },
  logoBox: { alignItems: 'center', marginBottom: 26 },
  logoCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  appName: { fontSize: 28, fontWeight: '900', color: '#fff' },
  tagline: { fontSize: 13, color: '#B9C9DD', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 14, elevation: 8 },
  title: { fontSize: 22, fontWeight: '900', color: '#0B2B4C' },
  sub: { fontSize: 13, color: '#6B7A90', marginBottom: 16 },
  eye: { position: 'absolute', right: 12, top: 32 },
  errBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginBottom: 12, gap: 6 },
  errText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  demoBox: { marginTop: 16, backgroundColor: '#F2F4F8', borderRadius: 12, padding: 12 },
  demoTitle: { fontSize: 12, fontWeight: '800', color: '#0B2B4C', marginBottom: 8 },
  demoRow: { flexDirection: 'row', gap: 8 },
  demoChip: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  demoText: { fontSize: 12, fontWeight: '600', color: '#152238' },
  demoNote: { fontSize: 11, color: '#6B7A90', marginTop: 8 },
  foot: { textAlign: 'center', color: '#8FA3BD', fontSize: 12, marginTop: 18 },
});
