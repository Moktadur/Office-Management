export type Role = 'admin' | 'user';

export interface AppUser {
  username: string;
  name: string;
  role: Role;
}

export interface Allowances {
  hra: number;
  transport: number;
  medical: number;
  other: number;
}

export interface BankDetails {
  bankName: string;
  account: string;
  ifsc: string;
}

export interface Employee {
  id: string;
  empId: string;
  name: string;
  department: string;
  designation: string;
  joiningDate: string;
  basicSalary: number;
  allowances: Allowances;
  mobile: string;
  email: string;
  address: string;
  pan: string;
  aadhar: string;
  bank: BankDetails;
  status: 'Active' | 'Inactive';
  avatarColor: string;
}

export interface SalaryBreakup {
  basic: number;
  hra: number;
  transport: number;
  medical: number;
  otherAllow: number;
  totalAllow: number;
  otHours: number;
  otRate: number;
  otAmount: number;
  bonus: number;
  perDay: number;
  lopDays: number;
  lopAmount: number;
  gross: number;
  pf: number;
  esi: number;
  tds: number;
  advance: number;
  otherDeduction: number;
  totalDeduction: number;
  net: number;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  otHours: number;
  bonus: number;
  advance: number;
  otherDeduction: number;
  breakup: SalaryBreakup;
  paid: boolean;
  paidDate?: string;
}

export type AttendanceStatus = 'P' | 'A' | 'L' | 'H';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  otHours: number;
}

export type DocCategory =
  | 'Government Letters'
  | 'Employee Documents'
  | 'Bills & Receipts'
  | 'Agreements'
  | 'Office Orders'
  | 'Reports'
  | 'Certificates'
  | 'Other';

export interface OfficeDoc {
  id: string;
  name: string;
  category: DocCategory;
  date: string;
  description: string;
  employeeId?: string;
  department?: string;
  fileUri?: string;
  fileSize?: string;
  uploadedBy: string;
}

export interface Sheet {
  id: string;
  name: string;
  rows: string[][];
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  user: string;
  date: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}
