import React from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import './AdminExportMappings.css';

const API_BASE_URL = 'https://dss-tridosharx.onrender.com';

const AdminExportMappings = () => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/export-mappings`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = response.data;

      // CSV export
      const headers = Object.keys(data[0]).join(',');
      const csvRows = data.map(row =>
        Object.values(row).map(field =>
          `"${String(field).replace(/"/g, '""')}"`
        ).join(',')
      );
      const csv = [headers, ...csvRows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'disease_mappings.csv');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export mappings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="export-button-wrapper">
      <button
        onClick={handleExport}
        disabled={isLoading}
        className="export-button csv"
      >
        {isLoading ? 'Exporting...' : 'Export as CSV'}
      </button>
    </div>
  );
};

export default AdminExportMappings;
