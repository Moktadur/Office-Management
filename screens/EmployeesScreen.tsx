import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { formatINR, initials } from '../lib/utils';
import { SearchBar, Badge, EmptyState, Chip, COLORS } from '../components/ui';
import { employeeListHTML, printHTML, shareTextFile } from '../lib/pdf';
import { Employee } from '../lib/types';

export function EmployeeListScreen({ navigation }: any) {
  const { employees, isAdmin, deleteEmployee, addLog, company } = useApp();
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('All');
  const [status, setStatus] = useState('All');
  const [sortKey, setSortKey] = useState<'name' | 'salary'>('name');

  const depts = useMemo(() => ['All', ...Array.from(new Set(employees.map(e => e.department)))], [employees]);

  const list = useMemo(() => {
    let l = [...employees];
    if (dept !== 'All') l = l.filter(e => e.department === dept);
    if (status !== 'All') l = l.filter(e => e.status === status);
    if (q.trim()) {
      const s = q.toLowerCase();
      l = l.filter(e => e.name.toLowerCase().includes(s) || e.empId.toLowerCase().includes(s) || e.designation.toLowerCase().includes(s) || e.mobile.includes(s));
    }
    if (sortKey === 'name') l.sort((a, b) => a.name.localeCompare(b.name));
    else l.sort((a, b) => (b.basicSalary + b.allowances.hra + b.allowances.transport + b.allowances.medical + b.allowances.other) - (a.basicSalary + a.allowances.hra + a.allowances.transport + a.allowances.medical + a.allowances.other));
    return l;
  }, [employees, dept, status, q, sortKey]);

  const exportCSV = () => {
    const header = 'EmpID,Name,Department,Designation,Joining,Mobile,Basic,HRA,Transport,Medical,Other,Gross,Status';
    const lines = list.map(e => {
      const g = e.basicSalary + e.allowances.hra + e.allowances.transport + e.allowances.medical + e.allowances.other;
      return [e.empId, `"${e.name}"`, e.department, e.designation, e.joiningDate, e.mobile, e.basicSalary, e.allowances.hra, e.allowances.transport, e.allowances.medical, e.allowances.other, g, e.status].join(',');
    });
    shareTextFile('employees.csv', [header, ...lines].join('\n'));
    addLog(`Exported employee list CSV (${list.length} records)`);
  };

  const exportPDF = () => {
    printHTML(employeeListHTML(list, company));
    addLog(`Exported employee list PDF (${list.length} records)`);
  };

  const confirmDelete = (e: Employee) => {
    Alert.alert('Delete Employee', `Remove ${e.name} (${e.empId})?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteEmployee(e.id); addLog(`Deleted employee ${e.name} (${e.empId})`); } },
    ]);
  };

  const renderItem = ({ item: e }: { item: Employee }) => {
    const gross = e.basicSalary + e.allowances.hra + e.allowances.transport + e.allowances.medical + e.allowances.other;
    return (
      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('EmployeeDetail', { id: e.id })}>
        <View style={[styles.avatar, { backgroundColor: e.avatarColor }]}>
          <Text style={styles.avatarText}>{initials(e.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{e.name} <Text style={styles.empid}>• {e.empId}</Text></Text>
          <Text style={styles.sub}>{e.designation} • {e.department}</Text>
          <Text style={styles.sal}>{formatINR(gross)}/mo</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Badge text={e.status} tone={e.status === 'Active' ? 'green' : 'gray'} />
          {isAdmin && (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('EmployeeForm', { id: e.id })}>
                <Ionicons name="pencil" size={15} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(e)}>
                <Ionicons name="trash" size={15} color="#DC2626" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.bg}>
      <View style={styles.top}>
        <SearchBar value={q} onChange={setQ} placeholder="Search name, ID, designation, mobile..." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {depts.map(d => <Chip key={d} label={d} active={dept === d} onPress={() => setDept(d)} />)}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            {['All', 'Active', 'Inactive'].map(s => <Chip key={s} label={s} active={status === s} onPress={() => setStatus(s)} />)}
          </ScrollView>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setSortKey(k => k === 'name' ? 'salary' : 'name')}>
            <Ionicons name="swap-vertical" size={15} color="#0B2B4C" />
            <Text style={styles.sortText}>{sortKey === 'name' ? 'Name' : 'Salary'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TouchableOpacity style={styles.expBtn} onPress={exportCSV}>
            <Ionicons name="download" size={15} color="#16A34A" /><Text style={styles.expText}>CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.expBtn} onPress={exportPDF}>
            <Ionicons name="document-text" size={15} color="#DC2626" /><Text style={styles.expText}>PDF Report</Text>
          </TouchableOpacity>
          <Text style={styles.count}>{list.length} employees</Text>
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={e => e.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<EmptyState icon="people" title="No employees found" subtitle="Try a different search or filter" />}
      />
      {isAdmin && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('EmployeeForm')}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  top: { padding: 12, paddingBottom: 4, backgroundColor: COLORS.bg },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#EDF1F7', gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  name: { fontSize: 15, fontWeight: '800', color: '#152238' },
  empid: { fontSize: 12, fontWeight: '600', color: '#6B7A90' },
  sub: { fontSize: 12, color: '#6B7A90', marginTop: 1 },
  sal: { fontSize: 13, fontWeight: '800', color: '#0B2B4C', marginTop: 2 },
  iconBtn: { padding: 6, backgroundColor: '#F2F4F8', borderRadius: 8 },
  fab: { position: 'absolute', right: 18, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: '#0B2B4C', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6 },
  expBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#E2E8F0' },
  expText: { fontSize: 12, fontWeight: '700', color: '#0B2B4C' },
  count: { flex: 1, textAlign: 'right', fontSize: 12, color: '#6B7A90', fontWeight: '600', alignSelf: 'center' },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#E2E8F0' },
  sortText: { fontSize: 12, fontWeight: '700', color: '#0B2B4C' },
});
