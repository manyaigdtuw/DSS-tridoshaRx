import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet
} from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import MappingPage from './components/Diseasemap';
import SymptomChecker from './components/UserPage';
import AddEntryPage from './components/AddEntryPage';
import Login from './components/Login';
import Signup from './components/Signup';
import RoleManagement from './components/RoleManagement';
import DiseaseGraphContainer from './components/DiseaseGraphContainer';
import './App.css';

const App = () => {
  const [counts, setCounts] = useState({
    diseases: 0,
    symptoms: 0,
    medicines: 0,
    labTests: 0,
    procedures: 0,
    users: 0
  });

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true); // ✅ NEW
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState({ name: '', email: '' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');

    if (token && role) {
      setIsAuthenticated(true);
      setUserRole(role);
      setUserData({ name, email });
      fetchCounts(token);
    }

    setAuthLoading(false); // ✅ Set after check
  }, []);

  const fetchCounts = async (token) => {
    setLoading(true);
    setError(null);

    try {
      const endpoints = [
        { key: 'diseases', url: '/api/count/diseases' },
        { key: 'symptoms', url: '/api/count/symptoms' },
        { key: 'medicines', url: '/api/count/medicines' },
        { key: 'labTests', url: '/api/count/lab-tests' },
        { key: 'procedures', url: '/api/count/procedures' },
        { key: 'users', url: '/api/count/users' },
        { key: 'lifestyle', url: '/api/count/lifestyle' },
      ];

      const newCounts = {};

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`http://localhost:5000${endpoint.url}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const data = await response.json();
          newCounts[endpoint.key] = data.count || 0;
        } catch (error) {
          console.error(`Error fetching ${endpoint.key}:`, error);
          newCounts[endpoint.key] = 0;
        }
      }

      setCounts(newCounts);
    } catch (error) {
      setError('Failed to load dashboard data');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (token, role, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', role);
    localStorage.setItem('userName', user.full_name);
    localStorage.setItem('userEmail', user.email);

    setIsAuthenticated(true);
    setUserRole(role);
    setUserData({
      name: user.full_name,
      email: user.email
    });

    fetchCounts(token);
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setUserRole(null);
    setUserData({ name: '', email: '' });
  };

  // ✅ ProtectedRoute wrapper
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (authLoading) {
      return <div className="loading">Checking authentication...</div>;
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return <Navigate to="/unauthorized" replace />;
    }

    return children || <Outlet />;
  };

  const AdminLayout = () => (
    <>
      <Sidebar userRole={userRole} />
      <Topbar userName={userData.name} onLogout={handleLogout} />
      <div className="main-content">
        <Outlet />
      </div>
    </>
  );

  const UserLayout = () => (
    <div className="user-layout">
      <Outlet />
    </div>
  );

  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              authLoading ? (
                <div className="loading">Loading...</div>
              ) : isAuthenticated ? (
                userRole === 'admin' || userRole === 'deo' ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/user-page" replace />
                )
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />

          <Route
            path="/signup"
            element={
              isAuthenticated ? (
                userRole === 'admin' || userRole === 'deo' ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/user-page" replace />
                )
              ) : (
                <Signup />
              )
            }
          />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'deo']} />}>
            <Route element={<AdminLayout />}>
              <Route
                path="/dashboard"
                element={
                  loading ? (
                    <div className="loading">Loading dashboard data...</div>
                  ) : error ? (
                    <div className="error">{error}</div>
                  ) : (
                    <div className="box-grid">
                      <div className="box"><h3>Diseases</h3><p className="count">{counts.diseases}</p></div>
                      <div className="box"><h3>Symptoms</h3><p className="count">{counts.symptoms}</p></div>
                      <div className="box"><h3>Medicines</h3><p className="count">{counts.medicines}</p></div>
                      <div className="box"><h3>Lab Tests</h3><p className="count">{counts.labTests}</p></div>
                      <div className="box"><h3>Procedures</h3><p className="count">{counts.procedures}</p></div>
                      <div className="box"><h3>Users</h3><p className="count">{counts.users}</p></div>
                      <div className="box"><h3>Lifestyle Recommendations</h3><p className="count">{counts.lifestyle}</p></div>
                    </div>
                  )
                }
              />
              <Route path="/mapping" element={<MappingPage />} />
              <Route path="/graphs" element={<DiseaseGraphContainer />} />
              <Route
                path="/add-entry"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AddEntryPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="role-management"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <RoleManagement />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Route>

          {/* User Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<UserLayout />}>
              <Route path="/user-page" element={<SymptomChecker />} />
            </Route>
          </Route>

          {/* Default route logic */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                {userRole === 'admin' || userRole === 'deo' ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/user-page" replace />
                )}
              </ProtectedRoute>
            }
          />

          {/* Unauthorized page */}
          <Route
            path="/unauthorized"
            element={
              <div className="unauthorized">
                <h2>Unauthorized Access</h2>
                <p>You don't have permission to view this page.</p>
              </div>
            }
          />

          {/* Catch-all */}
          <Route
            path="*"
            element={
              isAuthenticated ? (
                userRole === 'admin' || userRole === 'deo' ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/user-page" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
