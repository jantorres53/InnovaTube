import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { useAuth } from './contexts/AuthContext';
import LogoutOverlay from './components/LogoutOverlay';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();
  return state.user ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();
  return !state.user ? <>{children}</> : <Navigate to="/dashboard" />;
};

const GlobalLogoutOverlay: React.FC = () => {
  const { state } = useAuth();
  return state.loggingOut ? <LogoutOverlay /> : null;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <GlobalLogoutOverlay />
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            </Routes>
          </div>
        </Router>
    </AuthProvider>
  );
}

export default App;
