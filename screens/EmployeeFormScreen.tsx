import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { Field, Btn, Card, COLORS } from '../components/ui';
import { uid, num, toISODate } from '../lib/utils';
import { DEPARTMENTS } from '../lib/seed';
import { Employee } from '../lib/types';

const AVATARS = ['#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#14B8A6'];

export default function EmployeeFormScreen({ navigation, route }: any) {
  const { employees, saveEmployee, addLog } = useApp();
  const editId = route.params?.id;
  const existing: Employee | undefined = employees.find(e => e.id === editId);

  const [name, setName] = useState(existing?.name || '');
  const [department, setDepartment] = useState(existing?.department || 'Production');
  const [showDept, setShowDept] = useState(false);
  const [customDept, setCustomDept] = useState('');
  const [designation, setDesignation] = useState(existing?.designation || '');
  const [yy, setYy] = useState(existing ? existing.joiningDate.slice(0, 4) : String(new Date().getFullYear()));
  const [mm, setMm] = useState(existing ? existing.joiningDate.slice(5, 7) : String(new Date().getMonth() + 1).padStart(2, '0'));
  const [dd, setDd] = useState(existing ? existing.joiningDate.slice(8, 10) : String(new Date().getDate()).padStart(2, '0'));
  const [basic, setBasic] = useState(existing ? String(existing.basicSalary) : '');
  const [hra, setHra] = useState(existing ? String(existing.allowances.hra) : '');
  const [transport, setTransport] = useState(existing ? String(existing.allowances.transport) : '');
  const [medical, setMedical] = useState(existing ? String(existing.allowances.medical) : '');
  const [other, setOther] = useState(existing ? String(existing.allowances.other) : '');
  const [mobile, setMobile] = useState(existing?.mobile || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [address, setAddress] = useState(existing?.address || '');
  const [pan, setPan] = useState(existing?.pan || '');
  const [aadhar, setAadhar] = useState(existing?.aadhar || '');
  const [bankName, setBankName] = useState(existing?.bank.bankName || '');
  const [account, setAccount] = useState(existing?.bank.account || '');
  const [ifsc, setIfsc] = useState(existing?.bank.ifsc || '');
  const [status, setStatus] = useState<'Active' | 'Inactive'>(existing?.status || 'Active');

  const gross = num(basic) + num(hra) + num(transport) + num(medical) + num(other);

  const save = () => {
    if (!name.trim()) { Alert.alert('Required', 'Employee name is required'); return; }
    if (!designation.trim()) { Alert.alert('Required', 'Designation is required'); return; }
    if (!mobile.trim() || mobile.trim().length < 10) { Alert.alert('Required', 'Enter a valid 10-digit mobile number'); return; }
    if (num(basic) <= 0) { Alert.alert('Required', 'Basic salary must be greater than 0'); return; }
    const dept = customDept.trim() || department;
    const joiningDate = `${yy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    const maxNum = employees.reduce((m, e) => {
      const n = parseInt((e.empId || '').replace(/\D/g, ''), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    const emp: Employee = {
      id: existing?.id || uid('emp'),
      empId: existing?.empId || `EMP${String(maxNum + 1).padStart(3, '0')}`,
      name: name.trim(), department: dept, designation: designation.trim(), joiningDate,
      basicSalary: num(basic),
      allowances: { hra: num(hra), transport: num(transport), medical: num(medical), other: num(other) },
      mobile: mobile.trim(), email: email.trim(), address: address.trim(),
      pan: pan.trim().toUpperCase(), aadhar: aadhar.trim(),
      bank: { bankName: bankName.trim(), account: account.trim(), ifsc: ifsc.trim().toUpperCase() },
      status,
      avatarColor: existing?.avatarColor || AVATARS[Math.floor(Math.random() * AVATARS.length)],
    };
    saveEmployee(emp);
    addLog(`${existing ? 'Updated' : 'Added'} employee ${emp.name} (${emp.empId})`);
    Alert.alert('Saved', `${emp.name} (${emp.empId}) saved successfully.`);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={styles.bg} contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
        <Card>
          <Text style={styles.sec}>Basic Information</Text>
          <Field label="Full Name *" value={name} onChange={setName} placeholder="e.g. Rahman Khan" />
          <Text style={styles.label}>Department *</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowDept(s => !s)}>
            <Text style={styles.pickerText}>{customDept || department}</Text>
            <Ionicons name={showDept ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7A90" />
          </TouchableOpacity>
          {showDept && (
            <View style={styles.opts}>
              {DEPARTMENTS.map(d => (
                <TouchableOpacity key={d} style={[styles.opt, department === d && !customDept && styles.optActive]} onPress={() => { setDepartment(d); setCustomDept(''); setShowDept(false); }}>
                  <Text style={[styles.optText, department === d && !customDept && { color: '#fff' }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Field label="Or New Department" value={customDept} onChange={setCustomDept} placeholder="Type to create new..." />
          <Field label="Designation *" value={designation} onChange={setDesignation} placeholder="e.g. Operator, Accountant" />
          <Text style={styles.label}>Joining Date (YYYY-MM-DD)</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <View style={{ flex: 1 }}><Field label="Year" value={yy} onChange={setYy} keyboardType="numeric" placeholder="2026" /></View>
            <View style={{ flex: 1 }}><Field label="Month" value={mm} onChange={setMm} keyboardType="numeric" placeholder="09" /></View>
            <View style={{ flex: 1 }}><Field label="Day" value={dd} onChange={setDd} keyboardType="numeric" placeholder="17" /></View>
          </View>
          <Text style={styles.label}>Status</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
            {(['Active', 'Inactive'] as const).map(s => (
              <TouchableOpacity key={s} style={[styles.statusBtn, status === s && (s === 'Active' ? styles.statusA : styles.statusI)]} onPress={() => setStatus(s)}>
                <Text style={[styles.statusText, status === s && { color: '#fff' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.sec}>Salary Structure (Monthly ₹)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Basic *" value={basic} onChange={setBasic} keyboardType="numeric" placeholder="20000" /></View>
            <View style={{ flex: 1 }}><Field label="HRA" value={hra} onChange={setHra} keyboardType="numeric" placeholder="6000" /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Transport" value={transport} onChange={setTransport} keyboardType="numeric" placeholder="2000" /></View>
            <View style={{ flex: 1 }}><Field label="Medical" value={medical} onChange={setMedical} keyboardType="numeric" placeholder="1500" /></View>
          </View>
          <Field label="Other Allowance" value={other} onChange={setOther} keyboardType="numeric" placeholder="1000" />
          <View style={styles.grossBar}>
            <Text style={styles.grossLbl}>Gross / Month</Text>
            <Text style={styles.grossVal}>₹{gross.toLocaleString('en-IN')}</Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.sec}>Contact & Identity</Text>
          <Field label="Mobile *" value={mobile} onChange={setMobile} keyboardType="phone-pad" placeholder="10-digit mobile" />
          <Field label="Email" value={email} onChange={setEmail} keyboardType="email-address" placeholder="name@office.com" />
          <Field label="Address" value={address} onChange={setAddress} multiline placeholder="Full address" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="PAN" value={pan} onChange={setPan} placeholder="ABCDE1234F" /></View>
            <View style={{ flex: 1 }}><Field label="Aadhar" value={aadhar} onChange={setAadhar} keyboardType="numeric" placeholder="12-digit" /></View>
          </View>
        </Card>

        <Card>
          <Text style={styles.sec}>Bank Details (for salary transfer)</Text>
          <Field label="Bank Name" value={bankName} onChange={setBankName} placeholder="e.g. State Bank of India" />
          <Field label="Account Number" value={account} onChange={setAccount} keyboardType="numeric" placeholder="Account no." />
          <Field label="IFSC Code" value={ifsc} onChange={setIfsc} placeholder="e.g. SBIN0012345" />
        </Card>

        <Btn title={existing ? 'Update Employee' : 'Add Employee'} icon="checkmark-circle" onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  sec: { fontSize: 15, fontWeight: '800', color: '#0B2B4C', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7A90', marginBottom: 6, textTransform: 'uppercase' },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginBottom: 12 },
  pickerText: { fontSize: 15, color: '#152238', fontWeight: '600' },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  opt: { backgroundColor: '#E8EDF4', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  optActive: { backgroundColor: '#0B2B4C' },
  optText: { fontSize: 13, fontWeight: '700', color: '#0B2B4C' },
  statusBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: '#E8EDF4' },
  statusA: { backgroundColor: '#16A34A' },
  statusI: { backgroundColor: '#6B7A90' },
  statusText: { fontWeight: '800', color: '#0B2B4C' },
  grossBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0B2B4C', borderRadius: 10, padding: 12 },
  grossLbl: { color: '#B9C9DD', fontWeight: '600' },
  grossVal: { color: '#fff', fontWeight: '900', fontSize: 17 },
});
