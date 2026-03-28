import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthGuard from '@/components/auth/AuthGuard'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import SettingsPage from '@/pages/SettingsPage'
import UploadPage from '@/pages/UploadPage'
import ExtractionReviewPage from '@/pages/ExtractionReviewPage'
import SolvePage from '@/pages/SolvePage'
import ResultPage from '@/pages/ResultPage'
import ReviewPage from '@/pages/ReviewPage'
import SubjectDetailPage from '@/pages/SubjectDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route element={<AuthGuard />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="review-extraction" element={<ExtractionReviewPage />} />
            <Route path="solve/:sessionId" element={<SolvePage />} />
            <Route path="result/:sessionId" element={<ResultPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="subject/:subjectId" element={<SubjectDetailPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
