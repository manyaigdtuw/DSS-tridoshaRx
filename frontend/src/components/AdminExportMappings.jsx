// AdminExportMappings.jsx
import React from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import './AdminExportMappings.css';

const API_BASE_URL = 'http://localhost:5000';

const AdminExportMappings = () => {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleExport = async (format) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/export-mappings`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = response.data;

      if (format === 'excel') {
        // Excel export
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mappings");
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'disease_mappings.xlsx');
      } else {
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
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export mappings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-export-container">
      <h3>Export Database Mappings</h3>
      <div className="export-options">
        <button 
          onClick={() => handleExport('excel')} 
          disabled={isLoading}
          className="export-button excel"
        >
          {isLoading ? 'Exporting...' : 'Export as Excel'}
        </button>
        <button 
          onClick={() => handleExport('csv')} 
          disabled={isLoading}
          className="export-button csv"
        >
          {isLoading ? 'Exporting...' : 'Export as CSV'}
        </button>
      </div>
    </div>
  );
};

export default AdminExportMappings;