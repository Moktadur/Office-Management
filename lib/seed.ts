import { Employee, AttendanceRecord, OfficeDoc, Sheet, PayrollRecord, CompanyInfo, AttendanceStatus } from './types';
import { calcSalary, toISODate, uid, daysInMonth } from './utils';

const AVATAR_COLORS = ['#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#84CC16', '#06B6D4', '#D946EF'];

export const DEPARTMENTS = ['Production', 'Accounts', 'HR', 'IT', 'Sales', 'Maintenance', 'Admin'];

type SeedRow = [string, string, string, string, number, number, number, number, number, string, string, string, string];

export function seedEmployees(): Employee[] {
  const list: SeedRow[] = [
    ['Rahman Khan', 'Production', 'Operator', '2021-04-12', 20000, 6000, 2000, 1500, 1000, '9822011445', 'rahman@office.com', 'BQXPK4412M', 'Active'],
    ['Anwar Sheikh', 'Accounts', 'Accountant', '2019-07-01', 28000, 8400, 2500, 2000, 1500, '9822011456', 'anwar@office.com', 'CPLPS8821K', 'Active'],
    ['Priya Sharma', 'HR', 'HR Manager', '2020-02-15', 42000, 12600, 3000, 2500, 2000, '9822011467', 'priya@office.com', 'GHUPS2210P', 'Active'],
    ['Amit Verma', 'IT', 'Software Engineer', '2022-06-20', 55000, 16500, 3000, 2500, 3000, '9822011478', 'amit@office.com', 'AQWPV9934L', 'Active'],
    ['Sneha Patil', 'Sales', 'Sales Executive', '2021-11-08', 24000, 7200, 3000, 1500, 2500, '9822011489', 'sneha@office.com', 'DKZPP5512A', 'Active'],
    ['Vikas Yadav', 'Production', 'Supervisor', '2018-03-25', 32000, 9600, 2500, 2000, 1500, '9822011490', 'vikas@office.com', 'ABCPY7723N', 'Active'],
    ['Kavita Rao', 'Accounts', 'Clerk', '2023-01-10', 18000, 5400, 2000, 1250, 800, '9822011501', 'kavita@office.com', 'EKRPR1109Q', 'Active'],
    ['Suresh Kumar', 'Maintenance', 'Technician', '2020-09-05', 22000, 6600, 2000, 1500, 1000, '9822011512', 'suresh@office.com', 'FMKPK6645T', 'Active'],
    ['Neha Gupta', 'IT', 'Junior Developer', '2023-08-14', 35000, 10500, 2500, 2000, 1500, '9822011523', 'neha@office.com', 'BLMPG3345H', 'Active'],
    ['Rajesh Singh', 'Sales', 'Sales Manager', '2019-12-02', 48000, 14400, 3500, 2500, 3000, '9822011534', 'rajesh@office.com', 'CHNPS9870D', 'Active'],
    ['Farah Ali', 'Admin', 'Office Assistant', '2022-04-18', 16000, 4800, 1500, 1250, 500, '9822011545', 'farah@office.com', 'NQPFA2201F', 'Active'],
    ['Mohan Das', 'Production', 'Helper', '2024-02-01', 14000, 4200, 1500, 1000, 500, '9822011556', 'mohan@office.com', 'HZQPD8814B', 'Inactive'],
  ];
  return list.map((e, i) => ({
    id: `emp-${i + 1}`,
    empId: `EMP${String(i + 1).padStart(3, '0')}`,
    name: e[0],
    department: e[1],
    designation: e[2],
    joiningDate: e[3],
    basicSalary: e[4],
    allowances: { hra: e[5], transport: e[6], medical: e[7], other: e[8] },
    mobile: e[9],
    email: e[10],
    address: `${101 + i}, MG Road, Pune, Maharashtra 411001`,
    pan: e[11],
    aadhar: `${2000 + i} ${4100 + i * 7} ${3300 + i * 13}`,
    bank: { bankName: 'State Bank of India', account: `62044${100000 + i * 137}`, ifsc: 'SBIN0012345' },
    status: e[12] as 'Active' | 'Inactive',
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));
}

export function seedAttendance(employees: Employee[], month: number, year: number, uptoDay?: number): AttendanceRecord[] {
  const out: AttendanceRecord[] = [];
  const dim = daysInMonth(month, year);
  const last = uptoDay ? Math.min(uptoDay, dim) : dim;
  for (const emp of employees) {
    if (emp.status !== 'Active') continue;
    for (let d = 1; d <= last; d++) {
      const dt = new Date(year, month - 1, d);
      const isSunday = dt.getDay() === 0;
      let status: AttendanceStatus = 'P';
      const r = Math.random();
      if (isSunday) status = 'H';
      else if (r > 0.965) status = 'A';
      else if (r > 0.93) status = 'L';
      const otHours = !isSunday && status === 'P' && Math.random() > 0.88 ? Math.floor(Math.random() * 3) + 1 : 0;
      out.push({ id: uid('att'), employeeId: emp.id, date: toISODate(year, month, d), status, otHours });
    }
  }
  return out;
}

export function seedDocs(employees: Employee[]): OfficeDoc[] {
  const now = new Date();
  const iso = (mBack: number, day: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - mBack, Math.min(day, 28));
    return toISODate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  };
  const docs: Array<[string, OfficeDoc['category'], number, number, string, number?]> = [
    ['PF Registration Certificate', 'Government Letters', 4, 12, 'Company PF registration copy issued by EPFO office.', undefined],
    ['Factory License Renewal 2026', 'Government Letters', 1, 5, 'Renewed factory license valid up to March 2027.', undefined],
    ['Rahman Khan - Aadhar & PAN', 'Employee Documents', 5, 20, 'ID proofs submitted at joining.', 0],
    ['Anwar Sheikh - Appointment Letter', 'Employee Documents', 6, 2, 'Signed appointment letter with salary annexure.', 1],
    ['Priya Sharma - Experience Letter', 'Employee Documents', 3, 14, 'Previous employer experience certificate.', 2],
    ['Electricity Bill - Aug 2026', 'Bills & Receipts', 1, 18, 'MSEB office electricity bill paid online.', undefined],
    ['Office Rent Receipt - Sep 2026', 'Bills & Receipts', 0, 5, 'Monthly office rent receipt from landlord.', undefined],
    ['Vendor Agreement - Stationery', 'Agreements', 2, 9, 'Annual rate contract with Sharma Stationery.', undefined],
    ['Office Order - Diwali Holidays', 'Office Orders', 0, 10, 'Holiday list circular for festival season.', undefined],
    ['Salary Register - Aug 2026', 'Reports', 1, 3, 'Month-wise salary register signed by accounts.', undefined],
    ['ISO 9001 Certificate', 'Certificates', 7, 22, 'Quality management certification copy.', undefined],
    ['Amit Verma - Offer Letter', 'Employee Documents', 2, 27, 'Offer letter with CTC breakup.', 3],
  ];
  return docs.map((d, i) => ({
    id: `doc-${i + 1}`,
    name: d[0],
    category: d[1],
    date: iso(d[2], d[3]),
    description: d[4],
    employeeId: d[5] !== undefined ? employees[d[5]].id : undefined,
    fileSize: `${(Math.random() * 2 + 0.2).toFixed(1)} MB`,
    uploadedBy: 'admin',
  }));
}

