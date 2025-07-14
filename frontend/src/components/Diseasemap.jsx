import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import './Diseasemap.css'; 
import AdminExportMappings from './AdminExportMappings';


const API_BASE = 'http://localhost:5000/api';
const MappingPage = () => {
  const [diseases, setDiseases] = useState([]);
  const [selectedDisease, setSelectedDisease] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    const fetchDiseases = async () => {
      try {
        const res = await axios.get(`${API_BASE}/diseases`);
        setDiseases(res.data);
      } catch (err) {
        setSuccessMessage('Failed to load diseases. Please refresh the page.');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    };
    fetchDiseases();
  }, []);

  useEffect(() => {
    if (activeSection && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activeSection]);

  const handleSectionClick = async (section) => {
    setIsLoading(true);
    setActiveSection(section);
    setSelectedOptions([]);
    setSuccessMessage('');
    setSearchTerm('');
    
    const endpoints = {
      symptoms: 'symptoms',
      lab: 'lab-tests',
      medicines: 'medicines',
      procedures: 'procedures',
      lifestyle: 'lifestyle-recommendations'
    };
    
    try {
      const res = await axios.get(`${API_BASE}/${endpoints[section]}`);
      setOptions(res.data);
    } catch (err) {
      setSuccessMessage('Failed to load options. Please try again.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionChange = (id) => {
    setSelectedOptions(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleMap = async () => {
    if (!selectedOptions.length) {
      setSuccessMessage('Please select at least one option.');
      setTimeout(() => setSuccessMessage(''), 5000);
      return;
    }
    
    setIsLoading(true);
    
    const endpointMap = {
      symptoms: { endpoint: 'map-symptoms', field: 'symptom_ids' },
      lab: { endpoint: 'map-lab-tests', field: 'lab_ids' },
      medicines: { endpoint: 'map-medicines', field: 'medicine_ids' },
      procedures: { endpoint: 'map-procedures', field: 'procedure_ids' },
      lifestyle: { endpoint: 'map-lifestyle', field: 'lifestyle_ids' }
    };
    
    const { endpoint, field } = endpointMap[activeSection];
    
    try {
      await axios.post(`${API_BASE}/${endpoint}`, {
        disease_id: selectedDisease,
        [field]: selectedOptions
      });
      setSuccessMessage('Mapping successful!');
      setSelectedOptions([]);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setSuccessMessage('Mapping failed. Please try again.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOptions = options.filter(option => 
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (

      <main className="content-wrapper">
        <div className="form-section">
          <div className="form-group">
            <label htmlFor="disease-select">Select Disease:</label>
            <select
              id="disease-select"
              value={selectedDisease}
              onChange={e => {
                setSelectedDisease(e.target.value);
                setActiveSection('');
                setSuccessMessage('');
              }}
              disabled={isLoading}
            >
              <option value="">-- Choose Disease --</option>
              {diseases.map(d => (
                <option key={d.disease_id} value={d.disease_id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {selectedDisease && (
            <>
              <div className="button-group">
                {['symptoms', 'lab', 'medicines', 'procedures', 'lifestyle'].map(section => (
                  <button
                    key={section}
                    className={`action-button ${activeSection === section ? 'active' : ''}`}
                    onClick={() => handleSectionClick(section)}
                    disabled={isLoading}
                  >
                    <span className="button-icon">📋</span>
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </button>
                ))}
              </div>

              {activeSection && (
                <div className="form-box">
                  <h3>Select {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h3>
                  
                  <div className="search-container">
                    <input
                      type="text"
                      placeholder="Search options..."
                      className="search-input"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      ref={searchInputRef}
                    />
                  </div>
                  
                  {isLoading ? (
                    <div className="loading-indicator">Loading options...</div>
                  ) : (
                    <div className="checkbox-list">
                      {filteredOptions.length > 0 ? (
                        filteredOptions.map(opt => {
                          const idKey = Object.keys(opt).find(k => k.includes('_id'));
                          return (
                            <label key={opt[idKey]} className="checkbox-item">
                              <input
                                type="checkbox"
                                checked={selectedOptions.includes(opt[idKey])}
                                onChange={() => handleOptionChange(opt[idKey])}
                              />
                              <span className="checkbox-custom"></span>
                              {opt.name}
                            </label>
                          );
                        })
                      ) : (
                        <p className="no-options">
                          {searchTerm ? 'No matching options found' : 'No options available for this category'}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="action-footer">
                    <button 
                      className="submit-button" 
                      onClick={handleMap}
                      disabled={isLoading || selectedOptions.length === 0}
                    >
                      {isLoading ? 'Processing...' : 'Add to Disease'}
                    </button>
                    
                    {selectedOptions.length > 0 && (
                      <span className="selection-count">
                        {selectedOptions.length} item{selectedOptions.length !== 1 ? 's' : ''} selected
                      </span>
                    )}
                  </div>
                  
                  {successMessage && (
                    <div className={`success-message ${successMessage.includes('Please') ? 'warning' : ''}`}>
                      {successMessage}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

           <AdminExportMappings />
        </div>
      </main>
    
  );
};

export default MappingPage;