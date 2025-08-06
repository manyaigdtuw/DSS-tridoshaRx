import React, { useState } from 'react';
import axios from 'axios';
import './AddEntryPage.css'; // New CSS file

const entryOptions = [
  { value: 'symptom', label: 'Symptom' },
  { value: 'disease', label: 'Disease' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'labdiagnosis', label: 'Lab Diagnosis' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'lifestyle', label: 'Lifestyle Recommendation' }
];

const AddEntryPage = () => {
  const [type, setType] = useState('symptom');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);
    setIsLoading(true);
    
    try {
      const res = await axios.post('https://dss-tridosharx.onrender.com/api/add-entry', { type, name });
      setMessage(res.data.message);
      setName('');
    } catch (err) {
      if (err.response?.status === 409) {
        setMessage(err.response.data.message);
        setIsError(true);
      } else {
        setMessage('Something went wrong!');
        setIsError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="label">Entry Type</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setMessage('');
                setIsError(false);
              }}
              className="select"
            >
              {entryOptions.map(option => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label className="label">Name</label>
            <input
              type="text"
              value={name}
              placeholder={`Enter ${type} name`}
              onChange={(e) => {
                setName(e.target.value);
                setMessage('');
                setIsError(false);
              }}
              required
              className="input"
            />
          </div>
          <button 
            type="submit" 
            className="button"
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : `Add ${type}`}
          </button>
        </form>
        {message && (
          <p className={`message ${isError ? 'error' : 'success'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default AddEntryPage;