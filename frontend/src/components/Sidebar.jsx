import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ userRole }) => {
  return (
    <div className="sidebar">
      <h2>TridoshaRx</h2>
      <ul>
        <li><Link to="/">Dashboard</Link></li>
        <li><Link to="/mapping">Disease Mapping</Link></li>
        <li><Link to="/add-entry">Add new entries</Link></li>
        <li><Link to="/graphs">Graphs</Link></li>
        {userRole === 'admin' && (
          <li><Link to="/role-management">Role Management</Link></li>
        )}
      </ul>
    </div>
  );
};

export default Sidebar;