import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DiseaseSymptomGraph from './DiseaseSymptomGraph';
import './DiseaseGraph.css';

const DiseaseGraphContainer = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/graph-data');
      
      // Validate response structure
      if (!response.data || !response.data.nodes || !response.data.links) {
        throw new Error('Invalid data structure from API');
      }

      setGraphData(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  const handleNodeClick = (node) => {
    console.log('Node clicked:', node);
    // You can implement node focus or additional info display here
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading disease-symptom relationships...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
        <button onClick={fetchGraphData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="disease-graph-container">
      <h2>Disease-Symptom Relationship Map</h2>
      <div className="graph-controls">
        <button onClick={fetchGraphData}>Refresh Data</button>
      </div>
      <DiseaseSymptomGraph 
        nodes={graphData.nodes} 
        links={graphData.links} 
        onNodeClick={handleNodeClick}
      />
    </div>
  );
};

export default DiseaseGraphContainer;