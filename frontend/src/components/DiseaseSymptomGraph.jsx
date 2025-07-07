import React, { useRef, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import * as THREE from 'three';

const DiseaseSymptomGraph = ({ nodes, links, onNodeClick }) => {
  const fgRef = useRef(null);
  const [graphReady, setGraphReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      if (!fgRef.current) return;
      
      // Validate data
      if (!nodes || !links || nodes.length === 0) {
        throw new Error('No graph data provided');
      }

      // Configure graph physics
      fgRef.current.d3Force('charge').strength(-100);
      fgRef.current.d3Force('link').distance(100);
      
      // Add bloom effect for better visualization
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, 0.4, 0.85
      );
      fgRef.current.postProcessingComposer().addPass(bloomPass);

      setGraphReady(true);
    } catch (err) {
      setError(err.message);
      console.error('Graph initialization error:', err);
    }
  }, [nodes, links]);

  if (error) {
    return <div className="graph-error">Graph Error: {error}</div>;
  }

  if (!graphReady) {
    return <div className="graph-loading">Initializing 3D visualization...</div>;
  }

  return (
    <div className="graph-container">
      <ForceGraph3D
        ref={fgRef}
        graphData={{ nodes, links }}
        nodeLabel="name"
        nodeAutoColorBy="type"
        nodeColor={node => node.color || '#666'}
        linkColor={() => 'rgba(200,200,200,0.5)'}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.25}
        linkDirectionalParticles={1}
        onNodeClick={onNodeClick}
        width={window.innerWidth * 0.9}
        height={window.innerHeight * 0.8}
      />
    </div>
  );
};

export default React.memo(DiseaseSymptomGraph);