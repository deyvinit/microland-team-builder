import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Outbox from './pages/Outbox';
import AddProfile from './pages/AddProfile';
import AddProject from './pages/AddProject';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/outbox" element={<Outbox />} />
          <Route path="/add-profile" element={<AddProfile />} />
          <Route path="/edit-profile/:id" element={<AddProfile />} />
          <Route path="/add-project" element={<AddProject />} />
          <Route path="/edit-project/:id" element={<AddProject />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
