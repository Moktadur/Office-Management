import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../lib/store';
import { Card, Btn, Field, COLORS, Badge } from '../components/ui';
import { formatDateTime } from '../lib/utils';
import { shareTextFile } from '../lib/pdf';

export default function SettingsScreen() {
  const { user, logout, isAdmin, company, updateCompany, exportBackup, importBackup, resetDemo, logs, addLog } = useApp();
  const [name, setName] = useState(company.name);
  const [address, setAddress] = useState(company.address);
  const [phone, setPhone] = useState(company.phone);
  const [email, setEmail] = useState(company.email);
  const [showLogs, setShowLogs] = useState(false);

  const saveCompany = () => {
    if (!name.trim()) { Alert.alert('Required', 'Company name is required'); return; }
    updateCompany({ name: name.trim(), address: address.trim(), phone: phone.trim(), email: email.trim() });
    addLog('Updated company profile');
    Alert.alert('Saved', 'Company profile updated. It will appear on payslips & reports.');
  };

  const doBackup = () => {
    shareTextFile(`office-backup-${new Date().toISOString().slice(0, 10)}.json`, exportBackup(), 'application/json');
    addLog('Database backup exported');
  };

  const doRestore = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
      if (res.canceled) return;
      const file = res.assets[0];
      let text = '';
      if (file.uri.startsWith('data:')) {
        const base64 = file.uri.split(',')[1] || '';
        text = decodeURIComponent(escape(typeof atob !== 'undefined' ? atob(base64) : ''));
      } else {
        const resp = await fetch(file.uri);
        text = await resp.text();
      }
      const r = importBackup(text);
      if (r.ok) { addLog('Database restored from backup'); Alert.alert('Restored', 'Backup restored successfully.'); }
      else Alert.alert('Failed', r.msg || 'Invalid backup');
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not read backup file');
    }
  };

  const doReset = () => {
    Alert.alert('Reset Demo Data?', 'All changes will be lost and demo data restored.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { resetDemo(); Alert.alert('Done', 'Demo data restored.'); } },
    ]);
  };

  return (
    <ScrollView style={styles.bg} contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.avatar}>
            <Ionicons name={isAdmin ? 'shield-checkmark' : 'person'} size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.uname}>{user?.name}</Text>
            <Text style={styles.uuser}>@{user?.username}</Text>
          </View>
          <Badge text={isAdmin ? 'ADMIN' : 'STAFF'} tone={isAdmin ? 'purple' : 'blue'} />
        </View>
        <View style={styles.permBox}>
          <Text style={styles.permT}>{isAdmin ? 'Full access: employees, payroll, sheets, documents, settings, backup.' : 'Limited access: view data + mark attendance. Payroll & delete actions need admin.'}</Text>
        </View>
        <Btn title="Logout" icon="log-out" variant="danger" onPress={() => { Alert.alert('Logout?', 'Sign out of this device?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Logout', style: 'destructive', onPress: logout }]); }} />
      </Card>

      <Card>
        <Text style={styles.secT}>Company Profile (prints on payslips)</Text>
        <Field label="Company Name" value={name} onChange={setName} />
        <Field label="Address" value={address} onChange={setAddress} multiline />
        <Field label="Phone" value={phone} onChange={setPhone} keyboardType="phone-pad" />
        <Field label="Email" value={email} onChange={setEmail} keyboardType="email-address" />
        {isAdmin ? <Btn title="Save Company Profile" icon="business" onPress={saveCompany} /> : <Text style={styles.muted}>Only admin can edit company profile.</Text>}
      </Card>

      <Card>
        <Text style={styles.secT}>Backup & Data</Text>
        <Text style={styles.muted}>All data auto-saves on this device. Export a backup file to move data or keep a safe copy.</Text>
        <View style={{ gap: 8, marginTop: 10 }}>
          <Btn title="Export Backup (JSON)" icon="cloud-download" onPress={doBackup} />
          {isAdmin && <Btn title="Restore from Backup" icon="cloud-upload" variant="secondary" onPress={doRestore} />}
          {isAdmin && <Btn title="Reset Demo Data" icon="refresh" variant="ghost" onPress={doReset} />}
        </View>
      </Card>

      <Card>
        <TouchableOpacity style={styles.logHead} onPress={() => setShowLogs(s => !s)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="time" size={18} color="#0B2B4C" />
            <Text style={styles.secT}>Activity Log ({logs.length})</Text>
          </View>
          <Ionicons name={showLogs ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7A90" />
        </TouchableOpacity>
        {showLogs && (
          <View style={{ marginTop: 8 }}>
            {logs.slice(0, 50).map(l => (
              <View key={l.id} style={styles.logRow}>
                <View style={styles.logDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.logAction}>{l.action}</Text>
                  <Text style={styles.logMeta}>{l.user} • {formatDateTime(l.date)}</Text>
                </View>
              </View>
            ))}
            {logs.length === 0 && <Text style={styles.muted}>No activity yet.</Text>}
          </View>
        )}
      </Card>

      <Card>
        <Text style={styles.secT}>About</Text>
        <Text style={styles.muted}>OfficeManager Pro v1.0{'\n'}All-in-one: Employee Master • Attendance • Payroll with PF/ESI/TDS • Payslips • Excel sheets with formulas • Document vault • Reports{'\n\n'}Made for Indian offices. Data stays on your device.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#0B2B4C', alignItems: 'center', justifyContent: 'center' },
  uname: { fontSize: 17, fontWeight: '800', color: '#0B2B4C' },
  uuser: { fontSize: 13, color: '#6B7A90' },
  permBox: { backgroundColor: '#F2F4F8', borderRadius: 8, padding: 10, marginVertical: 12 },
  permT: { fontSize: 12, color: '#475569', lineHeight: 17 },
  secT: { fontSize: 15, fontWeight: '800', color: '#0B2B4C', marginBottom: 8 },
  muted: { fontSize: 13, color: '#6B7A90', lineHeight: 19 },
  logHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logRow: { flexDirection: 'row', gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  logDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C9A227', marginTop: 5 },
  logAction: { fontSize: 13, fontWeight: '600', color: '#152238' },
  logMeta: { fontSize: 11, color: '#6B7A90' },
});