export function seedSheets(): Sheet[] {
  const now = new Date().toISOString();
  const salarySheet: string[][] = [
    ['Emp ID', 'Name', 'Basic', 'HRA', 'Other Allow', 'Gross', 'PF', 'Net'],
    ['EMP001', 'Rahman Khan', '20000', '6000', '4500', '=C2+D2+E2', '=C2*12%', '=F2-G2'],
    ['EMP002', 'Anwar Sheikh', '28000', '8400', '6000', '=C3+D3+E3', '=C3*12%', '=F3-G3'],
    ['EMP003', 'Priya Sharma', '42000', '12600', '7500', '=C4+D4+E4', '=C4*12%', '=F4-G4'],
    ['EMP004', 'Amit Verma', '55000', '16500', '8500', '=C5+D5+E5', '=C5*12%', '=F5-G5'],
    ['EMP005', 'Sneha Patil', '24000', '7200', '7000', '=C6+D6+E6', '=C6*12%', '=F6-G6'],
    ['TOTAL', '', '=SUM(C2:C6)', '=SUM(D2:D6)', '=SUM(E2:E6)', '=SUM(F2:F6)', '=SUM(G2:G6)', '=SUM(H2:H6)'],
    ['AVERAGE', '', '=AVERAGE(C2:C6)', '', '', '', '', ''],
  ];
  const expenseSheet: string[][] = [
    ['Date', 'Head', 'Vendor', 'Amount', 'GST %', 'GST Amt', 'Total'],
    ['2026-09-02', 'Stationery', 'Sharma Traders', '4500', '18', '=D2*E2%', '=D2+F2'],
    ['2026-09-05', 'Electricity', 'MSEB', '8200', '0', '=D3*E3%', '=D3+F3'],
    ['2026-09-09', 'Rent', 'Landlord', '35000', '0', '=D4*E4%', '=D4+F4'],
    ['2026-09-12', 'Maintenance', 'FixIt Co', '6700', '18', '=D5*E5%', '=D5+F5'],
    ['2026-09-15', 'Internet', 'Airtel', '1499', '18', '=D6*E6%', '=D6+F6'],
    ['', '', 'TOTAL', '=SUM(D2:D6)', '', '=SUM(F2:F6)', '=SUM(G2:G6)'],
  ];
  while (salarySheet.length < 15) salarySheet.push(Array(8).fill(''));
  while (expenseSheet.length < 15) expenseSheet.push(Array(7).fill(''));
  return [
    { id: 'sheet-1', name: 'Salary Calculation - Sep 2026', rows: salarySheet, updatedAt: now },
    { id: 'sheet-2', name: 'Office Expense Tracker', rows: expenseSheet, updatedAt: now },
  ];
}

