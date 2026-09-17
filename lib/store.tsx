import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppUser, Employee, PayrollRecord, AttendanceRecord, OfficeDoc, Sheet, ActivityLog, CompanyInfo, AttendanceStatus } from './types';
import { seedEmployees, seedAttendance, seedDocs, seedSheets, seedPayroll, seedCompany } from './seed';
import { calcSalary, uid, todayISO } from './utils';

const STATE_KEY = 'OMA_STATE_V3';
const SESSION_KEY = 'OMA_SESSION_V1';

const USERS: Array<AppUser & { password: string }> = [
  { username: 'admin', password: 'admin123', role: 'admin', name: 'Administrator' },
  { username: 'staff', password: 'staff123', role: 'user', name: 'Office Staff' },
];

interface AppState {
  user: AppUser | null;
  ready: boolean;
  employees: Employee[];
  attendance: AttendanceRecord[];
  payroll: PayrollRecord[];
  documents: OfficeDoc[];
  sheets: Sheet[];
  logs: ActivityLog[];
  company: CompanyInfo;
  login: (u: string, p: string) => { ok: boolean; msg?: string };
  logout: () => void;
  isAdmin: boolean;
  saveEmployee: (e: Employee) => void;
  deleteEmployee: (id: string) => void;
  markAttendance: (employeeId: string, date: string, status: AttendanceStatus, otHours?: number) => void;
  generatePayroll: (month: number, year: number) => number;
  updatePayrollExtras: (id: string, patch: { bonus?: number; advance?: number; otherDeduction?: number; otHours?: number }) => void;
  setPaid: (id: string, paid: boolean) => void;
  markAllPaid: (month: number, year: number) => void;
  addDocument: (d: OfficeDoc) => void;
  deleteDocument: (id: string) => void;
  saveSheet: (s: Sheet) => void;
  deleteSheet: (id: string) => void;
  updateCompany: (c: CompanyInfo) => void;
  addLog: (action: string) => void;
  exportBackup: () => string;
  importBackup: (json: string) => { ok: boolean; msg?: string };
  resetDemo: () => void;
  summarize: (employeeId: string, month: number, year: number) => { present: number; absent: number; leave: number; ot: number };
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}

