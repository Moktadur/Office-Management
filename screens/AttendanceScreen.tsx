import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { AttendanceStatus } from '../lib/types';
import { toISODate, daysInMonth, formatDate, MONTHS_SHORT, initials } from '../lib/utils';
import { Card, Badge, COLORS, EmptyState, Btn } from '../components/ui';

const STATUS_META: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  P: { label: 'Present', color: '#16A34A', bg: '#DCFCE7' },
  A: { label: 'Absent', color: '#DC2626', bg: '#FEE2E2' },
  L: { label: 'Leave', color: '#D97706', bg: '#FEF3C7' },
  H: { label: 'Holiday', color: '#2563EB', bg: '#DBEAFE' },
};

export default function AttendanceScreen({ navigation }: any) {
  const { employees, attendance, markAttendance, addLog, isAdmin } = useApp();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [day, setDay] = useState(now.getDate());
  const [mode, setMode] = useState<'daily' | 'monthly'>('daily');

  const dateStr = toISODate(year, month, Math.min(day, daysInMonth(month, year)));
  const active = employees.filter(e => e.status === 'Active');

  const dayMap = useMemo(() => {
    const m = new Map<string, { status: AttendanceStatus; ot: number }>();
    attendance.filter(a => a.date === dateStr).forEach(a => m.set(a.employeeId, { status: a.status, ot: a.otHours }));
    return m;
  }, [attendance, dateStr]);

  const monthSummary = useMemo(() => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return active.map(e => {
      const recs = attendance.filter(a => a.employeeId === e.id && a.date.startsWith(key));
      return {
        e,
        p: recs.filter(a => a.status === 'P').length,
        a: recs.filter(a => a.status === 'A').length,
        l: recs.filter(a => a.status === 'L').length,
        ot: recs.reduce((s, r) => s + (r.otHours || 0), 0),
      };
    });
  }, [attendance, active, month, year]);

  const dim = daysInMonth(month, year);
  const days = Array.from({ length: dim }, (_, i) => i + 1);

  const shiftMonth = (d: number) => {
    let m = month + d, y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y); setDay(1);
  };

  const markAll = (status: AttendanceStatus) => {
    active.forEach(e => markAttendance(e.id, dateStr, status, 0));
    addLog(`Marked all ${STATUS_META[status].label} for ${dateStr}`);
    Alert.alert('Done', `All employees marked ${STATUS_META[status].label} for ${formatDate(dateStr)}`);
  };

  const cycle = (empId: string) => {
    const cur = dayMap.get(empId)?.status || 'P';
    const order: AttendanceStatus[] = ['P', 'A', 'L', 'H'];
    const next = order[(order.indexOf(cur) + 1) % order.length];
    markAttendance(empId, dateStr, next, dayMap.get(empId)?.ot || 0);
  };

  const bumpOT = (empId: string, d: number) => {
    const cur = dayMap.get(empId) || { status: 'P' as AttendanceStatus, ot: 0 };
    const ot = Math.max(0, Math.min(12, cur.ot + d));
    markAttendance(empId, dateStr, cur.status, ot);
  };

  return (
    <View style={styles.bg}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#0B2B4C" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{['', 'January','February','March','April','May','June','July','August','September','October','November','December'][month]} {year}</Text>
        <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color="#0B2B4C" />
        </TouchableOpacity>
      </View>

      <View style={styles.modeRow}>
        <TouchableOpacity style={[styles.mode, mode === 'daily' && styles.modeActive]} onPress={() => setMode('daily')}>
          <Ionicons name="today" size={15} color={mode === 'daily' ? '#fff' : '#0B2B4C'} />
          <Text style={[styles.modeText, mode === 'daily' && { color: '#fff' }]}>Daily Marking</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mode, mode === 'monthly' && styles.modeActive]} onPress={() => setMode('monthly')}>
          <Ionicons name="calendar" size={15} color={mode === 'monthly' ? '#fff' : '#0B2B4C'} />
          <Text style={[styles.modeText, mode === 'monthly' && { color: '#fff' }]}>Monthly Summary</Text>
        </TouchableOpacity>
      </View>

      {mode === 'daily' && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayStrip} contentContainerStyle={{ paddingHorizontal: 12 }}>
            {days.map(d => {
              const dt = new Date(year, month - 1, d);
              const sun = dt.getDay() === 0;
              const sel = d === Math.min(day, dim);
              return (
                <TouchableOpacity key={d} style={[styles.dayCell, sel && styles.daySel, sun && !sel && styles.daySun]} onPress={() => setDay(d)}>
                  <Text style={[styles.dayNum, sel && { color: '#fff' }, sun && !sel && { color: '#DC2626' }]}>{d}</Text>
                  <Text style={[styles.dayName, sel && { color: '#fff' }]}>{['S','M','T','W','T','F','S'][dt.getDay()]}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.markAllRow}>
            <Text style={styles.dateLabel}>{formatDate(dateStr)}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['P', 'A', 'H'] as AttendanceStatus[]).map(s => (
                <TouchableOpacity key={s} style={[styles.miniBtn, { backgroundColor: STATUS_META[s].bg }]} onPress={() => markAll(s)}>
                  <Text style={[styles.miniText, { color: STATUS_META[s].color }]}>All {s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <FlatList
            data={active}
            keyExtractor={e => e.id}
            contentContainerStyle={{ padding: 12 }}
            ListEmptyComponent={<EmptyState icon="people" title="No active employees" />}
            renderItem={({ item: e }) => {
              const rec = dayMap.get(e.id) || { status: 'P' as AttendanceStatus, ot: 0 };
              const meta = STATUS_META[rec.status];
              return (
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.avatar, { backgroundColor: e.avatarColor }]} onPress={() => navigation.navigate('Employees', { screen: 'EmployeeDetail', params: { id: e.id } })}>
                    <Text style={styles.avatarText}>{initials(e.name)}</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{e.name}</Text>
                    <Text style={styles.sub}>{e.empId} • OT: {rec.ot}h</Text>
                  </View>
                  <View style={styles.otBox}>
                    <TouchableOpacity onPress={() => bumpOT(e.id, -1)}><Ionicons name="remove-circle" size={20} color="#6B7A90" /></TouchableOpacity>
                    <Text style={styles.otText}>{rec.ot}h</Text>
                    <TouchableOpacity onPress={() => bumpOT(e.id, 1)}><Ionicons name="add-circle" size={20} color="#0B2B4C" /></TouchableOpacity>
                  </View>
                  <TouchableOpacity style={[styles.statusBtn, { backgroundColor: meta.bg }]} onPress={() => cycle(e.id)}>
                    <Text style={[styles.statusText, { color: meta.color }]}>{rec.status}</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
          <View style={styles.legend}>
            {(Object.keys(STATUS_META) as AttendanceStatus[]).map(s => (
              <View key={s} style={styles.legItem}>
                <View style={[styles.dot, { backgroundColor: STATUS_META[s].color }]} />
                <Text style={styles.legText}>{s}={STATUS_META[s].label}</Text>
              </View>
            ))}
            <Text style={styles.legText}>Tap status to change</Text>
          </View>
        </>
      )}

      {mode === 'monthly' && (
        <FlatList
          data={monthSummary}
          keyExtractor={r => r.e.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item: r }) => (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.avatar, { backgroundColor: r.e.avatarColor }]}>
                  <Text style={styles.avatarText}>{initials(r.e.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.e.name}</Text>
                  <Text style={styles.sub}>{r.e.empId} • {MONTHS_SHORT[month - 1]} {year}</Text>
                </View>
              </View>
              <View style={styles.sumGrid}>
                <View style={[styles.sumBox, { backgroundColor: '#DCFCE7' }]}><Text style={styles.sumNum}>{r.p}</Text><Text style={styles.sumLbl}>Present</Text></View>
                <View style={[styles.sumBox, { backgroundColor: '#FEE2E2' }]}><Text style={styles.sumNum}>{r.a}</Text><Text style={styles.sumLbl}>Absent</Text></View>
                <View style={[styles.sumBox, { backgroundColor: '#FEF3C7' }]}><Text style={styles.sumNum}>{r.l}</Text><Text style={styles.sumLbl}>Leave</Text></View>
                <View style={[styles.sumBox, { backgroundColor: '#DBEAFE' }]}><Text style={styles.sumNum}>{r.ot}h</Text><Text style={styles.sumLbl}>OT</Text></View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  navBtn: { padding: 8, backgroundColor: '#F2F4F8', borderRadius: 8 },
  monthTitle: { fontSize: 17, fontWeight: '800', color: '#0B2B4C' },
  modeRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 4 },
  mode: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#E8EDF4', borderRadius: 10, paddingVertical: 10 },
  modeActive: { backgroundColor: '#0B2B4C' },
  modeText: { fontWeight: '800', fontSize: 13, color: '#0B2B4C' },
  dayStrip: { maxHeight: 74, marginTop: 8 },
  dayCell: { width: 46, height: 60, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  daySel: { backgroundColor: '#0B2B4C', borderColor: '#0B2B4C' },
  daySun: { backgroundColor: '#FFF1F1' },
  dayNum: { fontSize: 16, fontWeight: '800', color: '#152238' },
  dayName: { fontSize: 11, color: '#6B7A90', fontWeight: '600' },
  markAllRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  dateLabel: { fontSize: 14, fontWeight: '800', color: '#0B2B4C' },
  miniBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  miniText: { fontSize: 12, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#EDF1F7', gap: 8 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800' },
  name: { fontSize: 14, fontWeight: '700', color: '#152238' },
  sub: { fontSize: 12, color: '#6B7A90' },
  otBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F2F4F8', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 },
  otText: { fontSize: 12, fontWeight: '800', color: '#0B2B4C', minWidth: 26, textAlign: 'center' },
  statusBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 16, fontWeight: '900' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0', flexWrap: 'wrap' },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legText: { fontSize: 11, color: '#6B7A90', fontWeight: '600' },
  sumGrid: { flexDirection: 'row', gap: 8, marginTop: 10 },
  sumBox: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  sumNum: { fontSize: 17, fontWeight: '900', color: '#0B2B4C' },
  sumLbl: { fontSize: 10, color: '#6B7A90', fontWeight: '600' },
});
