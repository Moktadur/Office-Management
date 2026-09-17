import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../lib/store';
import { DocCategory, OfficeDoc } from '../lib/types';
import { formatDate, formatDateTime, uid, todayISO } from '../lib/utils';
import { Card, Badge, Btn, Field, SearchBar, EmptyState, COLORS, Chip } from '../components/ui';

export const DOC_CATS: Array<{ c: DocCategory; icon: any; color: string; bg: string }> = [
  { c: 'Government Letters', icon: 'shield', color: '#2563EB', bg: '#DBEAFE' },
  { c: 'Employee Documents', icon: 'person', color: '#7C3AED', bg: '#EDE9FE' },
  { c: 'Bills & Receipts', icon: 'receipt', color: '#16A34A', bg: '#DCFCE7' },
  { c: 'Agreements', icon: 'document-text', color: '#D97706', bg: '#FEF3C7' },
  { c: 'Office Orders', icon: 'megaphone', color: '#DC2626', bg: '#FEE2E2' },
  { c: 'Reports', icon: 'bar-chart', color: '#0EA5E9', bg: '#E0F2FE' },
  { c: 'Certificates', icon: 'ribbon', color: '#EC4899', bg: '#FCE7F3' },
  { c: 'Other', icon: 'folder', color: '#6B7A90', bg: '#E8EDF4' },
];

export function catMeta(c: string) {
  return DOC_CATS.find(x => x.c === c) || DOC_CATS[7];
}

