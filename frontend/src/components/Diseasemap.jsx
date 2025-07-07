import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Diseasemap.css'; 

const API_BASE = 'http://localhost:5000/api';

const MappingPage = () => {
  const [diseases, setDiseases] = useState([]);
  const [selectedDisease, setSelectedDisease] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    axios.get(`${API_BASE}/diseases`).then(res => setDiseases(res.data));
  }, []);

  const handleSectionClick = async (section) => {
    setActiveSection(section);
    setSelectedOptions([]);
    setSuccessMessage(''); // Clear any old message when switching section

    const endpoints = {
      symptoms: 'symptoms',
      lab: 'lab-tests',
      medicines: 'medicines',
      procedures: 'procedures'
    };

    const res = await axios.get(`${API_BASE}/${endpoints[section]}`);
    setOptions(res.data);
  };

  const handleOptionChange = (id) => {
    setSelectedOptions(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleMap = async () => {
    if (!selectedOptions.length) {
      setSuccessMessage('Please select at least one option.');
      return;
    }

    const endpointMap = {
      symptoms: { endpoint: 'map-symptoms', field: 'symptom_ids' },
      lab: { endpoint: 'map-lab-tests', field: 'lab_ids' },
      medicines: { endpoint: 'map-medicines', field: 'medicine_ids' },
      procedures: { endpoint: 'map-procedures', field: 'procedure_ids' }
    };

    const { endpoint, field } = endpointMap[activeSection];
    try {
      await axios.post(`${API_BASE}/${endpoint}`, {
        disease_id: selectedDisease,
        [field]: selectedOptions
      });
      setSuccessMessage('Mapped successfully!');
      setSelectedOptions([]);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setSuccessMessage('Mapping failed. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  return (
    <div className="mapping-container">
      <h2>Map Disease Data</h2>

      <div className="form-group">
        <label>Select Disease:</label>
        <select
          value={selectedDisease}
          onChange={e => {
            setSelectedDisease(e.target.value);
            setActiveSection('');
            setSuccessMessage('');
          }}
        >
          <option value="">-- Choose Disease --</option>
          {diseases.map(d => (
            <option key={d.disease_id} value={d.disease_id}>{d.name}</option>
          ))}
        </select>
      </div>

      {selectedDisease && (
        <>
          <div className="button-group">
            {['symptoms', 'lab', 'medicines', 'procedures'].map(section => (
              <button
                key={section}
                className="action-button"
                onClick={() => handleSectionClick(section)}
              >
                Map {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </div>

          {activeSection && (
            <div className="form-box">
  <h3>Select {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h3>

  <div className="checkbox-list">
    {options.map(opt => {
      const idKey = Object.keys(opt).find(k => k.includes('_id'));
      return (
        <label key={opt[idKey]}>
          <input
            type="checkbox"
            checked={selectedOptions.includes(opt[idKey])}
            onChange={() => handleOptionChange(opt[idKey])}
          />
          {opt.name}
        </label>
      );
    })}
  </div>

  <button className="submit-button" onClick={handleMap}>Add</button>

  {successMessage && (
    <div className="success-message">{successMessage}</div>
  )}
</div>

          )}
        </>
      )}
    </div>
  );
};

export default MappingPage;