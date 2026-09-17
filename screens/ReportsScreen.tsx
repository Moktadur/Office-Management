import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { formatINR, MONTHS, MONTHS_SHORT, numToWordsIndian } from '../lib/utils';
import { Card, Btn, COLORS, Badge } from '../components/ui';
import { payrollReportHTML, employeeListHTML, printHTML, shareTextFile } from '../lib/pdf';
import { DOC_CATS } from './DocsScreen';

export default function ReportsScreen({ navigation }: any) {
  const { employees, payroll, documents, attendance, company, addLog } = useApp();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const shiftMonth = (d: number) => {
    let m = month + d, y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };

  const payrollRows = useMemo(() =>
    payroll.filter(p => p.month === month && p.year === year)
      .map(p => ({ rec: p, emp: employees.find(e => e.id === p.employeeId)! }))
      .filter(r => r.emp),
    [payroll, employees, month, year]);

  const net = payrollRows.reduce((s, r) => s + r.rec.breakup.net, 0);
  const gross = payrollRows.reduce((s, r) => s + r.rec.breakup.gross, 0);
  const pf = payrollRows.reduce((s, r) => s + r.rec.breakup.pf, 0);
  const esi = payrollRows.reduce((s, r) => s + r.rec.breakup.esi, 0);
  const tds = payrollRows.reduce((s, r) => s + r.rec.breakup.tds, 0);

  const deptWise = useMemo(() => {
    const m = new Map<string, { count: number; net: number }>();
    payrollRows.forEach(({ emp, rec }) => {
      const d = m.get(emp.department) || { count: 0, net: 0 };
      d.count++; d.net += rec.breakup.net;
      m.set(emp.department, d);
    });
    return Array.from(m.entries()).sort((a, b) => b[1].net - a[1].net);
  }, [payrollRows]);

  const maxDept = Math.max(...deptWise.map(d => d[1].net), 1);

  const last6 = useMemo(() => {
    const out: Array<{ label: string; net: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const m = d.getMonth() + 1, y = d.getFullYear();
      const n = payroll.filter(p => p.month === m && p.year === y).reduce((s, p) => s + p.breakup.net, 0);
      out.push({ label: MONTHS_SHORT[m - 1], net: n });
    }
    return out;
  }, [payroll, month, year]);
  const maxTrend = Math.max(...last6.map(t => t.net), 1);

  const docCounts = useMemo(() => {
    const m: Record<string, number> = {};
    documents.forEach(d => { m[d.category] = (m[d.category] || 0) + 1; });
    return m;
  }, [documents]);

  const key = `${year}-${String(month).padStart(2, '0')}`;
  const attP = attendance.filter(a => a.date.startsWith(key) && a.status === 'P').length;
  const attA = attendance.filter(a => a.date.startsWith(key) && a.status === 'A').length;
  const attL = attendance.filter(a => a.date.startsWith(key) && a.status === 'L').length;

  const payrollPDF = () => {
    if (!payrollRows.length) { Alert.alert('Empty', 'No payroll for this month.'); return; }
    printHTML(payrollReportHTML(payrollRows, month, year, company));
    addLog(`Payroll report PDF: ${MONTHS[month - 1]} ${year}`);
  };
  const empPDF = () => {
    printHTML(employeeListHTML(employees, company));
    addLog('Employee master PDF exported');
  };
  const bankCSV = () => {
    if (!payrollRows.length) { Alert.alert('Empty', 'No payroll for this month.'); return; }
    const header = 'EmpID,Name,Account,IFSC,Bank,NetAmount';
    const lines = payrollRows.map(({ emp, rec }) => [emp.empId, `"${emp.name}"`, emp.bank.account, emp.bank.ifsc, `"${emp.bank.bankName}"`, rec.breakup.net].join(','));
    shareTextFile(`bank-transfer-${year}-${String(month).padStart(2, '0')}.csv`, [header, ...lines].join('\n'));
    addLog('Bank transfer CSV exported');
  };
  const attCSV = () => {
    const header = 'Date,EmpID,Name,Status,OTHours';
    const lines = attendance.filter(a => a.date.startsWith(key)).map(a => {
      const e = employees.find(x => x.id === a.employeeId);
      return [a.date, e?.empId || '', `"${e?.name || ''}"`, a.status, a.otHours].join(',');
    });
    if (!lines.length) { Alert.alert('Empty', 'No attendance for this month.'); return; }
    shareTextFile(`attendance-${key}.csv`, [header, ...lines].join('\n'));
    addLog(`Attendance CSV: ${MONTHS[month - 1]} ${year}`);
  };

  return (
    <ScrollView style={styles.bg} contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#0B2B4C" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color="#0B2B4C" />
        </TouchableOpacity>
      </View>

      <Card>
        <Text style={styles.cardT}>Salary Summary</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpi}><Text style={styles.kpiV}>{formatINR(gross)}</Text><Text style={styles.kpiL}>Gross</Text></View>
          <View style={styles.kpi}><Text style={[styles.kpiV, { color: '#DC2626' }]}>{formatINR(gross - net)}</Text><Text style={styles.kpiL}>Deductions</Text></View>
        </View>
        <View style={styles.netBar}>
          <Text style={styles.netL}>Net Payable • {payrollRows.length} employees</Text>
          <Text style={styles.netV}>{formatINR(net)}</Text>
          <Text style={styles.words}>Rupees {net ? numToWordsIndian(net) : 'Zero'} Only</Text>
        </View>
        <View style={styles.statGrid}>
          <View style={styles.stat}><Text style={styles.statV}>{formatINR(pf)}</Text><Text style={styles.statL}>PF Total</Text></View>
          <View style={styles.stat}><Text style={styles.statV}>{formatINR(esi)}</Text><Text style={styles.statL}>ESI Total</Text></View>
          <View style={styles.stat}><Text style={styles.statV}>{formatINR(tds)}</Text><Text style={styles.statL}>TDS Total</Text></View>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardT}>Department-wise Cost</Text>
        {deptWise.length === 0 && <Text style={styles.muted}>No data for this month</Text>}
        {deptWise.map(([d, v]) => (
          <View key={d} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.barLbl}>{d} ({v.count})</Text>
              <Text style={styles.barVal}>{formatINR(v.net)}</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${Math.max(4, (v.net / maxDept) * 100)}%` }]} />
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.cardT}>6-Month Salary Trend</Text>
        <View style={styles.trendRow}>
          {last6.map(t => (
            <View key={t.label} style={styles.trendCol}>
              <View style={styles.trendTrack}>
                <View style={[styles.trendFill, { height: `${Math.max(3, (t.net / maxTrend) * 100)}%` }]} />
              </View>
              <Text style={styles.trendLbl}>{t.label}</Text>
              <Text style={styles.trendVal}>{t.net ? `₹${Math.round(t.net / 1000)}k` : '-'}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.cardT}>Attendance Overview</Text>
        <View style={styles.statGrid}>
          <View style={[styles.stat, { backgroundColor: '#DCFCE7' }]}><Text style={styles.statV}>{attP}</Text><Text style={styles.statL}>Present</Text></View>
          <View style={[styles.stat, { backgroundColor: '#FEE2E2' }]}><Text style={styles.statV}>{attA}</Text><Text style={styles.statL}>Absent</Text></View>
          <View style={[styles.stat, { backgroundColor: '#FEF3C7' }]}><Text style={styles.statV}>{attL}</Text><Text style={styles.statL}>Leave</Text></View>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardT}>Document Vault</Text>
        {DOC_CATS.map(x => (
          <View key={x.c} style={styles.docRow}>
            <View style={[styles.docDot, { backgroundColor: x.bg }]}>
              <Ionicons name={x.icon} size={15} color={x.color} />
            </View>
            <Text style={styles.docLbl}>{x.c}</Text>
            <Badge text={String(docCounts[x.c] || 0)} tone="blue" />
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.cardT}>Export Reports</Text>
        <View style={{ gap: 8 }}>
          <Btn title="Monthly Payroll Report (PDF)" icon="document-text" onPress={payrollPDF} />
          <Btn title="Employee Master List (PDF)" icon="people" variant="secondary" onPress={empPDF} />
          <Btn title="Bank Transfer Sheet (CSV)" icon="card" variant="secondary" onPress={bankCSV} />
          <Btn title="Attendance Register (CSV)" icon="calendar" variant="secondary" onPress={attCSV} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#EDF1F7' },
  navBtn: { padding: 8, backgroundColor: '#F2F4F8', borderRadius: 8 },
  monthTitle: { fontSize: 17, fontWeight: '800', color: '#0B2B4C' },
  cardT: { fontSize: 16, fontWeight: '800', color: '#0B2B4C', marginBottom: 10 },
  kpiGrid: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, backgroundColor: '#F2F4F8', borderRadius: 10, padding: 12, alignItems: 'center' },
  kpiV: { fontSize: 16, fontWeight: '900', color: '#0B2B4C' },
  kpiL: { fontSize: 11, color: '#6B7A90', fontWeight: '600', marginTop: 2 },
  netBar: { backgroundColor: '#0B2B4C', borderRadius: 12, padding: 14, marginTop: 10, alignItems: 'center' },
  netL: { color: '#B9C9DD', fontSize: 12, fontWeight: '600' },
  netV: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 2 },
  words: { color: '#8FA3BD', fontSize: 11, marginTop: 4, textAlign: 'center' },
  statGrid: { flexDirection: 'row', gap: 8, marginTop: 10 },
  stat: { flex: 1, backgroundColor: '#F2F4F8', borderRadius: 10, padding: 10, alignItems: 'center' },
  statV: { fontSize: 14, fontWeight: '900', color: '#0B2B4C' },
  statL: { fontSize: 10, color: '#6B7A90', fontWeight: '600' },
  barLbl: { fontSize: 13, fontWeight: '700', color: '#152238' },
  barVal: { fontSize: 13, fontWeight: '800', color: '#0B2B4C' },
  barBg: { height: 10, backgroundColor: '#EDF1F7', borderRadius: 5, marginTop: 4, overflow: 'hidden' },
  barFill: { height: 10, backgroundColor: '#0B2B4C', borderRadius: 5 },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between' },
  trendCol: { flex: 1, alignItems: 'center' },
  trendTrack: { height: 110, width: 26, backgroundColor: '#EDF1F7', borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  trendFill: { backgroundColor: '#16A34A', borderRadius: 8, width: '100%' },
  trendLbl: { fontSize: 11, fontWeight: '700', color: '#0B2B4C', marginTop: 4 },
  trendVal: { fontSize: 10, color: '#6B7A90' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  docDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  docLbl: { flex: 1, fontSize: 13, fontWeight: '600', color: '#152238' },
  muted: { color: '#6B7A90', fontSize: 13 },
});
