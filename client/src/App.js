import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import TutorDashboard from './components/TutorDashboard';
import AdminVisualization from './pages/AdminVisualization';

// Example of a simple auth check (token presence). You may replace with proper auth
const RequireAuth = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
        <Route path="/tutor" element={<RequireAuth><TutorDashboard /></RequireAuth>} />

        {/* NEW: Visualizations route (opens in new tab from AdminDashboard) */}
        <Route path="/admin/visualizations" element={<RequireAuth><AdminVisualization /></RequireAuth>} />

        {/* fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
