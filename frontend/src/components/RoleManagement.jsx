import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RoleManagement.css';

const RoleManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      const response = await axios.get('http://localhost:5000/api/users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      console.log('Users fetched successfully:', response.data);
      setUsers(response.data);
      setFilteredUsers(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching users:', error.response?.data || error.message);
      setError(error.response?.data?.error || 'Failed to fetch users');
      setMessage('');
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      console.log(`Updating user ${userId} role to ${newRole}...`);
      await axios.put(
        'http://localhost:5000/api/users/role',
        { user_id: userId, role: newRole },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      console.log('Role updated successfully');
      fetchUsers();
      setMessage('Role updated successfully');
      setError('');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating role:', error.response?.data || error.message);
      setError(error.response?.data?.error || 'Failed to update role');
      setMessage('');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="role-management">
      <div className="search-section">
        <input
          type="text"
          placeholder="Search users by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {message && <div className="message">{message}</div>}
      {error && <div className="error">{error}</div>}

      <div className="users-list">
        <h3>Users</h3>
        {filteredUsers.length === 0 ? (
          <div className="no-results">No users found matching your search</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Current Role</th>
                <th>Change Role</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.user_id}>
                  <td>{user.email}</td>
                  <td>{user.full_name}</td>
                  <td>{user.role}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.user_id, e.target.value)}
                      disabled={user.email === localStorage.getItem('userEmail')}
                    >
                      <option value="admin">Admin</option>
                      <option value="deo">Data Entry Operator</option>
                      <option value="user">User</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RoleManagement;