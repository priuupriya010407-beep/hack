import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { clearAuthToken, getAuthToken } from './lib/auth';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ImageInvestigationPage from './pages/ImageInvestigationPage';
import VideoInvestigationPage from './pages/VideoInvestigationPage';
import CertificatePage from './pages/CertificatePage';
import MessageSafetyPage from './pages/MessageSafetyPage';
import UrlSafetyPage from './pages/UrlSafetyPage';
import SocialSafetyPage from './pages/SocialSafetyPage';
import FileComparisonPage from './pages/FileComparisonPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import HistoryPage from './pages/HistoryPage';
import ReportsPage from './pages/ReportsPage';
import PrivacyPage from './pages/PrivacyPage';
import NotFoundPage from './pages/NotFoundPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsVerified(false);
      return;
    }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (!response.ok) throw new Error('Session is invalid or expired.');
        setIsVerified(true);
      })
      .catch(() => {
        clearAuthToken();
        setIsVerified(false);
      });
  }, []);

  if (isVerified === null) {
    return <main className="container page-section" role="status">Checking your session…</main>;
  }
  if (!isVerified) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.hash}` }} />;
  }
  return children;
}

function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="/investigation/image" element={<RequireAuth><ImageInvestigationPage /></RequireAuth>} />
        <Route path="/investigation/video" element={<RequireAuth><VideoInvestigationPage /></RequireAuth>} />
        <Route path="/certificate" element={<RequireAuth><CertificatePage /></RequireAuth>} />
        <Route path="/message-safety" element={<RequireAuth><MessageSafetyPage /></RequireAuth>} />
        <Route path="/url-safety" element={<RequireAuth><UrlSafetyPage /></RequireAuth>} />
        <Route path="/social-safety" element={<RequireAuth><SocialSafetyPage /></RequireAuth>} />
        <Route path="/compare" element={<RequireAuth><FileComparisonPage /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
        <Route path="/reports" element={<RequireAuth><ReportsPage /></RequireAuth>} />
        <Route path="/privacy" element={<RequireAuth><PrivacyPage /></RequireAuth>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;
