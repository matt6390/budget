import { ReactNode } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'

import { tokenStorage } from './api/client'
import Layout from './components/Layout'
import CategoriesPage from './pages/CategoriesPage'
import DashboardPage from './pages/DashboardPage'
import ExpensesPage from './pages/ExpensesPage'
import IncomePage from './pages/IncomePage'
import LoansPage from './pages/LoansPage'
import LoginPage from './pages/LoginPage'
import PurchasesPage from './pages/PurchasesPage'
import ReportsPage from './pages/ReportsPage'
import SavingsPage from './pages/SavingsPage'
import SignupPage from './pages/SignupPage'
import { PdfImportPage } from './pages/PdfImportPage'
import ImportHistoryPage from './pages/ImportHistoryPage'

function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!tokenStorage.hasAccessToken()) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export const router = createBrowserRouter([
  { path: '/', element: <ProtectedRoute><DashboardPage /></ProtectedRoute> },
  { path: '/dashboard', element: <ProtectedRoute><DashboardPage /></ProtectedRoute> },
  { path: '/income', element: <ProtectedRoute><IncomePage /></ProtectedRoute> },
  { path: '/expenses', element: <ProtectedRoute><ExpensesPage /></ProtectedRoute> },
  { path: '/purchases', element: <ProtectedRoute><PurchasesPage /></ProtectedRoute> },
  { path: '/import-pdf', element: <ProtectedRoute><PdfImportPage /></ProtectedRoute> },
  { path: '/import-history', element: <ProtectedRoute><ImportHistoryPage /></ProtectedRoute> },
  { path: '/categories', element: <ProtectedRoute><CategoriesPage /></ProtectedRoute> },
  { path: '/savings', element: <ProtectedRoute><SavingsPage /></ProtectedRoute> },
  { path: '/loans', element: <ProtectedRoute><LoansPage /></ProtectedRoute> },
  { path: '/reports', element: <ProtectedRoute><ReportsPage /></ProtectedRoute> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
])

