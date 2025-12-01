import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import TutorDashboard from './components/TutorDashboard';
import AdminVisualization from './components/AdminVisualization';
import AdminSetPassword from './components/AdminSetPassword'; // ✅ Import

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
        <Route path="/admin/visualizations" element={<RequireAuth><AdminVisualization /></RequireAuth>} /> 
        
        {/* ✅ NEW: Hidden Route for Password Reset */}
        <Route path="/admin/set-password" element={<RequireAuth><AdminSetPassword /></RequireAuth>} />
        
        <Route path="/tutor" element={<RequireAuth><TutorDashboard /></RequireAuth>} />
      </Routes>
    </Router>
  );
}

export default App;