export function DocsListScreen({ navigation }: any) {
  const { documents, employees, isAdmin, deleteDocument, addDocument, addLog, user } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [fName, setFName] = useState('');
  const [fCat, setFCat] = useState<DocCategory>('Other');
  const [fDesc, setFDesc] = useState('');
  const [fEmp, setFEmp] = useState('');
  const [fFile, setFFile] = useState('');
  const [fSize, setFSize] = useState('');

  const list = useMemo(() => {
    let l = [...documents];
    if (cat !== 'All') l = l.filter(d => d.category === cat);
    if (q.trim()) {
      const s = q.toLowerCase();
      l = l.filter(d => d.name.toLowerCase().includes(s) || d.description.toLowerCase().includes(s));
    }
    l.sort((a, b) => b.date.localeCompare(a.date));
    return l;
  }, [documents, cat, q]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    documents.forEach(d => { m[d.category] = (m[d.category] || 0) + 1; });
    return m;
  }, [documents]);

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled) return;
      const f = res.assets[0];
      setFFile(f.uri);
      setFSize(f.size ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : '1.0 MB');
      if (!fName) setFName(f.name.replace(/\.[^.]+$/, ''));
      Alert.alert('File Attached', f.name);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not pick file');
    }
  };

  const saveDoc = () => {
    if (!fName.trim()) { Alert.alert('Required', 'Document name is required'); return; }
    const d: OfficeDoc = {
      id: uid('doc'), name: fName.trim(), category: fCat, date: todayISO(),
      description: fDesc.trim(), employeeId: fEmp || undefined,
      fileUri: fFile || undefined, fileSize: fSize || '0.5 MB', uploadedBy: user?.username || 'admin',
    };
    addDocument(d);
    addLog(`Uploaded document: ${d.name} (${d.category})`);
    setShowAdd(false);
    setFName(''); setFCat('Other'); setFDesc(''); setFEmp(''); setFFile(''); setFSize('');
    Alert.alert('Saved', 'Document added to vault.');
  };

  const confirmDelete = (d: OfficeDoc) => {
    Alert.alert('Delete Document', `Delete "${d.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteDocument(d.id); addLog(`Deleted document: ${d.name}`); } },
    ]);
  };

  return (
    <View style={styles.bg}>
      <View style={{ padding: 12, paddingBottom: 0 }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search documents..." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <Chip label={`All (${documents.length})`} active={cat === 'All'} onPress={() => setCat('All')} />
          {DOC_CATS.map(x => (
            <Chip key={x.c} label={`${x.c} (${counts[x.c] || 0})`} active={cat === x.c} onPress={() => setCat(x.c)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={list}
        keyExtractor={d => d.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<EmptyState icon="folder-open" title="No documents" subtitle="Upload office PDFs, bills, letters & more" />}
        renderItem={({ item: d }) => {
          const m = catMeta(d.category);
          const emp = employees.find(e => e.id === d.employeeId);
          return (
            <TouchableOpacity onPress={() => navigation.navigate('DocDetail', { id: d.id })}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.docIcon, { backgroundColor: m.bg }]}>
                    <Ionicons name={m.icon} size={22} color={m.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{d.name}</Text>
                    <Text style={styles.docMeta}>{d.category} • {formatDate(d.date)} • {d.fileSize || ''}</Text>
                    {emp && <Text style={styles.docEmp}>Linked: {emp.name} ({emp.empId})</Text>}
                  </View>
                  {isAdmin && (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(d)}>
                      <Ionicons name="trash" size={15} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#6B7A90" />
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Ionicons name="cloud-upload" size={26} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showAdd} animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalFull}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Add Document</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}><Ionicons name="close" size={24} color="#0B2B4C" /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 14 }}>
            <Field label="Document Name *" value={fName} onChange={setFName} placeholder="e.g. Rent Receipt - Sep 2026" />
            <Text style={styles.label}>Category *</Text>
            <View style={styles.catGrid}>
              {DOC_CATS.map(x => (
                <TouchableOpacity key={x.c} style={[styles.catChip, fCat === x.c && { backgroundColor: '#0B2B4C' }]} onPress={() => setFCat(x.c)}>
                  <Ionicons name={x.icon} size={15} color={fCat === x.c ? '#fff' : x.color} />
                  <Text style={[styles.catText, fCat === x.c && { color: '#fff' }]}>{x.c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { marginTop: 12 }]}>Link Employee (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity style={[styles.empChip, !fEmp && styles.empChipActive]} onPress={() => setFEmp('')}>
                <Text style={[styles.empText, !fEmp && { color: '#fff' }]}>None</Text>
              </TouchableOpacity>
              {employees.filter(e => e.status === 'Active').map(e => (
                <TouchableOpacity key={e.id} style={[styles.empChip, fEmp === e.id && styles.empChipActive]} onPress={() => setFEmp(e.id)}>
                  <Text style={[styles.empText, fEmp === e.id && { color: '#fff' }]}>{e.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Field label="Description" value={fDesc} onChange={setFDesc} multiline placeholder="What is this document about?" />
            <TouchableOpacity style={styles.attachBtn} onPress={pickFile}>
              <Ionicons name="attach" size={20} color="#0B2B4C" />
              <Text style={styles.attachText}>{fFile ? 'File attached ✓ (tap to change)' : 'Attach PDF / File'}</Text>
            </TouchableOpacity>
            {fFile ? <Text style={styles.fileUri} numberOfLines={1}>{fFile}</Text> : null}
            <View style={{ height: 12 }} />
            <Btn title="Save to Vault" icon="checkmark-circle" onPress={saveDoc} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export function DocDetailScreen({ navigation, route }: any) {
  const { documents, employees, deleteDocument, isAdmin, addLog } = useApp();
  const d = documents.find(x => x.id === route.params.id);
  if (!d) return <View style={styles.bg}><EmptyState icon="document" title="Document not found" /></View>;
  const m = catMeta(d.category);
  const emp = employees.find(e => e.id === d.employeeId);

  const openFile = async () => {
    if (!d.fileUri) { Alert.alert('No file', 'This is a record-only entry. No file was attached.'); return; }
    try {
      const ok = await Linking.canOpenURL(d.fileUri);
      if (ok) await Linking.openURL(d.fileUri);
      else Alert.alert('Cannot open', 'File URL cannot be opened on this device.');
    } catch {
      Alert.alert('Cannot open', 'Could not open the attached file.');
    }
  };

  const doDelete = () => {
    Alert.alert('Delete', `Delete "${d.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteDocument(d.id); addLog(`Deleted document: ${d.name}`); navigation.goBack(); } },
    ]);
  };

  return (
    <ScrollView style={styles.bg} contentContainerStyle={{ padding: 14 }}>
      <Card>
        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
          <View style={[styles.bigIcon, { backgroundColor: m.bg }]}>
            <Ionicons name={m.icon} size={44} color={m.color} />
          </View>
          <Text style={styles.bigName}>{d.name}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            <Badge text={d.category} tone="blue" />
            {d.fileSize && <Badge text={d.fileSize} tone="gray" />}
          </View>
        </View>
      </Card>
      <Card>
        <View style={styles.dRow}><Text style={styles.dLbl}>Date</Text><Text style={styles.dVal}>{formatDate(d.date)}</Text></View>
        <View style={styles.dRow}><Text style={styles.dLbl}>Uploaded By</Text><Text style={styles.dVal}>{d.uploadedBy}</Text></View>
        <View style={styles.dRow}><Text style={styles.dLbl}>Linked Employee</Text><Text style={styles.dVal}>{emp ? `${emp.name} (${emp.empId})` : '-'}</Text></View>
        <View style={styles.dRow}><Text style={styles.dLbl}>File</Text><Text style={styles.dVal}>{d.fileUri ? 'Attached ✓' : 'Record only'}</Text></View>
        {d.description ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.dLbl}>Description</Text>
            <Text style={styles.desc}>{d.description}</Text>
          </View>
        ) : null}
      </Card>
      {emp && (
        <Btn title={`View ${emp.name}'s Profile`} icon="person" variant="secondary" onPress={() => navigation.navigate('Employees', { screen: 'EmployeeDetail', params: { id: emp.id } })} />
      )}
      <View style={{ height: 8 }} />
      <Btn title={d.fileUri ? 'Open / Preview File' : 'No File Attached'} icon="open" onPress={openFile} disabled={!d.fileUri} />
      {isAdmin && (
        <>
          <View style={{ height: 8 }} />
          <Btn title="Delete Document" icon="trash" variant="danger" onPress={doDelete} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  docIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 14, fontWeight: '800', color: '#152238' },
  docMeta: { fontSize: 12, color: '#6B7A90', marginTop: 2 },
  docEmp: { fontSize: 12, color: '#7C3AED', fontWeight: '600', marginTop: 2 },
  iconBtn: { padding: 8, backgroundColor: '#F2F4F8', borderRadius: 8 },
  fab: { position: 'absolute', right: 18, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: '#0B2B4C', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modalFull: { flex: 1, backgroundColor: COLORS.bg },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0B2B4C' },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7A90', marginBottom: 8, textTransform: 'uppercase' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8EDF4', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  catText: { fontSize: 12, fontWeight: '700', color: '#0B2B4C' },
  empChip: { backgroundColor: '#E8EDF4', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  empChipActive: { backgroundColor: '#7C3AED' },
  empText: { fontSize: 12, fontWeight: '700', color: '#0B2B4C' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EAF0F8', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#0B2B4C', borderStyle: 'dashed' },
  attachText: { fontSize: 14, fontWeight: '700', color: '#0B2B4C' },
  fileUri: { fontSize: 11, color: '#6B7A90', marginTop: 6 },
  bigIcon: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  bigName: { fontSize: 18, fontWeight: '900', color: '#0B2B4C', textAlign: 'center' },
  dRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  dLbl: { fontSize: 13, color: '#6B7A90', fontWeight: '600' },
  dVal: { fontSize: 13, fontWeight: '700', color: '#152238' },
  desc: { fontSize: 14, color: '#152238', marginTop: 4, lineHeight: 20 },
});
