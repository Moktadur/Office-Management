import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Employee, PayrollRecord, CompanyInfo } from './types';
import { formatINR, formatDate, MONTHS, numToWordsIndian } from './utils';

const css = `
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; padding: 24px; }
  .head { text-align: center; border-bottom: 3px solid #0B2B4C; padding-bottom: 12px; margin-bottom: 16px; }
  .head h1 { margin: 0; font-size: 22px; color: #0B2B4C; }
  .head p { margin: 2px 0; font-size: 12px; color: #444; }
  .title { text-align: center; font-size: 16px; font-weight: bold; margin: 12px 0; color: #0B2B4C; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 8px 0; }
  th { background: #0B2B4C; color: #fff; padding: 8px 6px; text-align: left; }
  td { border: 1px solid #ccc; padding: 7px 6px; }
  tr:nth-child(even) td { background: #f6f8fb; }
  .row2 { display: flex; justify-content: space-between; gap: 16px; }
  .box { flex: 1; border: 1px solid #ccc; border-radius: 6px; padding: 10px 12px; font-size: 12px; margin-bottom: 10px; }
  .net { background: #0B2B4C; color: #fff; font-weight: bold; font-size: 14px; padding: 10px; border-radius: 6px; text-align: center; margin-top: 10px; }
  .sign { display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px; }
  .foot { text-align: center; font-size: 10px; color: #888; margin-top: 24px; }
`;

export function payslipHTML(emp: Employee, rec: PayrollRecord, company: CompanyInfo): string {
  const b = rec.breakup;
  return `<html><head><style>${css}</style></head><body>
    <div class="head"><h1>${company.name}</h1><p>${company.address}</p><p>Phone: ${company.phone} | Email: ${company.email}</p></div>
    <div class="title">PAYSLIP - ${MONTHS[rec.month - 1]} ${rec.year}</div>
    <div class="row2">
      <div class="box"><b>${emp.name}</b> (${emp.empId})<br/>${emp.designation}, ${emp.department}<br/>Joining: ${formatDate(emp.joiningDate)}<br/>PAN: ${emp.pan || '-'} | A/c: ${emp.bank.account || '-'}</div>
      <div class="box">Present: <b>${rec.presentDays}</b> days<br/>Absent (LOP): <b>${rec.absentDays}</b> days<br/>Leave: <b>${rec.leaveDays}</b> days<br/>OT Hours: <b>${rec.otHours}</b></div>
    </div>
    <table><tr><th>Earnings</th><th style="text-align:right">Amount</th><th>Deductions</th><th style="text-align:right">Amount</th></tr>
    <tr><td>Basic Salary</td><td style="text-align:right">${formatINR(b.basic)}</td><td>LOP (${b.lopDays} days)</td><td style="text-align:right">${formatINR(b.lopAmount)}</td></tr>
    <tr><td>HRA</td><td style="text-align:right">${formatINR(b.hra)}</td><td>Provident Fund (PF)</td><td style="text-align:right">${formatINR(b.pf)}</td></tr>
    <tr><td>Transport Allowance</td><td style="text-align:right">${formatINR(b.transport)}</td><td>ESI</td><td style="text-align:right">${formatINR(b.esi)}</td></tr>
    <tr><td>Medical Allowance</td><td style="text-align:right">${formatINR(b.medical)}</td><td>TDS</td><td style="text-align:right">${formatINR(b.tds)}</td></tr>
    <tr><td>Other Allowance</td><td style="text-align:right">${formatINR(b.otherAllow)}</td><td>Advance / Loan</td><td style="text-align:right">${formatINR(b.advance)}</td></tr>
    <tr><td>Overtime (${b.otHours}h x ${formatINR(b.otRate)})</td><td style="text-align:right">${formatINR(b.otAmount)}</td><td>Other Deduction</td><td style="text-align:right">${formatINR(b.otherDeduction)}</td></tr>
    <tr><td>Bonus</td><td style="text-align:right">${formatINR(b.bonus)}</td><td></td><td></td></tr>
    <tr><td><b>Gross Earnings</b></td><td style="text-align:right"><b>${formatINR(b.gross)}</b></td><td><b>Total Deductions</b></td><td style="text-align:right"><b>${formatINR(b.totalDeduction)}</b></td></tr>
    </table>
    <div class="net">NET SALARY: ${formatINR(b.net)}</div>
    <p style="font-size:12px">In words: <b>Rupees ${numToWordsIndian(b.net)} Only</b></p>
    <div class="sign"><span>Employee Signature</span><span>Accounts Dept.</span><span>Authorised Signatory</span></div>
    <div class="foot">Computer generated payslip | ${formatDate(new Date().toISOString())} | Status: ${rec.paid ? 'PAID' : 'UNPAID'}</div>
  </body></html>`;
}

