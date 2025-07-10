import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ userRole }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>
          TridoshaRx
        </h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <Link to="/">
              <i className="icon-dashboard"></i>
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link to="/mapping">
              <i className="icon-mapping"></i>
              <span>Disease Mapping</span>
            </Link>
          </li>
          <li>
            <Link to="/add-entry">
              <i className="icon-add"></i>
              <span>Add New Entries</span>
            </Link>
          </li>
          <li>
            <Link to="/graphs">
              <i className="icon-graphs"></i>
              <span>Graphs & Analytics</span>
            </Link>
          </li>
          {userRole === 'admin' && (
            <li>
              <Link to="/role-management">
                <i className="icon-admin"></i>
                <span>Role Management</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>
      <div className="sidebar-footer">
        <div className="version">v2.1.0</div>
      </div>
    </div>
  );
};

export default Sidebar;
