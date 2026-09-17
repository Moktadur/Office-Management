import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const COLORS = {
  navy: '#0B2B4C',
  navyLight: '#143A66',
  gold: '#C9A227',
  goldLight: '#F5E9C8',
  bg: '#F2F4F8',
  card: '#FFFFFF',
  text: '#152238',
  muted: '#6B7A90',
  border: '#E2E8F0',
  green: '#16A34A',
  greenBg: '#DCFCE7',
  red: '#DC2626',
  redBg: '#FEE2E2',
  amber: '#D97706',
  amberBg: '#FEF3C7',
  blue: '#2563EB',
  blueBg: '#DBEAFE',
  purple: '#7C3AED',
  purpleBg: '#EDE9FE',
};

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'phone-pad' | 'email-address';
  secure?: boolean;
  multiline?: boolean;
  editable?: boolean;
  style?: ViewStyle;
}

export function Field({ label, value, onChange, placeholder, keyboardType = 'default', secure, multiline, editable = true, style }: FieldProps) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }, !editable && { backgroundColor: '#F1F5F9', color: COLORS.muted }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9AA8BC"
        keyboardType={keyboardType}
        secureTextEntry={secure}
        multiline={multiline}
        editable={editable}
      />
    </View>
  );
}

interface BtnProps {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  style?: ViewStyle;
  small?: boolean;
  disabled?: boolean;
}

export function Btn({ title, onPress, icon, variant = 'primary', style, small, disabled }: BtnProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        variant === 'primary' && { backgroundColor: COLORS.navy },
        variant === 'secondary' && { backgroundColor: '#E8EDF4' },
        variant === 'danger' && { backgroundColor: COLORS.red },
        variant === 'ghost' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border },
        variant === 'success' && { backgroundColor: COLORS.green },
        small && { paddingVertical: 8, paddingHorizontal: 12 },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={small ? 15 : 18} color={variant === 'primary' || variant === 'danger' || variant === 'success' ? '#fff' : COLORS.navy} style={{ marginRight: 6 }} />}
      <Text style={[styles.btnText, (variant === 'secondary' || variant === 'ghost') && { color: COLORS.navy }, small && { fontSize: 13 }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Badge({ text, tone = 'blue' }: { text: string; tone?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'gray' }) {
  const map: Record<string, { bg: string; fg: string }> = {
    blue: { bg: COLORS.blueBg, fg: COLORS.blue },
    green: { bg: COLORS.greenBg, fg: COLORS.green },
    red: { bg: COLORS.redBg, fg: COLORS.red },
    amber: { bg: COLORS.amberBg, fg: COLORS.amber },
    purple: { bg: COLORS.purpleBg, fg: COLORS.purple },
    gray: { bg: '#E8EDF4', fg: COLORS.muted },
  };
  const c = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={34} color={COLORS.navy} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

export function LoadingView({ label = 'Loading...' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={COLORS.navy} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={styles.searchWrap}>
      <Ionicons name="search" size={18} color={COLORS.muted} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || 'Search...'}
        placeholderTextColor="#9AA8BC"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChange('')}>
          <Ionicons name="close-circle" size={18} color={COLORS.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      {icon && <Ionicons name={icon} size={14} color={active ? '#fff' : COLORS.navy} style={{ marginRight: 4 }} />}
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0B2B4C',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EDF1F7',
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.navy },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 } as TextStyle,
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: COLORS.text,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 24 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EAF0F8', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.navy, marginBottom: 4, textAlign: 'center' },
  emptySub: { fontSize: 13, color: COLORS.muted, textAlign: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 10, color: COLORS.muted, fontSize: 14 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#E8EDF4', marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.navy },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.navy },
});
