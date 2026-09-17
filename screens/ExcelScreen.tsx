import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../lib/store';
import { Sheet } from '../lib/types';
import { evaluateSheet, colIndexToLetter, gridToCSV, parseCSV, uid, formatDateTime } from '../lib/utils';
import { Card, Btn, Field, SearchBar, EmptyState, COLORS, Chip } from '../components/ui';
import { sheetHTML, printHTML, shareTextFile } from '../lib/pdf';

const CELL_W = 110;
const ROW_H = 40;

export function SheetListScreen({ navigation }: any) {
  const { sheets, saveSheet, deleteSheet, addLog, isAdmin } = useApp();
  const [q, setQ] = useState('');

  const list = sheets.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));

  const createSheet = () => {
    const rows = Array.from({ length: 20 }, () => Array(8).fill(''));
    const s: Sheet = { id: uid('sheet'), name: `New Sheet - ${sheets.length + 1}`, rows, updatedAt: new Date().toISOString() };
    saveSheet(s);
    addLog(`Created sheet: ${s.name}`);
    navigation.navigate('SheetEditor', { id: s.id });
  };

  const confirmDelete = (s: Sheet) => {
    Alert.alert('Delete Sheet', `Delete "${s.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteSheet(s.id); addLog(`Deleted sheet: ${s.name}`); } },
    ]);
  };

  return (
    <View style={styles.bg}>
      <View style={{ padding: 12, paddingBottom: 0 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search sheets..." />
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="information-circle" size={18} color="#2563EB" />
            <Text style={{ flex: 1, fontSize: 12, color: '#475569' }}>Excel-like sheets with formulas: =SUM(A1:A5), =AVERAGE, =MIN, =MAX, =C2*12%, =A1+B1</Text>
          </View>
        </Card>
      </View>
      <FlatList
        data={list}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<EmptyState icon="grid" title="No sheets" subtitle="Create your first calculation sheet" />}
        renderItem={({ item: s }) => (
          <TouchableOpacity onPress={() => navigation.navigate('SheetEditor', { id: s.id })}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.sheetIcon}><Ionicons name="grid" size={22} color="#16A34A" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetName}>{s.name}</Text>
                  <Text style={styles.sheetMeta}>{s.rows.length} rows × {s.rows[0]?.length || 0} cols • {formatDateTime(s.updatedAt)}</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(s)}>
                  <Ionicons name="trash" size={16} color="#DC2626" />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={18} color="#6B7A90" />
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={createSheet}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

export function SheetEditorScreen({ navigation, route }: any) {
  const { sheets, saveSheet, addLog, company, employees } = useApp();
  const sheet = sheets.find(s => s.id === route.params.id);
  const [grid, setGrid] = useState<string[][]>(sheet ? sheet.rows.map(r => [...r]) : []);
  const [name, setName] = useState(sheet?.name || '');
  const [sel, setSel] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [editVal, setEditVal] = useState('');
  const [editing, setEditing] = useState(false);
  const [find, setFind] = useState('');
  const [showFind, setShowFind] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const hScroll = useRef<ScrollView>(null);

  const computed = useMemo(() => {
    try { return evaluateSheet(grid); } catch { return grid; }
  }, [grid]);

  if (!sheet) {
    return <View style={styles.bg}><EmptyState icon="grid" title="Sheet not found" /></View>;
  }

  const persist = (g: string[][], n?: string) => {
    saveSheet({ ...sheet, rows: g.map(r => [...r]), name: n !== undefined ? n : name, updatedAt: new Date().toISOString() });
  };

  const setCell = (r: number, c: number, v: string) => {
    const g = grid.map(row => [...row]);
    g[r][c] = v;
    setGrid(g);
    persist(g);
  };

  const openEditor = (r: number, c: number) => {
    setSel({ r, c });
    setEditVal(grid[r][c] || '');
    setEditing(true);
  };

  const commitEdit = () => {
    setCell(sel.r, sel.c, editVal);
    setEditing(false);
  };

  const addRow = () => {
    const w = grid[0]?.length || 8;
    const g = [...grid.map(r => [...r]), Array(w).fill('')];
    setGrid(g); persist(g);
  };
  const addCol = () => {
    const g = grid.map(r => [...r, '']);
    setGrid(g); persist(g);
  };
  const delRow = () => {
    if (grid.length <= 1) return;
    const g = grid.filter((_, i) => i !== sel.r).map(r => [...r]);
    setGrid(g); persist(g); setSel({ r: 0, c: Math.min(sel.c, g[0].length - 1) });
  };
  const delCol = () => {
    if ((grid[0]?.length || 0) <= 1) return;
    const g = grid.map(r => r.filter((_, i) => i !== sel.c));
    setGrid(g); persist(g); setSel({ r: Math.min(sel.r, g.length - 1), c: 0 });
  };

  const sortBySelCol = (asc: boolean) => {
    const c = sel.c;
    const g = grid.map(r => [...r]);
    const header = g[0];
    const body = g.slice(1);
    body.sort((a, b) => {
      const x = computed[grid.indexOf(a)]?.[c] ?? a[c];
      const y = computed[grid.indexOf(b)]?.[c] ?? b[c];
      const nx = Number(x), ny = Number(y);
      let cmp: number;
      if (!isNaN(nx) && !isNaN(ny) && x !== '' && y !== '') cmp = nx - ny;
      else cmp = String(x).localeCompare(String(y));
      return asc ? cmp : -cmp;
    });
    const out = [header, ...body];
    setGrid(out); persist(out);
    addLog(`Sorted sheet "${name}" by col ${colIndexToLetter(c)}`);
  };

  const doFind = () => {
    if (!find.trim()) return;
    const s = find.toLowerCase();
    for (let r = 0; r < grid.length; r++)
      for (let c = 0; c < (grid[0]?.length || 0); c++)
        if ((computed[r]?.[c] || '').toLowerCase().includes(s) || (grid[r][c] || '').toLowerCase().includes(s)) {
          setSel({ r, c });
          hScroll.current?.scrollTo({ x: Math.max(0, c * CELL_W - 60), animated: true });
          Alert.alert('Found', `Match at ${colIndexToLetter(c)}${r + 1}: "${computed[r][c]}"`);
          return;
        }
    Alert.alert('Not found', `No cell contains "${find}"`);
  };

  const doExportCSV = () => {
    shareTextFile(`${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`, gridToCSV(computed));
    addLog(`Exported sheet CSV: ${name}`);
  };

  const doExportPDF = () => {
    printHTML(sheetHTML(name, computed, company));
    addLog(`Exported sheet PDF: ${name}`);
  };

  const doImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', '*/*'], copyToCacheDirectory: true });
      if (res.canceled) return;
      const file = res.assets[0];
      let text = '';
      if (file.uri.startsWith('data:')) {
        text = decodeURIComponent(file.uri.split(',')[1] || '');
      } else {
        const resp = await fetch(file.uri);
        text = await resp.text();
      }
      const parsed = parseCSV(text);
      if (parsed.length === 0) { Alert.alert('Empty', 'No data found in file'); return; }
      setGrid(parsed); persist(parsed);
      addLog(`Imported CSV into "${name}" (${parsed.length} rows)`);
      Alert.alert('Imported', `${parsed.length} rows imported.`);
    } catch (e: any) {
      Alert.alert('Import failed', e?.message || 'Could not read file');
    }
  };

  const insertFn = (fn: string) => {
    const v = `=${fn}()`;
    setEditVal(editVal + (editVal.startsWith('=') ? fn + '()' : v));
  };

  const fillSampleSalary = () => {
    Alert.alert('Load Salary Data?', 'Fill sheet with current employee salary data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Load', onPress: () => {
          const head = ['Emp ID', 'Name', 'Basic', 'HRA', 'Transport', 'Medical', 'Other', 'Gross'];
          const rows = employees.filter(e => e.status === 'Active').slice(0, 30).map(e => [
            e.empId, e.name, String(e.basicSalary), String(e.allowances.hra),
            String(e.allowances.transport), String(e.allowances.medical), String(e.allowances.other),
            `=C${0}+D${0}+E${0}+F${0}+G${0}`,
          ]);
          const g = [head, ...rows.map((r, i) => {
            const rn = i + 2;
            return [r[0], r[1], r[2], r[3], r[4], r[5], r[6], `=C${rn}+D${rn}+E${rn}+F${rn}+G${rn}`];
          })];
          const n = g.length + 1;
          g.push(['TOTAL', '', `=SUM(C2:C${n - 1})`, `=SUM(D2:D${n - 1})`, `=SUM(E2:E${n - 1})`, `=SUM(F2:F${n - 1})`, `=SUM(G2:G${n - 1})`, `=SUM(H2:H${n - 1})`]);
          while (g.length < 20) g.push(Array(8).fill(''));
          setGrid(g); persist(g);
        },
      },
    ]);
  };

  const cols = grid[0]?.length || 0;
  const selRef = `${colIndexToLetter(sel.c)}${sel.r + 1}`;

  return (
    <View style={styles.bg}>
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolBtn} onPress={() => setShowMenu(true)}>
          <Ionicons name="menu" size={20} color="#0B2B4C" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <TextInput value={name} onChangeText={v => { setName(v); persist(grid, v); }} style={styles.nameInput} placeholder="Sheet name" />
          <Text style={styles.selRef}>{selRef} • {editing ? 'editing' : (grid[sel.r]?.[sel.c] || '(empty)')}</Text>
        </View>
        <TouchableOpacity style={styles.toolBtn} onPress={() => setShowFind(s => !s)}>
          <Ionicons name="search" size={20} color="#0B2B4C" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={() => setShowHelp(true)}>
          <Ionicons name="help-circle" size={20} color="#0B2B4C" />
        </TouchableOpacity>
      </View>

      {showFind && (
        <View style={styles.findBar}>
          <TextInput value={find} onChangeText={setFind} placeholder="Find in sheet..." style={styles.findInput} onSubmitEditing={doFind} returnKeyType="search" />
          <TouchableOpacity style={styles.findBtn} onPress={doFind}><Text style={styles.findBtnText}>Find</Text></TouchableOpacity>
        </View>
      )}

      {editing ? (
        <View style={styles.formulaBar}>
          <Text style={styles.fx}>fx</Text>
          <TextInput value={editVal} onChangeText={setEditVal} style={styles.formulaInput} autoFocus placeholder="Value or =formula" onSubmitEditing={commitEdit} returnKeyType="done" />
          <TouchableOpacity onPress={commitEdit} style={styles.commitBtn}><Ionicons name="checkmark" size={20} color="#fff" /></TouchableOpacity>
          <TouchableOpacity onPress={() => setEditing(false)} style={[styles.commitBtn, { backgroundColor: '#6B7A90' }]}><Ionicons name="close" size={20} color="#fff" /></TouchableOpacity>
        </View>
      ) : null}

      {!editing && (
        <View style={styles.fnStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT'].map(f => (
              <TouchableOpacity key={f} style={styles.fnChip} onPress={() => { setEditVal(`=${f}()`); setEditing(true); }}>
                <Text style={styles.fnText}>={f}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.fnChip} onPress={fillSampleSalary}>
              <Text style={styles.fnText}>+ Salary Data</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        <ScrollView horizontal ref={hScroll}>
          <View>
            <View style={{ flexDirection: 'row' }}>
              <View style={[styles.corner]}><Text style={styles.headText}>#</Text></View>
              {Array.from({ length: cols }, (_, c) => (
                <View key={c} style={[styles.headCell, sel.c === c && styles.headSel]}>
                  <Text style={[styles.headText, sel.c === c && { color: '#fff' }]}>{colIndexToLetter(c)}</Text>
                </View>
              ))}
            </View>
            {grid.map((row, r) => (
              <View key={r} style={{ flexDirection: 'row' }}>
                <View style={[styles.rowHead, sel.r === r && styles.headSel]}>
                  <Text style={[styles.headText, sel.r === r && { color: '#fff' }]}>{r + 1}</Text>
                </View>
                {row.map((_, c) => {
                  const isSel = sel.r === r && sel.c === c;
                  const disp = computed[r]?.[c] ?? '';
                  const isFormula = (grid[r][c] || '').startsWith('=');
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.cell, isSel && styles.cellSel, isFormula && styles.cellFormula]}
                      onPress={() => { setSel({ r, c }); if (isSel) openEditor(r, c); }}
                      onLongPress={() => openEditor(r, c)}
                    >
                      <Text numberOfLines={1} style={[styles.cellText, isFormula && { fontWeight: '700', color: '#0B2B4C' }, disp === '#ERR' && { color: '#DC2626' }]}>
                        {disp}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bBtn} onPress={addRow}><Ionicons name="add" size={16} color="#0B2B4C" /><Text style={styles.bText}>Row</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bBtn} onPress={addCol}><Ionicons name="add" size={16} color="#0B2B4C" /><Text style={styles.bText}>Col</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bBtn} onPress={() => openEditor(sel.r, sel.c)}><Ionicons name="create" size={16} color="#0B2B4C" /><Text style={styles.bText}>Edit</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bBtn} onPress={doExportCSV}><Ionicons name="download" size={16} color="#16A34A" /><Text style={styles.bText}>CSV</Text></TouchableOpacity>
        <TouchableOpacity style={styles.bBtn} onPress={doExportPDF}><Ionicons name="document-text" size={16} color="#DC2626" /><Text style={styles.bText}>PDF</Text></TouchableOpacity>
      </View>

      <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sheet Actions</Text>
            {[
              { t: 'Sort A→Z by selected column', i: 'arrow-up', f: () => sortBySelCol(true) },
              { t: 'Sort Z→A by selected column', i: 'arrow-down', f: () => sortBySelCol(false) },
              { t: 'Import CSV / Excel file', i: 'cloud-upload', f: doImport },
              { t: 'Export CSV', i: 'download', f: doExportCSV },
              { t: 'Export PDF report', i: 'document-text', f: doExportPDF },
              { t: 'Load employee salary data', i: 'people', f: fillSampleSalary },
              { t: 'Delete selected row', i: 'remove', f: delRow },
              { t: 'Delete selected column', i: 'remove-circle', f: delCol },
            ].map((a: any) => (
              <TouchableOpacity key={a.t} style={styles.menuRow} onPress={() => { setShowMenu(false); a.f(); }}>
                <Ionicons name={a.i} size={18} color="#0B2B4C" />
                <Text style={styles.menuText}>{a.t}</Text>
              </TouchableOpacity>
            ))}
            <Btn title="Close" variant="ghost" onPress={() => setShowMenu(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={showHelp} transparent animationType="fade" onRequestClose={() => setShowHelp(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Formula Help</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {[
                ['=A1+B1', 'Add two cells'],
                ['=C2*12%', 'Percent calculation'],
                ['=SUM(A1:A10)', 'Sum of range'],
                ['=AVERAGE(B2:B20)', 'Average of range'],
                ['=MIN(A1:A10)', 'Minimum value'],
                ['=MAX(A1:A10)', 'Maximum value'],
                ['=COUNT(A1:A10)', 'Count numbers'],
                ['=(A1+B1)*C1/100', 'Brackets supported'],
              ].map(([f, d]) => (
                <View key={f} style={styles.helpRow}>
                  <Text style={styles.helpF}>{f}</Text>
                  <Text style={styles.helpD}>{d}</Text>
                </View>
              ))}
              <Text style={styles.helpNote}>Tap a cell to select, tap again (or long-press) to edit. Cell refs like A1, B2 update automatically.</Text>
            </ScrollView>
            <Btn title="Got it" onPress={() => setShowHelp(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  sheetIcon: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  sheetName: { fontSize: 15, fontWeight: '800', color: '#152238' },
  sheetMeta: { fontSize: 12, color: '#6B7A90' },
  iconBtn: { padding: 8, backgroundColor: '#F2F4F8', borderRadius: 8 },
  fab: { position: 'absolute', right: 18, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: '#0B2B4C', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  toolbar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  toolBtn: { padding: 8, backgroundColor: '#F2F4F8', borderRadius: 8 },
  nameInput: { fontSize: 15, fontWeight: '800', color: '#0B2B4C', padding: 0 },
  selRef: { fontSize: 11, color: '#6B7A90' },
  findBar: { flexDirection: 'row', backgroundColor: '#fff', padding: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  findInput: { flex: 1, backgroundColor: '#F2F4F8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  findBtn: { backgroundColor: '#0B2B4C', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  findBtnText: { color: '#fff', fontWeight: '800' },
  formulaBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  fx: { fontStyle: 'italic', fontWeight: '800', color: '#16A34A', fontSize: 16, paddingHorizontal: 4 },
  formulaInput: { flex: 1, backgroundColor: '#F2F4F8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15 },
  commitBtn: { backgroundColor: '#16A34A', borderRadius: 8, padding: 8 },
  fnStrip: { backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  fnChip: { backgroundColor: '#EAF0F8', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 },
  fnText: { fontSize: 12, fontWeight: '800', color: '#0B2B4C' },
  corner: { width: 40, height: ROW_H, backgroundColor: '#0B2B4C', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#1D4E89' },
  headCell: { width: CELL_W, height: ROW_H, backgroundColor: '#EAF0F8', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#CBD5E1' },
  rowHead: { width: 40, height: ROW_H, backgroundColor: '#EAF0F8', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#CBD5E1' },
  headSel: { backgroundColor: '#0B2B4C' },
  headText: { fontSize: 12, fontWeight: '800', color: '#0B2B4C' },
  cell: { width: CELL_W, height: ROW_H, backgroundColor: '#fff', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 0.5, borderColor: '#E2E8F0' },
  cellSel: { backgroundColor: '#DBEAFE', borderColor: '#2563EB', borderWidth: 1.5 },
  cellFormula: { backgroundColor: '#F0FDF4' },
  cellText: { fontSize: 13, color: '#152238' },
  bottomBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingVertical: 8, paddingHorizontal: 4 },
  bBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, backgroundColor: '#F2F4F8', borderRadius: 8, marginHorizontal: 3 },
  bText: { fontSize: 12, fontWeight: '800', color: '#0B2B4C' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '85%' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0B2B4C', marginBottom: 12 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuText: { fontSize: 14, fontWeight: '600', color: '#152238' },
  helpRow: { marginBottom: 10, backgroundColor: '#F2F4F8', borderRadius: 8, padding: 10 },
  helpF: { fontSize: 14, fontWeight: '800', color: '#16A34A', fontFamily: 'monospace' },
  helpD: { fontSize: 12, color: '#475569', marginTop: 2 },
  helpNote: { fontSize: 12, color: '#6B7A90', marginVertical: 8 },
});
