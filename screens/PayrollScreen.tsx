import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { formatINR, initials, MONTHS, MONTHS_SHORT, num } from '../lib/utils';
import { Card, Badge, Btn, Field, EmptyState, COLORS, SearchBar } from '../components/ui';
import { payslipHTML, payrollReportHTML, printHTML, shareTextFile } from '../lib/pdf';

export function PayrollListScreen({ navigation }: any) {
  const { employees, payroll, generatePayroll, markAllPaid, addLog, company, isAdmin, setPaid, updatePayrollExtras } = useApp();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [q, setQ] = useState('');
  const [editRec, setEditRec] = useState<string | null>(null);
  const [fBonus, setFBonus] = useState('');
  const [fAdv, setFAdv] = useState('');
  const [fDed, setFDed] = useState('');
  const [fOT, setFOT] = useState('');

  const recs = useMemo(() => {
    let l = payroll.filter(p => p.month === month && p.year === year)
      .map(p => ({ p, e: employees.find(e => e.id === p.employeeId)! }))
      .filter(r => r.e);
    if (q.trim()) {
      const s = q.toLowerCase();
      l = l.filter(r => r.e.name.toLowerCase().includes(s) || r.e.empId.toLowerCase().includes(s));
    }
    l.sort((a, b) => a.e.name.localeCompare(b.e.name));
    return l;
  }, [payroll, employees, month, year, q]);

  const totals = useMemo(() => ({
    gross: recs.reduce((s, r) => s + r.p.breakup.gross, 0),
    ded: recs.reduce((s, r) => s + r.p.breakup.totalDeduction, 0),
    net: recs.reduce((s, r) => s + r.p.breakup.net, 0),
    paid: recs.filter(r => r.p.paid).length,
  }), [recs]);

  const shiftMonth = (d: number) => {
    let m = month + d, y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };

  const runPayroll = () => {
    const n = generatePayroll(month, year);
    addLog(`Generated payroll for ${MONTHS[month - 1]} ${year} (${n} employees)`);
    Alert.alert('Payroll Generated', `${n} salary slips calculated for ${MONTHS[month - 1]} ${year} from attendance data.`);
  };

  const doMarkAllPaid = () => {
    Alert.alert('Mark All Paid?', `Mark ${recs.length} salaries as paid for ${MONTHS[month - 1]} ${year}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Paid', onPress: () => { markAllPaid(month, year); addLog(`Marked all paid: ${MONTHS[month - 1]} ${year}`); } },
    ]);
  };

  const exportReportPDF = () => {
    if (recs.length === 0) { Alert.alert('Empty', 'No payroll records for this month. Generate payroll first.'); return; }
    printHTML(payrollReportHTML(recs.map(r => ({ emp: r.e, rec: r.p })), month, year, company));
    addLog(`Payroll report PDF: ${MONTHS[month - 1]} ${year}`);
  };

  const exportCSV = () => {
    if (recs.length === 0) { Alert.alert('Empty', 'No payroll records for this month.'); return; }
    const header = 'EmpID,Name,Dept,Present,Absent,Leave,OT,Gross,PF,ESI,TDS,LOP,Advance,OtherDed,TotalDed,Net,Status';
    const lines = recs.map(({ e, p }) => {
      const b = p.breakup;
      return [e.empId, `"${e.name}"`, e.department, p.presentDays, p.absentDays, p.leaveDays, p.otHours, b.gross, b.pf, b.esi, b.tds, b.lopAmount, b.advance, b.otherDeduction, b.totalDeduction, b.net, p.paid ? 'Paid' : 'Unpaid'].join(',');
    });
    shareTextFile(`payroll-${year}-${String(month).padStart(2, '0')}.csv`, [header, ...lines].join('\n'));
    addLog(`Payroll CSV: ${MONTHS[month - 1]} ${year}`);
  };

  const openEdit = (id: string, bonus: number, adv: number, ded: number, ot: number) => {
    setEditRec(id);
    setFBonus(String(bonus)); setFAdv(String(adv)); setFDed(String(ded)); setFOT(String(ot));
  };

  const saveEdit = () => {
    if (!editRec) return;
    updatePayrollExtras(editRec, { bonus: num(fBonus), advance: num(fAdv), otherDeduction: num(fDed), otHours: num(fOT) });
    addLog('Updated payroll extras (bonus/advance/deduction/OT)');
    setEditRec(null);
  };

  return (
    <View style={styles.bg}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#0B2B4C" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color="#0B2B4C" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={recs}
        keyExtractor={r => r.p.id}
        contentContainerStyle={{ padding: 12 }}
        ListHeaderComponent={
          <>
            <Card>
              <View style={styles.totGrid}>
                <View style={styles.totBox}><Text style={styles.totLbl}>Gross</Text><Text style={styles.totVal}>{formatINR(totals.gross)}</Text></View>
                <View style={styles.totBox}><Text style={styles.totLbl}>Deductions</Text><Text style={[styles.totVal, { color: '#DC2626' }]}>{formatINR(totals.ded)}</Text></View>
                <View style={[styles.totBox, { backgroundColor: '#0B2B4C' }]}><Text style={[styles.totLbl, { color: '#B9C9DD' }]}>Net Payable</Text><Text style={[styles.totVal, { color: '#fff' }]}>{formatINR(totals.net)}</Text></View>
              </View>
              <Text style={styles.paidLine}>{totals.paid}/{recs.length} paid</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {isAdmin && <View style={{ flex: 1, minWidth: 130 }}><Btn title="Run Payroll" icon="calculator" small onPress={runPayroll} /></View>}
                {isAdmin && recs.length > 0 && <View style={{ flex: 1, minWidth: 130 }}><Btn title="Mark All Paid" icon="checkmark-done" small variant="success" onPress={doMarkAllPaid} /></View>}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={styles.expBtn} onPress={exportReportPDF}>
                  <Ionicons name="document-text" size={15} color="#DC2626" /><Text style={styles.expText}>Report PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.expBtn} onPress={exportCSV}>
                  <Ionicons name="download" size={15} color="#16A34A" /><Text style={styles.expText}>CSV</Text>
                </TouchableOpacity>
              </View>
            </Card>
            <SearchBar value={q} onChange={setQ} placeholder="Search employee..." />
          </>
        }
        ListEmptyComponent={<EmptyState icon="wallet" title="No payroll yet" subtitle={isAdmin ? 'Tap "Run Payroll" to calculate salaries from attendance' : 'Payroll not generated for this month'} />}
        renderItem={({ item: { e, p } }) => (
          <TouchableOpacity onPress={() => navigation.navigate('PayslipDetail', { id: p.id })}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.avatar, { backgroundColor: e.avatarColor }]}>
                  <Text style={styles.avatarText}>{initials(e.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{e.name} <Text style={styles.empid}>• {e.empId}</Text></Text>
                  <Text style={styles.sub}>P:{p.presentDays} A:{p.absentDays} L:{p.leaveDays} OT:{p.otHours}h</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.net}>{formatINR(p.breakup.net)}</Text>
                  <Badge text={p.paid ? 'PAID' : 'UNPAID'} tone={p.paid ? 'green' : 'amber'} />
                </View>
              </View>
              {isAdmin && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <View style={{ flex: 1 }}><Btn title="Bonus/Adv" icon="create" small variant="secondary" onPress={() => openEdit(p.id, p.bonus, p.advance, p.otherDeduction, p.otHours)} /></View>
                  <View style={{ flex: 1 }}><Btn title={p.paid ? 'Unpay' : 'Mark Paid'} icon={p.paid ? 'close' : 'checkmark'} small variant={p.paid ? 'ghost' : 'success'} onPress={() => { setPaid(p.id, !p.paid); addLog(`${p.paid ? 'Unmarked' : 'Marked paid'}: ${e.name}`); }} /></View>
                  <View style={{ flex: 1 }}><Btn title="Payslip" icon="document-text" small onPress={() => { printHTML(payslipHTML(e, p, company)); addLog(`Payslip PDF: ${e.name}`); }} /></View>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!editRec} transparent animationType="slide" onRequestClose={() => setEditRec(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Bonus / Advance / Deduction</Text>
            <Field label="Bonus (₹)" value={fBonus} onChange={setFBonus} keyboardType="numeric" />
            <Field label="Advance / Loan Recovery (₹)" value={fAdv} onChange={setFAdv} keyboardType="numeric" />
            <Field label="Other Deduction (₹)" value={fDed} onChange={setFDed} keyboardType="numeric" />
            <Field label="OT Hours (override)" value={fOT} onChange={setFOT} keyboardType="numeric" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><Btn title="Cancel" variant="ghost" onPress={() => setEditRec(null)} /></View>
              <View style={{ flex: 1 }}><Btn title="Recalculate" onPress={saveEdit} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function PayslipDetailScreen({ navigation, route }: any) {
  const { employees, payroll, company, setPaid, isAdmin, addLog } = useApp();
  const rec = payroll.find(p => p.id === route.params.id);
  const emp = rec ? employees.find(e => e.id === rec.employeeId) : undefined;

  if (!rec || !emp) {
    return <View style={styles.bg}><EmptyState icon="document-text" title="Payslip not found" /></View>;
  }
  const b = rec.breakup;
  const Row = ({ l, v, bold, red }: any) => (
    <View style={styles.srow}>
      <Text style={[styles.sl, bold && { fontWeight: '800', color: '#0B2B4C' }]}>{l}</Text>
      <Text style={[styles.sv, bold && { fontWeight: '800' }, red && { color: '#DC2626' }]}>{v}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.bg} contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
      <Card>
        <Text style={styles.co}>{company.name}</Text>
        <Text style={styles.coSub}>PAYSLIP • {MONTHS[rec.month - 1]} {rec.year}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <View style={[styles.avatar, { backgroundColor: emp.avatarColor }]}><Text style={styles.avatarText}>{initials(emp.name)}</Text></View>
          <View>
            <Text style={styles.name}>{emp.name}</Text>
            <Text style={styles.sub}>{emp.empId} • {emp.designation}, {emp.department}</Text>
          </View>
        </View>
        <View style={styles.attBar}>
          <Text style={styles.attT}>Present {rec.presentDays}</Text>
          <Text style={styles.attT}>Absent {rec.absentDays}</Text>
          <Text style={styles.attT}>Leave {rec.leaveDays}</Text>
          <Text style={styles.attT}>OT {rec.otHours}h</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.secT}>Earnings</Text>
        <Row l="Basic Salary" v={formatINR(b.basic)} />
        <Row l="HRA" v={formatINR(b.hra)} />
        <Row l="Transport" v={formatINR(b.transport)} />
        <Row l="Medical" v={formatINR(b.medical)} />
        <Row l="Other Allowance" v={formatINR(b.otherAllow)} />
        <Row l={`Overtime (${b.otHours}h × ${formatINR(b.otRate)})`} v={formatINR(b.otAmount)} />
        <Row l="Bonus" v={formatINR(b.bonus)} />
        <Row l="Gross Earnings" v={formatINR(b.gross)} bold />
      </Card>

      <Card>
        <Text style={styles.secT}>Deductions</Text>
        <Row l={`LOP (${b.lopDays} days × ${formatINR(b.perDay)})`} v={formatINR(b.lopAmount)} red />
        <Row l="PF (12% of basic)" v={formatINR(b.pf)} red />
        <Row l="ESI" v={formatINR(b.esi)} red />
        <Row l="TDS" v={formatINR(b.tds)} red />
        <Row l="Advance / Loan" v={formatINR(b.advance)} red />
        <Row l="Other Deduction" v={formatINR(b.otherDeduction)} red />
        <Row l="Total Deductions" v={formatINR(b.totalDeduction)} bold red />
      </Card>

      <View style={styles.netBar}>
        <Text style={styles.netLbl}>NET SALARY</Text>
        <Text style={styles.netBig}>{formatINR(b.net)}</Text>
        <Badge text={rec.paid ? `PAID${rec.paidDate ? ' • ' + rec.paidDate : ''}` : 'UNPAID'} tone={rec.paid ? 'green' : 'amber'} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <View style={{ flex: 1 }}><Btn title="Payslip PDF" icon="document-text" onPress={() => { printHTML(payslipHTML(emp, rec, company)); addLog(`Payslip PDF: ${emp.name} ${MONTHS_SHORT[rec.month - 1]} ${rec.year}`); }} /></View>
        {isAdmin && <View style={{ flex: 1 }}><Btn title={rec.paid ? 'Mark Unpaid' : 'Mark Paid'} icon="checkmark" variant={rec.paid ? 'ghost' : 'success'} onPress={() => { setPaid(rec.id, !rec.paid); }} /></View>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  navBtn: { padding: 8, backgroundColor: '#F2F4F8', borderRadius: 8 },
  monthTitle: { fontSize: 17, fontWeight: '800', color: '#0B2B4C' },
  totGrid: { flexDirection: 'row', gap: 8 },
  totBox: { flex: 1, backgroundColor: '#F2F4F8', borderRadius: 10, padding: 10 },
  totLbl: { fontSize: 11, color: '#6B7A90', fontWeight: '700' },
  totVal: { fontSize: 14, fontWeight: '900', color: '#0B2B4C', marginTop: 2 },
  paidLine: { fontSize: 12, color: '#6B7A90', fontWeight: '600', marginTop: 8 },
  expBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#F2F4F8', borderRadius: 8, paddingVertical: 9 },
  expText: { fontSize: 13, fontWeight: '700', color: '#0B2B4C' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '800', color: '#152238' },
  empid: { fontSize: 12, fontWeight: '600', color: '#6B7A90' },
  sub: { fontSize: 12, color: '#6B7A90' },
  net: { fontSize: 16, fontWeight: '900', color: '#0B2B4C', marginBottom: 3 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '85%' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0B2B4C', marginBottom: 12 },
  co: { fontSize: 16, fontWeight: '900', color: '#0B2B4C', textAlign: 'center' },
  coSub: { fontSize: 12, color: '#6B7A90', textAlign: 'center', fontWeight: '700', marginTop: 2 },
  attBar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F2F4F8', borderRadius: 8, padding: 8, marginTop: 10 },
  attT: { fontSize: 12, fontWeight: '700', color: '#0B2B4C' },
  secT: { fontSize: 15, fontWeight: '800', color: '#0B2B4C', marginBottom: 6 },
  srow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  sl: { fontSize: 13, color: '#475569' },
  sv: { fontSize: 13, fontWeight: '600', color: '#152238' },
  netBar: { backgroundColor: '#0B2B4C', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  netLbl: { color: '#B9C9DD', fontWeight: '700', fontSize: 13 },
  netBig: { color: '#fff', fontWeight: '900', fontSize: 28 },
});