export function seedPayroll(employees: Employee[], attendance: AttendanceRecord[], month: number, year: number, paid: boolean): PayrollRecord[] {
  const out: PayrollRecord[] = [];
  for (const emp of employees) {
    if (emp.status !== 'Active') continue;
    const recs = attendance.filter(a => a.employeeId === emp.id && a.date.startsWith(`${year}-${String(month).padStart(2, '0')}`));
    const presentDays = recs.filter(a => a.status === 'P').length;
    const absentDays = recs.filter(a => a.status === 'A').length;
    const leaveDays = recs.filter(a => a.status === 'L').length;
    const otHours = recs.reduce((s, a) => s + (a.otHours || 0), 0);
    const bonus = Math.random() > 0.8 ? 2000 : 0;
    const advance = Math.random() > 0.85 ? 5000 : 0;
    const breakup = calcSalary({
      basic: emp.basicSalary,
      hra: emp.allowances.hra,
      transport: emp.allowances.transport,
      medical: emp.allowances.medical,
      otherAllow: emp.allowances.other,
      otHours, bonus, lopDays: absentDays, advance, otherDeduction: 0,
    });
    out.push({
      id: uid('pay'), employeeId: emp.id, month, year,
      presentDays, absentDays, leaveDays, otHours, bonus, advance, otherDeduction: 0,
      breakup, paid, paidDate: paid ? toISODate(year, month, 5) : undefined,
    });
  }
  return out;
}

export function seedCompany(): CompanyInfo {
  return {
    name: 'Sharma Enterprises Pvt. Ltd.',
    address: 'Plot 45, MIDC Industrial Area, Pune, Maharashtra 411026',
    phone: '+91 98220 11000',
    email: 'office@sharmaenterprises.in',
  };
}
