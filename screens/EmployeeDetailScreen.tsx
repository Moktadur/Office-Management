import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { formatINR, formatDate, initials, MONTHS_SHORT, num } from '../lib/utils';
import { Card, Badge, Btn, COLORS, EmptyState } from '../components/ui';
import { payslipHTML, printHTML } from '../lib/pdf';

export default function EmployeeDetailScreen({ navigation, route }: any) {
  const { employees, payroll, documents, isAdmin, summarize, deleteEmployee, addLog, company } = useApp();
  const { id } = route.params;
  const emp = employees.find(e => e.id === id);
  const [tab, setTab] = useState<'info' | 'salary' | 'docs'>('info');

  const history = useMemo(() => payroll.filter(p => p.employeeId === id).sort((a, b) => b.year - a.year || b.month - a.month), [payroll, id]);
  const empDocs = useMemo(() => documents.filter(d => d.employeeId === id), [documents, id]);
  const now = new Date();
  const sum = summarize(id, now.getMonth() + 1, now.getFullYear());

  if (!emp) {
    return (
      <View style={styles.bg}>
        <EmptyState icon="person" title="Employee not found" />
      </View>
    );
  }

  const gross = emp.basicSalary + emp.allowances.hra + emp.allowances.transport + emp.allowances.medical + emp.allowances.other;

  const doDelete = () => {
    Alert.alert('Delete Employee', `Remove ${emp.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteEmployee(emp.id); addLog(`Deleted employee ${emp.name}`); navigation.goBack(); } },
    ]);
  };

  const InfoRow = ({ label, value, icon }: any) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color="#6B7A90" style={{ width: 22 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoVal}>{value || '-'}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.bg} contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.avatar, { backgroundColor: emp.avatarColor }]}>
            <Text style={styles.avatarText}>{initials(emp.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{emp.name}</Text>
            <Text style={styles.sub}>{emp.empId} • {emp.designation}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              <Badge text={emp.department} tone="blue" />
              <Badge text={emp.status} tone={emp.status === 'Active' ? 'green' : 'gray'} />
            </View>
          </View>
        </View>
        {isAdmin && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1 }}><Btn title="Edit" icon="pencil" small onPress={() => navigation.navigate('EmployeeForm', { id: emp.id })} /></View>
            <View style={{ flex: 1 }}><Btn title="Delete" icon="trash" small variant="danger" onPress={doDelete} /></View>
          </View>
        )}
      </Card>

      <View style={styles.tabs}>
        {(['info', 'salary', 'docs'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && { color: '#fff' }]}>{t === 'info' ? 'Profile' : t === 'salary' ? `Salary (${history.length})` : `Documents (${empDocs.length})`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'info' && (
        <>
          <Card>
            <Text style={styles.secTitle}>Contact & Personal</Text>
            <InfoRow label="Mobile" value={emp.mobile} icon="call" />
            <InfoRow label="Email" value={emp.email} icon="mail" />
            <InfoRow label="Address" value={emp.address} icon="location" />
            <InfoRow label="Joining Date" value={formatDate(emp.joiningDate)} icon="calendar" />
            <InfoRow label="PAN" value={emp.pan} icon="card" />
            <InfoRow label="Aadhar" value={emp.aadhar} icon="finger-print" />
          </Card>
          <Card>
            <Text style={styles.secTitle}>Salary Structure (Monthly)</Text>
            <InfoRow label="Basic Salary" value={formatINR(emp.basicSalary)} icon="cash" />
            <InfoRow label="HRA" value={formatINR(emp.allowances.hra)} icon="home" />
            <InfoRow label="Transport" value={formatINR(emp.allowances.transport)} icon="bus" />
            <InfoRow label="Medical" value={formatINR(emp.allowances.medical)} icon="medkit" />
            <InfoRow label="Other Allow." value={formatINR(emp.allowances.other)} icon="gift" />
            <View style={styles.grossBar}>
              <Text style={styles.grossLabel}>Gross / Month</Text>
              <Text style={styles.grossVal}>{formatINR(gross)}</Text>
            </View>
          </Card>
          <Card>
            <Text style={styles.secTitle}>Bank Details</Text>
            <InfoRow label="Bank" value={emp.bank.bankName} icon="business" />
            <InfoRow label="Account No" value={emp.bank.account} icon="wallet" />
            <InfoRow label="IFSC" value={emp.bank.ifsc} icon="code" />
          </Card>
          <Card>
            <Text style={styles.secTitle}>This Month Attendance</Text>
            <View style={styles.attGrid}>
              <View style={[styles.attBox, { backgroundColor: '#DCFCE7' }]}><Text style={styles.attNum}>{sum.present}</Text><Text style={styles.attLbl}>Present</Text></View>
              <View style={[styles.attBox, { backgroundColor: '#FEE2E2' }]}><Text style={styles.attNum}>{sum.absent}</Text><Text style={styles.attLbl}>Absent</Text></View>
              <View style={[styles.attBox, { backgroundColor: '#FEF3C7' }]}><Text style={styles.attNum}>{sum.leave}</Text><Text style={styles.attLbl}>Leave</Text></View>
              <View style={[styles.attBox, { backgroundColor: '#DBEAFE' }]}><Text style={styles.attNum}>{sum.ot}h</Text><Text style={styles.attLbl}>OT</Text></View>
            </View>
          </Card>
        </>
      )}

      {tab === 'salary' && (
        <>
          {history.length === 0 && <Card><EmptyState icon="wallet" title="No salary records" subtitle="Run payroll to generate salary" /></Card>}
          {history.map(p => (
            <Card key={p.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.payTitle}>{MONTHS_SHORT[p.month - 1]} {p.year}</Text>
                <Badge text={p.paid ? 'PAID' : 'UNPAID'} tone={p.paid ? 'green' : 'amber'} />
              </View>
              <View style={styles.payGrid}>
                <Text style={styles.payLine}>Gross: <Text style={{ fontWeight: '800' }}>{formatINR(p.breakup.gross)}</Text></Text>
                <Text style={styles.payLine}>Deduction: <Text style={{ fontWeight: '800', color: '#DC2626' }}>{formatINR(p.breakup.totalDeduction)}</Text></Text>
              </View>
              <View style={styles.netBar}>
                <Text style={styles.netLabel}>Net Salary</Text>
                <Text style={styles.netVal}>{formatINR(p.breakup.net)}</Text>
              </View>
              <Text style={styles.payMeta}>P:{p.presentDays} A:{p.absentDays} L:{p.leaveDays} OT:{p.otHours}h Bonus:{formatINR(p.bonus)} Adv:{formatINR(p.advance)}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <View style={{ flex: 1 }}><Btn title="Payslip PDF" icon="document-text" small onPress={() => { printHTML(payslipHTML(emp, p, company)); addLog(`Payslip PDF for ${emp.name} ${MONTHS_SHORT[p.month - 1]} ${p.year}`); }} /></View>
                <View style={{ flex: 1 }}><Btn title="Details" icon="eye" small variant="secondary" onPress={() => navigation.navigate('Payroll', { screen: 'PayslipDetail', params: { id: p.id } })} /></View>
              </View>
            </Card>
          ))}
        </>
      )}

      {tab === 'docs' && (
        <>
          {empDocs.length === 0 && <Card><EmptyState icon="folder-open" title="No documents" subtitle="Upload documents linked to this employee" /></Card>}
          {empDocs.map(d => (
            <TouchableOpacity key={d.id} onPress={() => navigation.navigate('Documents', { screen: 'DocDetail', params: { id: d.id } })}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.docIcon}><Ionicons name="document-text" size={22} color="#DC2626" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{d.name}</Text>
                    <Text style={styles.docMeta}>{d.category} • {formatDate(d.date)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#6B7A90" />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 22 },
  name: { fontSize: 19, fontWeight: '900', color: '#0B2B4C' },
  sub: { fontSize: 13, color: '#6B7A90' },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, backgroundColor: '#E8EDF4', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#0B2B4C' },
  tabText: { fontSize: 12, fontWeight: '800', color: '#0B2B4C' },
  secTitle: { fontSize: 15, fontWeight: '800', color: '#0B2B4C', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 6 },
  infoLabel: { width: 110, fontSize: 13, color: '#6B7A90', fontWeight: '600' },
  infoVal: { flex: 1, fontSize: 13, fontWeight: '700', color: '#152238', textAlign: 'right' },
  grossBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0B2B4C', borderRadius: 10, padding: 12, marginTop: 8 },
  grossLabel: { color: '#B9C9DD', fontSize: 13, fontWeight: '600' },
  grossVal: { color: '#fff', fontSize: 17, fontWeight: '900' },
  attGrid: { flexDirection: 'row', gap: 8 },
  attBox: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  attNum: { fontSize: 18, fontWeight: '900', color: '#0B2B4C' },
  attLbl: { fontSize: 11, color: '#6B7A90', fontWeight: '600' },
  payTitle: { fontSize: 16, fontWeight: '800', color: '#0B2B4C' },
  payGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  payLine: { fontSize: 13, color: '#6B7A90' },
  netBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#DCFCE7', borderRadius: 8, padding: 10, marginTop: 8 },
  netLabel: { fontSize: 13, fontWeight: '700', color: '#166534' },
  netVal: { fontSize: 16, fontWeight: '900', color: '#166534' },
  payMeta: { fontSize: 11, color: '#6B7A90', marginTop: 6 },
  docIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 14, fontWeight: '700', color: '#152238' },
  docMeta: { fontSize: 12, color: '#6B7A90' },
});