export function payrollReportHTML(recs: Array<{ emp: Employee; rec: PayrollRecord }>, month: number, year: number, company: CompanyInfo): string {
  const rows = recs.map(({ emp, rec }, i) => `<tr><td>${i + 1}</td><td>${emp.empId}</td><td>${emp.name}</td><td>${emp.department}</td><td style="text-align:right">${formatINR(rec.breakup.gross)}</td><td style="text-align:right">${formatINR(rec.breakup.totalDeduction)}</td><td style="text-align:right"><b>${formatINR(rec.breakup.net)}</b></td><td>${rec.paid ? 'Paid' : 'Unpaid'}</td></tr>`).join('');
  const tg = recs.reduce((s, r) => s + r.rec.breakup.gross, 0);
  const td = recs.reduce((s, r) => s + r.rec.breakup.totalDeduction, 0);
  const tn = recs.reduce((s, r) => s + r.rec.breakup.net, 0);
  return `<html><head><style>${css}</style></head><body>
    <div class="head"><h1>${company.name}</h1><p>${company.address}</p></div>
    <div class="title">MONTHLY PAYROLL REPORT - ${MONTHS[month - 1]} ${year}</div>
    <table><tr><th>#</th><th>Emp ID</th><th>Name</th><th>Dept</th><th style="text-align:right">Gross</th><th style="text-align:right">Deduction</th><th style="text-align:right">Net</th><th>Status</th></tr>
    ${rows}
    <tr><td></td><td></td><td></td><td><b>TOTAL</b></td><td style="text-align:right"><b>${formatINR(tg)}</b></td><td style="text-align:right"><b>${formatINR(td)}</b></td><td style="text-align:right"><b>${formatINR(tn)}</b></td><td></td></tr></table>
    <p style="font-size:12px">Total employees: <b>${recs.length}</b> | In words: <b>Rupees ${numToWordsIndian(tn)} Only</b></p>
    <div class="sign"><span>Prepared By</span><span>Checked By</span><span>Authorised Signatory</span></div>
    <div class="foot">Generated on ${formatDate(new Date().toISOString())}</div>
  </body></html>`;
}

export function sheetHTML(name: string, grid: string[][], company: CompanyInfo): string {
  const rows = grid.filter(r => r.some(c => (c || '').trim() !== '')).map((r, i) =>
    `<tr>${r.map(c => i === 0 ? `<th>${c || ''}</th>` : `<td>${c || ''}</td>`).join('')}</tr>`).join('');
  return `<html><head><style>${css}</style></head><body>
    <div class="head"><h1>${company.name}</h1><p>${company.address}</p></div>
    <div class="title">${name}</div>
    <table>${rows}</table>
    <div class="foot">Generated on ${formatDate(new Date().toISOString())}</div>
  </body></html>`;
}

export function employeeListHTML(emps: Employee[], company: CompanyInfo): string {
  const rows = emps.map((e, i) => `<tr><td>${i + 1}</td><td>${e.empId}</td><td>${e.name}</td><td>${e.department}</td><td>${e.designation}</td><td>${e.mobile}</td><td style="text-align:right">${formatINR(e.basicSalary + e.allowances.hra + e.allowances.transport + e.allowances.medical + e.allowances.other)}</td><td>${e.status}</td></tr>`).join('');
  return `<html><head><style>${css}</style></head><body>
    <div class="head"><h1>${company.name}</h1><p>${company.address}</p></div>
    <div class="title">EMPLOYEE MASTER LIST</div>
    <table><tr><th>#</th><th>Emp ID</th><th>Name</th><th>Department</th><th>Designation</th><th>Mobile</th><th style="text-align:right">Gross/Month</th><th>Status</th></tr>${rows}</table>
    <p style="font-size:12px">Total: <b>${emps.length}</b> employees</p>
    <div class="foot">Generated on ${formatDate(new Date().toISOString())}</div>
  </body></html>`;
}

export async function printHTML(html: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
    } else {
      const { uri } = await Print.printToFileAsync({ html });
      const avail = await Sharing.isAvailableAsync();
      if (avail) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share PDF' });
      else Alert.alert('PDF Ready', 'PDF generated: ' + uri);
    }
  } catch (e: any) {
    Alert.alert('Error', 'Could not generate PDF: ' + (e?.message || 'unknown error'));
  }
}

export async function shareTextFile(filename: string, content: string, mimeType = 'text/csv'): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const FS: any = FileSystem as any;
    const dir: string | undefined = FS.documentDirectory || FS.cacheDirectory;
    if (dir && FS.writeAsStringAsync) {
      const uri = dir + filename;
      await FS.writeAsStringAsync(uri, content, { encoding: 'utf8' });
      const avail = await Sharing.isAvailableAsync();
      if (avail) await Sharing.shareAsync(uri, { mimeType, dialogTitle: filename });
      else Alert.alert('File Ready', 'File saved: ' + uri);
      return;
    }
    if (FS.File && dir) {
      const f = new FS.File(dir, filename);
      await f.write(content);
      await Sharing.shareAsync(f.uri, { mimeType, dialogTitle: filename });
      return;
    }
    Alert.alert('Not supported', 'File sharing is not available on this device.');
  } catch (e: any) {
    Alert.alert('Error', 'Could not share file: ' + (e?.message || 'unknown error'));
  }
}
