import React from 'react';
import './SearchBar.css';

export default function FilterBar({ medicines, selectedMedicine, onChange }) {
  return (
    <div className="filter-bar">
      <label htmlFor="medicine-filter">Filter by category:</label>
      <select
        id="medicine-filter"
        value={selectedMedicine}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Default</option>
        {medicines.map(med => (
          <option key={med.medicine_id} value={med.medicine_id}>
            {med.name}
          </option>
        ))}
      </select>
    </div>
  );
}