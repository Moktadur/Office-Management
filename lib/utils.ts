export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatINR(n: number): string {
  const v = Math.round(Number(n) || 0);
  try {
    return '\u20B9' + v.toLocaleString('en-IN');
  } catch {
    return '\u20B9' + String(v);
  }
}

export function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${h}:${m} ${ap}`;
}

export function todayISO(): string {
  const d = new Date();
  return toISODate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function toISODate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function daysInMonth(m: number, y: number): number {
  return new Date(y, m, 0).getDate();
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function num(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

import type { SalaryBreakup } from './types';

export interface SalaryInput {
  basic: number; hra: number; transport: number; medical: number; otherAllow: number;
  otHours: number; bonus: number; lopDays: number; advance: number; otherDeduction: number;
}

export function calcSalary(inp: SalaryInput): SalaryBreakup {
  const basic = num(inp.basic);
  const hra = num(inp.hra);
  const transport = num(inp.transport);
  const medical = num(inp.medical);
  const otherAllow = num(inp.otherAllow);
  const totalAllow = hra + transport + medical + otherAllow;
  const perDay = (basic + totalAllow) / 30;
  const lopDays = num(inp.lopDays);
  const lopAmount = Math.round(perDay * lopDays);
  const otHours = num(inp.otHours);
  const otRate = basic > 0 ? (basic / 30 / 8) * 1.5 : 0;
  const otAmount = Math.round(otHours * otRate);
  const bonus = num(inp.bonus);
  const gross = Math.round(basic + totalAllow + otAmount + bonus);
  const pf = Math.min(Math.round(basic * 0.12), 1800);
  const esi = gross <= 25000 ? Math.round(gross * 0.0075) : 0;
  const tds = gross > 50000 ? Math.round((gross - 50000) * 0.05) : 0;
  const advance = num(inp.advance);
  const otherDeduction = num(inp.otherDeduction);
  const totalDeduction = lopAmount + pf + esi + tds + advance + otherDeduction;
  const net = Math.max(0, Math.round(gross - totalDeduction));
  return {
    basic, hra, transport, medical, otherAllow, totalAllow,
    otHours, otRate: Math.round(otRate), otAmount, bonus,
    perDay: Math.round(perDay), lopDays, lopAmount, gross,
    pf, esi, tds, advance, otherDeduction, totalDeduction, net,
  };
}

export function colIndexToLetter(i: number): string {
  let s = '';
  i++;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

export function cellRefToPos(ref: string): { r: number; c: number } | null {
  const m = /^([A-Z]+)([1-9][0-9]*)$/.exec(ref.trim().toUpperCase());
  if (!m) return null;
  let c = 0;
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
  c--;
  return { r: parseInt(m[2], 10) - 1, c };
}

function arithEval(expr: string): number {
  let s = expr.replace(/\s+/g, '');
  if (s.length === 0) throw new Error('empty');
  if (!/^[0-9+\-*/().%]+$/.test(s)) throw new Error('bad chars');
  s = s.replace(/^\-/, '0-').replace(/\(\-/g, '(0-');
  const tokens = s.match(/(\d+\.?\d*|\.\d+|[+\-*/()%()])/g);
  if (!tokens) throw new Error('no tokens');
  const vals: number[] = [];
  const ops: string[] = [];
  const prec = (op: string) => (op === '+' || op === '-' ? 1 : op === '*' || op === '/' ? 2 : 0);
  const apply = () => {
    const op = ops.pop();
    if (op === undefined) throw new Error('op');
    const b = vals.pop();
    const a = vals.pop();
    if (a === undefined || b === undefined) throw new Error('vals');
    let r = 0;
    if (op === '+') r = a + b;
    else if (op === '-') r = a - b;
    else if (op === '*') r = a * b;
    else if (op === '/') {
      if (b === 0) throw new Error('div0');
      r = a / b;
    }
    vals.push(r);
  };
  for (const t of tokens) {
    if (/^[0-9.]/.test(t)) {
      const v = parseFloat(t);
      if (isNaN(v)) throw new Error('num');
      vals.push(v);
    } else if (t === '(') {
      ops.push(t);
    } else if (t === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') apply();
      if (!ops.length) throw new Error('paren');
      ops.pop();
    } else if (t === '%') {
      const v = vals.pop();
      if (v === undefined) throw new Error('pct');
      vals.push(v / 100);
    } else {
      while (ops.length && ops[ops.length - 1] !== '(' && prec(ops[ops.length - 1]) >= prec(t)) apply();
      ops.push(t);
    }
  }
  while (ops.length) {
    if (ops[ops.length - 1] === '(') throw new Error('paren');
    apply();
  }
  if (vals.length !== 1) throw new Error('eval');
  if (!isFinite(vals[0])) throw new Error('inf');
  return vals[0];
}

export function evaluateSheet(raw: string[][]): string[][] {
  const R = raw.length;
  const C = R > 0 ? raw[0].length : 0;
  const memo: (number | string | null)[][] = Array.from({ length: R }, () => Array(C).fill(null));
  const visiting = new Set<string>();

  const numVal = (r: number, c: number): number => {
    if (r < 0 || c < 0 || r >= R || c >= C) return 0;
    const v = val(r, c);
    return typeof v === 'number' ? v : 0;
  };

  const rangeVals = (a: string, b: string): number[] => {
    const pa = cellRefToPos(a);
    const pb = cellRefToPos(b);
    if (!pa || !pb) return [];
    const out: number[] = [];
    const r1 = Math.min(pa.r, pb.r), r2 = Math.max(pa.r, pb.r);
    const c1 = Math.min(pa.c, pb.c), c2 = Math.max(pa.c, pb.c);
    for (let r = r1; r <= r2; r++)
      for (let c = c1; c <= c2; c++) out.push(numVal(r, c));
    return out;
  };

  const applyFn = (name: string, argsStr: string): number => {
    const args = argsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const vals: number[] = [];
    for (const a of args) {
      const rm = /^([A-Za-z]+\d+)\s*:\s*([A-Za-z]+\d+)$/.exec(a);
      if (rm) {
        vals.push(...rangeVals(rm[1], rm[2]));
      } else if (/^[A-Za-z]+\d+$/.test(a)) {
        const p = cellRefToPos(a);
        vals.push(p ? numVal(p.r, p.c) : 0);
      } else {
        const n = Number(a);
        vals.push(isNaN(n) ? 0 : n);
      }
    }
    const N = name.toUpperCase();
    if (N === 'SUM') return vals.reduce((x, y) => x + y, 0);
    if (N === 'AVERAGE' || N === 'AVG') return vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 0;
    if (N === 'MIN') return vals.length ? Math.min(...vals) : 0;
    if (N === 'MAX') return vals.length ? Math.max(...vals) : 0;
    if (N === 'COUNT') return vals.length;
    if (N === 'PRODUCT') return vals.reduce((x, y) => x * y, 1);
    throw new Error('fn');
  };

  const val = (r: number, c: number): number | string => {
    if (memo[r][c] !== null) return memo[r][c] as number | string;
    const key = r + ':' + c;
    if (visiting.has(key)) return 0;
    const cell = (raw[r][c] ?? '').toString();
    if (!cell.startsWith('=')) {
      const t = cell.trim();
      if (t !== '' && !isNaN(Number(t))) {
        memo[r][c] = Number(t);
        return memo[r][c] as number;
      }
      memo[r][c] = cell;
      return cell;
    }
    visiting.add(key);
    try {
      let expr = cell.slice(1);
      expr = expr.replace(/([A-Za-z]+)\(([^()]*)\)/g, (_m, fn, args) => String(applyFn(fn, args)));
      expr = expr.replace(/[A-Za-z]+[0-9]+/g, (ref) => {
        const p = cellRefToPos(ref);
        if (!p) return '0';
        return String(numVal(p.r, p.c));
      });
      const v = arithEval(expr);
      const rounded = Math.round(v * 100) / 100;
      memo[r][c] = rounded;
      visiting.delete(key);
      return rounded;
    } catch {
      visiting.delete(key);
      memo[r][c] = '#ERR';
      return '#ERR';
    }
  };

  const out: string[][] = [];
  for (let r = 0; r < R; r++) {
    const row: string[] = [];
    for (let c = 0; c < C; c++) {
      const v = val(r, c);
      row.push(typeof v === 'number' ? String(v) : v);
    }
    out.push(row);
  }
  return out;
}

export function gridToCSV(grid: string[][]): string {
  return grid.map(row => row.map(cell => {
    const s = (cell ?? '').toString();
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (ch === '\r') { /* skip */ }
      else cur += ch;
    }
  }
  row.push(cur);
  rows.push(row);
  const w = Math.max(...rows.map(r => r.length), 1);
  return rows.filter(r => r.some(c => c.trim() !== '')).map(r => {
    while (r.length < w) r.push('');
    return r;
  });
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? ' ' + ONES[o] : '');
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let s = '';
  if (h) s = ONES[h] + ' Hundred';
  if (rest) s += (s ? ' ' : '') + twoDigits(rest);
  return s;
}

export function numToWordsIndian(n: number): string {
  n = Math.round(Math.abs(n));
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thou = Math.floor((n % 1e5) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(threeDigits(crore) + ' Crore');
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh');
  if (thou) parts.push(twoDigits(thou) + ' Thousand');
  if (rest) parts.push(threeDigits(rest));
  return parts.join(' ');
}
