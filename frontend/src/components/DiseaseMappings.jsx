import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DiseaseMappings.css'; 
import AdminExportMappings from './AdminExportMappings';


const DiseaseMappings = () => {
  const [mappings, setMappings] = useState([]);
  const [filteredMappings, setFilteredMappings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMappings();
  }, []);

  useEffect(() => {
    const filtered = mappings.filter(mapping =>
      mapping.disease.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mapping.symptoms && mapping.symptoms.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mapping.medicines && mapping.medicines.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredMappings(filtered);
  }, [searchTerm, mappings]);

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/export-mappings', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setMappings(response.data);
      setFilteredMappings(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching mappings:', error.response?.data || error.message);
      setError(error.response?.data?.error || 'Failed to fetch disease mappings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="disease-mappings">
      <div className="top-bar">
    <input
      type="text"
      placeholder="Search by disease, symptom, or medicine..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="search-input"
    />
    <AdminExportMappings />
  </div>

      {message && <div className="message">{message}</div>}
      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading mappings...</div>}

      <div className="mappings-list">
        <h3>Disease Mappings</h3>
        {filteredMappings.length === 0 ? (
          <div className="no-results">No disease mappings found</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Disease</th>
                <th>Symptoms</th>
                <th>Medicines</th>
                <th>Lab Tests</th>
                <th>Procedures</th>
                <th>Lifestyle Recommendations</th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.map((mapping, index) => (
                <tr key={index}>
                  <td>{mapping.disease}</td>
                  <td>{mapping.symptoms || '-'}</td>
                  <td>{mapping.medicines || '-'}</td>
                  <td>{mapping.lab_tests || '-'}</td>
                  <td>{mapping.procedures || '-'}</td>
                  <td>{mapping.lifestyle_recommendations || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DiseaseMappings;