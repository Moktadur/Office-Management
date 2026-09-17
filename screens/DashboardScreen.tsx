import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { formatINR, initials, MONTHS, todayISO } from '../lib/utils';
import { Card, Badge, COLORS } from '../components/ui';

export default function DashboardScreen({ navigation }: any) {
  const { employees, payroll, documents, attendance, company, user } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);
  const now = new Date();
  const cm = now.getMonth() + 1;
  const cy = now.getFullYear();
  const today = todayISO();

  const stats = useMemo(() => {
    const active = employees.filter(e => e.status === 'Active');
    const depts = new Set(employees.map(e => e.department)).size;
    const thisMonth = payroll.filter(p => p.month === cm && p.year === cy);
    const totalSalary = thisMonth.reduce((s, p) => s + p.breakup.net, 0);
    const pending = thisMonth.filter(p => !p.paid).length;
    const todayP = attendance.filter(a => a.date === today && a.status === 'P').length;
    const todayA = attendance.filter(a => a.date === today && a.status === 'A').length;
    return { total: employees.length, active: active.length, depts, totalSalary, pending, todayP, todayA };
  }, [employees, payroll, documents, attendance, cm, cy, today]);

  const recentEmps = useMemo(() => {
    const mp = new Map(payroll.filter(p => p.month === cm && p.year === cy).map(p => [p.employeeId, p]));
    return employees.slice(0, 8).map(e => ({ e, pay: mp.get(e.id) }));
  }, [employees, payroll, cm, cy]);

  const tiles = [
    { icon: 'people' as const, label: 'Employees', value: String(stats.total), sub: `${stats.active} active`, color: '#2563EB', bg: '#DBEAFE', go: 'Employees' },
    { icon: 'business' as const, label: 'Departments', value: String(stats.depts), sub: 'across office', color: '#7C3AED', bg: '#EDE9FE', go: 'Employees' },
    { icon: 'wallet' as const, label: `${MONTHS[cm - 1]} Salary`, value: formatINR(stats.totalSalary), sub: 'net payable', color: '#16A34A', bg: '#DCFCE7', go: 'Payroll' },
    { icon: 'time' as const, label: 'Payments Pending', value: String(stats.pending), sub: 'this month', color: '#D97706', bg: '#FEF3C7', go: 'Payroll' },
    { icon: 'checkmark-circle' as const, label: 'Present Today', value: String(stats.todayP), sub: 'attendance', color: '#0EA5E9', bg: '#E0F2FE', go: 'Attendance' },
    { icon: 'folder-open' as const, label: 'Documents', value: String(documents.length), sub: 'in vault', color: '#EC4899', bg: '#FCE7F3', go: 'Documents' },
  ];

  return (
    <FlatList
      style={styles.bg}
      contentContainerStyle={styles.content}
      data={[{ k: 'x' }]}
      keyExtractor={i => i.k}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); }} />}
      renderItem={() => (
        <>
          <LinearGradient colors={['#0B2B4C', '#1D4E89']} style={styles.hero}>
            <View>
              <Text style={styles.hello}>Namaste, {user?.name || 'User'} 🙏</Text>
              <Text style={styles.cname}>{company.name}</Text>
              <Text style={styles.cdate}>{MONTHS[cm - 1]} {cy} • Today: {stats.todayP} Present, {stats.todayA} Absent</Text>
            </View>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings" size={22} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.grid}>
            {tiles.map(t => (
              <TouchableOpacity key={t.label} style={styles.tile} onPress={() => navigation.navigate(t.go)}>
                <View style={[styles.tileIcon, { backgroundColor: t.bg }]}>
                  <Ionicons name={t.icon} size={22} color={t.color} />
                </View>
                <Text style={styles.tileValue} numberOfLines={1}>{t.value}</Text>
                <Text style={styles.tileLabel}>{t.label}</Text>
                <Text style={styles.tileSub}>{t.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Quick Actions</Text>
            </View>
            <View style={styles.qaGrid}>
              <TouchableOpacity style={styles.qa} onPress={() => navigation.navigate('Employees', { screen: 'EmployeeForm' })}>
                <Ionicons name="person-add" size={20} color="#0B2B4C" />
                <Text style={styles.qaText}>Add Employee</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qa} onPress={() => navigation.navigate('Attendance')}>
                <Ionicons name="calendar" size={20} color="#0B2B4C" />
                <Text style={styles.qaText}>Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qa} onPress={() => navigation.navigate('Payroll')}>
                <Ionicons name="cash" size={20} color="#0B2B4C" />
                <Text style={styles.qaText}>Run Payroll</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.qa} onPress={() => navigation.navigate('Excel')}>
                <Ionicons name="grid" size={20} color="#0B2B4C" />
                <Text style={styles.qaText}>New Sheet</Text>
              </TouchableOpacity>
            </View>
          </Card>

          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Employee Overview</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Employees')}>
                <Text style={styles.link}>View All →</Text>
              </TouchableOpacity>
            </View>
            {recentEmps.map(({ e, pay }) => (
              <TouchableOpacity key={e.id} style={styles.empRow} onPress={() => navigation.navigate('Employees', { screen: 'EmployeeDetail', params: { id: e.id } })}>
                <View style={[styles.avatar, { backgroundColor: e.avatarColor }]}>
                  <Text style={styles.avatarText}>{initials(e.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.empName}>{e.name}</Text>
                  <Text style={styles.empSub}>{e.designation} • {e.department}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.empSal}>{pay ? formatINR(pay.breakup.net) : '-'}</Text>
                  <Badge text={e.status} tone={e.status === 'Active' ? 'green' : 'gray'} />
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        </>
      )}
    />
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 14, paddingBottom: 30 },
  hero: { borderRadius: 16, padding: 18, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hello: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cname: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 2 },
  cdate: { color: '#B9C9DD', fontSize: 12, marginTop: 4 },
  avatarBtn: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 2 },
  tile: { width: '31%', backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#EDF1F7' },
  tileIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileValue: { fontSize: 15, fontWeight: '900', color: '#0B2B4C' },
  tileLabel: { fontSize: 11, fontWeight: '700', color: '#152238', marginTop: 2 },
  tileSub: { fontSize: 10, color: '#6B7A90' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0B2B4C' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  link: { color: '#2563EB', fontWeight: '700', fontSize: 13 },
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qa: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F2F4F8', borderRadius: 10, padding: 12 },
  qaText: { fontSize: 13, fontWeight: '700', color: '#0B2B4C' },
  empRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  empName: { fontSize: 14, fontWeight: '700', color: '#152238' },
  empSub: { fontSize: 12, color: '#6B7A90' },
  empSal: { fontSize: 14, fontWeight: '800', color: '#0B2B4C', marginBottom: 3 },
});
