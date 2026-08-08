import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ReportForm from "./pages/ReportForm";
import CaseDetail from "./pages/CaseDetail";
import AuthorityDashboard from "./pages/AuthorityDashboard";
import "./index.css";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page"><p>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><ReportForm /></ProtectedRoute>} />
      <Route path="/case/:caseId" element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
      <Route path="/authority" element={<ProtectedRoute><AuthorityDashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
