import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from './lib/store';
import { LoadingView } from './components/ui';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import { EmployeeListScreen } from './screens/EmployeesScreen';
import EmployeeDetailScreen from './screens/EmployeeDetailScreen';
import EmployeeFormScreen from './screens/EmployeeFormScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import { PayrollListScreen, PayslipDetailScreen } from './screens/PayrollScreen';
import { SheetListScreen, SheetEditorScreen } from './screens/ExcelScreen';
import { DocsListScreen, DocDetailScreen } from './screens/DocsScreen';
import ReportsScreen from './screens/ReportsScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const EmpStack = createNativeStackNavigator();
const PayStack = createNativeStackNavigator();
const ExcelStack = createNativeStackNavigator();
const DocStack = createNativeStackNavigator();

const NAVY = '#0B2B4C';

function EmpNavigator() {
  return (
    <EmpStack.Navigator screenOptions={{ headerStyle: { backgroundColor: NAVY }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '800' } }}>
      <EmpStack.Screen name="EmployeeList" component={EmployeeListScreen} options={{ title: 'Employees' }} />
      <EmpStack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} options={{ title: 'Employee Profile' }} />
      <EmpStack.Screen name="EmployeeForm" component={EmployeeFormScreen} options={({ route }: any) => ({ title: route.params?.id ? 'Edit Employee' : 'Add Employee' })} />
    </EmpStack.Navigator>
  );
}

function PayNavigator() {
  return (
    <PayStack.Navigator screenOptions={{ headerStyle: { backgroundColor: NAVY }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '800' } }}>
      <PayStack.Screen name="PayrollList" component={PayrollListScreen} options={{ title: 'Payroll & Salary' }} />
      <PayStack.Screen name="PayslipDetail" component={PayslipDetailScreen} options={{ title: 'Payslip' }} />
    </PayStack.Navigator>
  );
}

function ExcelNavigator() {
  return (
    <ExcelStack.Navigator screenOptions={{ headerStyle: { backgroundColor: NAVY }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '800' } }}>
      <ExcelStack.Screen name="SheetList" component={SheetListScreen} options={{ title: 'Excel Sheets' }} />
      <ExcelStack.Screen name="SheetEditor" component={SheetEditorScreen} options={{ title: 'Sheet Editor', headerBackTitle: 'Sheets' }} />
    </ExcelStack.Navigator>
  );
}

function DocNavigator() {
  return (
    <DocStack.Navigator screenOptions={{ headerStyle: { backgroundColor: NAVY }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '800' } }}>
      <DocStack.Screen name="DocsList" component={DocsListScreen} options={{ title: 'Document Vault' }} />
      <DocStack.Screen name="DocDetail" component={DocDetailScreen} options={{ title: 'Document' }} />
    </DocStack.Navigator>
  );
}

function MainTabs() {
  const { user } = useApp();
  const isAdmin = user?.role === 'admin';
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: NAVY },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: NAVY,
        tabBarInactiveTintColor: '#8FA3BD',
        tabBarStyle: { paddingBottom: 6, height: 62 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Dashboard: 'home',
            Employees: 'people',
            Attendance: 'calendar',
            Payroll: 'wallet',
            Excel: 'grid',
            Documents: 'folder-open',
            Reports: 'bar-chart',
            Settings: 'settings',
          };
          return <Ionicons name={map[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Office Dashboard' }} />
      <Tab.Screen name="Employees" component={EmpNavigator} options={{ headerShown: false }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance' }} />
      {isAdmin && <Tab.Screen name="Payroll" component={PayNavigator} options={{ headerShown: false }} />}
      <Tab.Screen name="Excel" component={ExcelNavigator} options={{ headerShown: false }} />
      <Tab.Screen name="Documents" component={DocNavigator} options={{ headerShown: false }} />
      {isAdmin && <Tab.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports & Analytics' }} />}
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

function Root() {
  const { user, ready } = useApp();
  if (!ready) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingView label="Loading office data..." />
      </View>
    );
  }
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <Root />
          <StatusBar style="light" />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
