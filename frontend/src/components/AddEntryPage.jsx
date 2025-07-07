import React, { useState } from 'react';
import axios from 'axios';

const entryOptions = [
  { value: 'symptom', label: 'Symptom' },
  { value: 'disease', label: 'Disease' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'labdiagnosis', label: 'Lab Diagnosis' },
  { value: 'procedure', label: 'Procedure' }
];

const AddEntryPage = () => {
  const [type, setType] = useState('symptom');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    try {
      const res = await axios.post('http://localhost:5000/api/add-entry', { type, name });
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
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>
        Add New Entry
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Entry Type</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setMessage('');
                setIsError(false);
              }}
              style={styles.select}
            >
              {entryOptions.map(option => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Name</label>
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
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.button}>
            Add {type}
          </button>
        </form>

        {message && (
          <p style={{
            ...styles.message,
            color: isError ? '#dc2626' : '#16a34a'
          }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    padding: '60px 20px',
    background: 'white',
    minHeight: '100vh'
  },
  card: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '16px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    width: '100%',
    maxWidth: '440px'
  },
  heading: {
    textAlign: 'center',
    marginBottom: '30px',
    fontSize: '24px',
    fontWeight: '600',
    color: '#333'
  },
  fieldGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    color: '#555'
  },
  select: {
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    backgroundColor: '#f9f9f9'
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    backgroundColor: '#f9f9f9'
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    fontSize: '16px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
    marginTop: '10px'
  },
  message: {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '500'
  }
};

export default AddEntryPage;