function buildInitial() {
  const employees = seedEmployees();
  const now = new Date();
  const cm = now.getMonth() + 1;
  const cy = now.getFullYear();
  const pm = cm === 1 ? 12 : cm - 1;
  const py = cm === 1 ? cy - 1 : cy;
  const attendance = [
    ...seedAttendance(employees, pm, py),
    ...seedAttendance(employees, cm, cy, now.getDate()),
  ];
  const payroll = [
    ...seedPayroll(employees, attendance, pm, py, true),
    ...seedPayroll(employees, attendance, cm, cy, false),
  ];
  return {
    employees,
    attendance,
    payroll,
    documents: seedDocs(employees),
    sheets: seedSheets(),
    company: seedCompany(),
    logs: [{ id: uid('log'), action: 'Demo database initialized', user: 'system', date: new Date().toISOString() }] as ActivityLog[],
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [documents, setDocuments] = useState<OfficeDoc[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [company, setCompany] = useState<CompanyInfo>({ name: '', address: '', phone: '', email: '' });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, sess] = await Promise.all([
          AsyncStorage.getItem(STATE_KEY),
          AsyncStorage.getItem(SESSION_KEY),
        ]);
        if (s) {
          const p = JSON.parse(s);
          setEmployees(p.employees || []);
          setAttendance(p.attendance || []);
          setPayroll(p.payroll || []);
          setDocuments(p.documents || []);
          setSheets(p.sheets || []);
          setLogs(p.logs || []);
          setCompany(p.company || seedCompany());
        } else {
          const init = buildInitial();
          setEmployees(init.employees);
          setAttendance(init.attendance);
          setPayroll(init.payroll);
          setDocuments(init.documents);
          setSheets(init.sheets);
          setCompany(init.company);
          setLogs(init.logs);
        }
        if (sess) {
          try { setUser(JSON.parse(sess)); } catch { /* ignore */ }
        }
      } catch {
        const init = buildInitial();
        setEmployees(init.employees);
        setAttendance(init.attendance);
        setPayroll(init.payroll);
        setDocuments(init.documents);
        setSheets(init.sheets);
        setCompany(init.company);
        setLogs(init.logs);
      }
      setLoaded(true);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STATE_KEY, JSON.stringify({ employees, attendance, payroll, documents, sheets, logs: logs.slice(0, 200), company })).catch(() => {});
  }, [employees, attendance, payroll, documents, sheets, logs, company, loaded]);

  const addLog = useCallback((action: string) => {
    setLogs(prev => [{ id: uid('log'), action, user: user?.username || 'app', date: new Date().toISOString() }, ...prev].slice(0, 200));
  }, [user]);

  const login = useCallback((u: string, p: string) => {
    const f = USERS.find(x => x.username === u.trim().toLowerCase() && x.password === p);
    if (!f) return { ok: false, msg: 'Invalid username or password' };
    const sess: AppUser = { username: f.username, name: f.name, role: f.role };
    setUser(sess);
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sess)).catch(() => {});
    setLogs(prev => [{ id: uid('log'), action: `${sess.name} logged in`, user: sess.username, date: new Date().toISOString() }, ...prev].slice(0, 200));
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }, []);

  const summarize = useCallback((employeeId: string, month: number, year: number) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const recs = attendance.filter(a => a.employeeId === employeeId && a.date.startsWith(key));
    return {
      present: recs.filter(a => a.status === 'P').length,
      absent: recs.filter(a => a.status === 'A').length,
      leave: recs.filter(a => a.status === 'L').length,
      ot: recs.reduce((s, a) => s + (a.otHours || 0), 0),
    };
  }, [attendance]);

  const saveEmployee = useCallback((e: Employee) => {
    setEmployees(prev => {
      const i = prev.findIndex(x => x.id === e.id);
      if (i >= 0) { const c = [...prev]; c[i] = e; return c; }
      return [...prev, e];
    });
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    setEmployees(prev => prev.filter(x => x.id !== id));
  }, []);

  const markAttendance = useCallback((employeeId: string, date: string, status: AttendanceStatus, otHours = 0) => {
    setAttendance(prev => {
      const i = prev.findIndex(a => a.employeeId === employeeId && a.date === date);
      const ot = (status === 'P' || status === 'H') ? otHours : 0;
      if (i >= 0) {
        const c = [...prev];
        c[i] = { ...c[i], status, otHours: ot };
        return c;
      }
      return [...prev, { id: uid('att'), employeeId, date, status, otHours: ot }];
    });
  }, []);

  const generatePayroll = useCallback((month: number, year: number) => {
    const empList = employees;
    const attList = attendance;
    let count = 0;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const updates: PayrollRecord[] = [];
    for (const emp of empList) {
      if (emp.status !== 'Active') continue;
      const recs = attList.filter(a => a.employeeId === emp.id && a.date.startsWith(key));
      const presentDays = recs.filter(a => a.status === 'P').length;
      const absentDays = recs.filter(a => a.status === 'A').length;
      const leaveDays = recs.filter(a => a.status === 'L').length;
      const otH = recs.reduce((s, a) => s + (a.otHours || 0), 0);
      updates.push({
        id: '', employeeId: emp.id, month, year, presentDays, absentDays, leaveDays,
        otHours: otH, bonus: 0, advance: 0, otherDeduction: 0,
        breakup: calcSalary({
          basic: emp.basicSalary, hra: emp.allowances.hra, transport: emp.allowances.transport,
          medical: emp.allowances.medical, otherAllow: emp.allowances.other,
          otHours: otH, bonus: 0, lopDays: absentDays, advance: 0, otherDeduction: 0,
        }), paid: false,
      });
      count++;
    }
    setPayroll(prev => {
      const next = [...prev];
      for (const u of updates) {
        const exIdx = next.findIndex(p => p.employeeId === u.employeeId && p.month === month && p.year === year);
        if (exIdx >= 0) {
          const keep = next[exIdx];
          const emp = empList.find(e => e.id === u.employeeId);
          const otHours = keep.otHours || u.otHours;
          next[exIdx] = {
            ...keep, presentDays: u.presentDays, absentDays: u.absentDays, leaveDays: u.leaveDays, otHours,
            breakup: emp ? calcSalary({
              basic: emp.basicSalary, hra: emp.allowances.hra, transport: emp.allowances.transport,
              medical: emp.allowances.medical, otherAllow: emp.allowances.other,
              otHours, bonus: keep.bonus, lopDays: u.absentDays, advance: keep.advance, otherDeduction: keep.otherDeduction,
            }) : keep.breakup,
          };
        } else {
          next.push({ ...u, id: uid('pay') });
        }
      }
      return next;
    });
    return count;
  }, [employees, attendance]);

  const updatePayrollExtras = useCallback((id: string, patch: { bonus?: number; advance?: number; otherDeduction?: number; otHours?: number }) => {
    setPayroll(prev => prev.map(p => {
      if (p.id !== id) return p;
      const emp = employees.find(e => e.id === p.employeeId);
      if (!emp) return p;
      const bonus = patch.bonus !== undefined ? patch.bonus : p.bonus;
      const advance = patch.advance !== undefined ? patch.advance : p.advance;
      const otherDeduction = patch.otherDeduction !== undefined ? patch.otherDeduction : p.otherDeduction;
      const otHours = patch.otHours !== undefined ? patch.otHours : p.otHours;
      const breakup = calcSalary({
        basic: emp.basicSalary, hra: emp.allowances.hra, transport: emp.allowances.transport,
        medical: emp.allowances.medical, otherAllow: emp.allowances.other,
        otHours, bonus, lopDays: p.absentDays, advance, otherDeduction,
      });
      return { ...p, bonus, advance, otherDeduction, otHours, breakup };
    }));
  }, [employees]);

  const setPaid = useCallback((id: string, paid: boolean) => {
    setPayroll(prev => prev.map(p => p.id === id ? { ...p, paid, paidDate: paid ? todayISO() : undefined } : p));
  }, []);

  const markAllPaid = useCallback((month: number, year: number) => {
    setPayroll(prev => prev.map(p => (p.month === month && p.year === year ? { ...p, paid: true, paidDate: todayISO() } : p)));
  }, []);

  const addDocument = useCallback((d: OfficeDoc) => {
    setDocuments(prev => [d, ...prev]);
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  const saveSheet = useCallback((s: Sheet) => {
    setSheets(prev => {
      const i = prev.findIndex(x => x.id === s.id);
      if (i >= 0) { const c = [...prev]; c[i] = s; return c; }
      return [s, ...prev];
    });
  }, []);

  const deleteSheet = useCallback((id: string) => {
    setSheets(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateCompany = useCallback((c: CompanyInfo) => setCompany(c), []);

  const exportBackup = useCallback(() => {
    return JSON.stringify({ employees, attendance, payroll, documents, sheets, logs, company, exportedAt: new Date().toISOString() }, null, 2);
  }, [employees, attendance, payroll, documents, sheets, logs, company]);

  const importBackup = useCallback((json: string) => {
    try {
      const p = JSON.parse(json);
      if (!Array.isArray(p.employees)) return { ok: false, msg: 'Invalid backup file' };
      setEmployees(p.employees || []);
      setAttendance(p.attendance || []);
      setPayroll(p.payroll || []);
      setDocuments(p.documents || []);
      setSheets(p.sheets || []);
      setLogs(p.logs || []);
      if (p.company) setCompany(p.company);
      return { ok: true };
    } catch {
      return { ok: false, msg: 'Could not read backup file' };
    }
  }, []);

  const resetDemo = useCallback(() => {
    const init = buildInitial();
    setEmployees(init.employees);
    setAttendance(init.attendance);
    setPayroll(init.payroll);
    setDocuments(init.documents);
    setSheets(init.sheets);
    setCompany(init.company);
    setLogs(init.logs);
  }, []);

  const value = useMemo<AppState>(() => ({
    user, ready, employees, attendance, payroll, documents, sheets, logs, company,
    login, logout, isAdmin: user?.role === 'admin',
    saveEmployee, deleteEmployee, markAttendance, generatePayroll, updatePayrollExtras,
    setPaid, markAllPaid, addDocument, deleteDocument, saveSheet, deleteSheet,
    updateCompany, addLog, exportBackup, importBackup, resetDemo, summarize,
  }), [user, ready, employees, attendance, payroll, documents, sheets, logs, company, login, logout, saveEmployee, deleteEmployee, markAttendance, generatePayroll, updatePayrollExtras, setPaid, markAllPaid, addDocument, deleteDocument, saveSheet, deleteSheet, updateCompany, addLog, exportBackup, importBackup, resetDemo, summarize]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
