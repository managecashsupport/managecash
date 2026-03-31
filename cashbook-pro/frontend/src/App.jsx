import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Join from './pages/Join'
import Dashboard from './pages/Dashboard'
import AddTransaction from './pages/AddTransaction'
import History from './pages/History'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Billing from './pages/Billing'
import Staff from './pages/Staff'
import SuperAdmin from './pages/SuperAdmin'
import Customers from './pages/Customers'
import CustomerProfile from './pages/CustomerProfile'
import Stock from './pages/Stock'
import Purchases from './pages/Purchases'
import Salary from './pages/Salary'
import Expenses from './pages/Expenses'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Landing page — always public */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Landing />} />

      {/* Auth pages */}
      <Route path="/login"    element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/join"          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Join />} />
      <Route path="/verify-email"     element={<VerifyEmail />} />
      <Route path="/forgot-password"  element={<ForgotPassword />} />
      <Route path="/reset-password"   element={<ResetPassword />} />

      {/* Protected app routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard"        element={<Dashboard />} />
        <Route path="add-transaction"  element={<AddTransaction />} />
        <Route path="add-transaction/:id" element={<AddTransaction />} />
        <Route path="history"          element={<History />} />
        <Route path="analytics"        element={<Analytics />} />
        <Route path="settings"         element={<Settings />} />
        <Route path="billing"          element={<Billing />} />
        <Route path="staff"            element={<Staff />} />
        <Route path="customers"        element={<Customers />} />
        <Route path="customers/:id"    element={<CustomerProfile />} />
        <Route path="stock"            element={<Stock />} />
        <Route path="purchases"        element={<Purchases />} />
        <Route path="salary"           element={<Salary />} />
        <Route path="expenses"         element={<Expenses />} />
      </Route>

      {/* Super admin */}
      <Route path="/superadmin" element={
        <ProtectedRoute requiredRole="superadmin"><SuperAdmin /></ProtectedRoute>
      } />

      {/* 404 */}
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/'} />} />
    </Routes>
  )
}

export default App
