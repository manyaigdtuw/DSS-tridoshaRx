/* ------------------------------------------------------------
   DiseaseCategorySearch.jsx
   ------------------------------------------------------------
   UI:
   ── FilterBar (already built)  → calls onCategoryFilter
   ── List of symptom check‑boxes (multi‑select)
   ── “Diagnose” button
   ── Result cards (same look as ResultsDisplay)
   ------------------------------------------------------------ */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import FilterBar from './FilterBar';
import './DiseaseCategorySearch.css';               // tiny extra CSS (see below)
import ResultCard from './ResultsDisplay';               // re‑use the card UI
import PDFExportButton from './PDFExportButton';

const API_BASE_URL = 'https://dss-tridosharx.onrender.com';

const DiseaseCategorySearch = () => {
  // ----- 1️⃣ State -------------------------------------------------------
  const [filters, setFilters] = useState({
    categorytype_ids: [],
    category_ids: [],
    subcategory_ids: [],
    tertiary_ids: [],
  });

  const [diseases, setDiseases] = useState([]);          // [{disease_id, disease, symptoms:[{symptom_id,name}] }]
  const [uniqueSymptoms, setUniqueSymptoms] = useState([]); // [{symptom_id, name}]
  const [selectedSymptomIds, setSelectedSymptomIds] = useState([]); // array of ids
  const [diagnosis, setDiagnosis] = useState(null);      // {disease, matchCount, total}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ----- 2️⃣ Fetch diseases whenever filter changes -----------------------
  const fetchDiseases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await axios.get(`${API_BASE_URL}/api/diseases/by-category`, {
        params: filters,
      });
      const fetched = resp.data; // array of disease objects

      // Store
      setDiseases(fetched);

      // Build the union of all symptoms
      const symptomMap = {};
      fetched.forEach(d => {
        d.symptoms.forEach(s => {
          symptomMap[s.symptom_id] = s;               // deduplicate by id
        });
      });
      setUniqueSymptoms(Object.values(symptomMap).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      console.error(e);
      setError('Failed to load diseases');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDiseases();
  }, [fetchDiseases]);

  // ----- 3️⃣ Checkbox handling --------------------------------------------
  const toggleSymptom = (sid) => {
    setSelectedSymptomIds(prev =>
      prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
    );
  };

  // ----- 4️⃣ Diagnose -------------------------------------------------------
  const diagnose = () => {
  // For every disease calculate how many of the selected symptoms appear
  const matches = diseases.map(d => {
    const diseaseSymIds = d.symptoms.map(s => s.symptom_id);
    const hitCount = selectedSymptomIds.filter(id => diseaseSymIds.includes(id)).length;
    return { disease: d, hitCount };
  });

  // Find the highest hit count
  const maxHit = Math.max(...matches.map(m => m.hitCount));
  const best = matches.filter(m => m.hitCount === maxHit && maxHit > 0);

  // If nothing matches we still keep the empty result (user can see "0/…")
  setDiagnosis({
    results: best,
    selectedCount: selectedSymptomIds.length,
  });
};


  // ----- 5️⃣ UI ------------------------------------------------------------
  return (
    <div className="disease-cat-search">
      <h2>Disease Search by Category</h2>

      {/* ---------- Filter bar (already built) ------------- */}
      <FilterBar onCategoryFilter={setFilters} />

      {/* ---------- Loading / error ------------------------ */}
      {loading && <p className="info">Loading diseases …</p>}
      {error && <p className="error">{error}</p>}

      {/* ---------- Symptom checklist (multi‑checkbox) ---- */}
      {/* ---------- Symptom checklist (multi‑checkbox) ---- */}
{uniqueSymptoms.length > 0 && (
  <div className="symptom-checklist">
    <h3>Select Symptoms</h3>
    <div className="checkbox-grid">
      {uniqueSymptoms.map(sym => (
        <label key={sym.symptom_id} className="sym-checkbox">
          <input
            type="checkbox"
            checked={selectedSymptomIds.includes(sym.symptom_id)}
            onChange={() => toggleSymptom(sym.symptom_id)}
          />
          {sym.name}
        </label>
      ))}
    </div>

 <button
      className="diagnose-btn"
      onClick={diagnose}
      disabled={!selectedSymptomIds.length}
    >
      Diagnose
    </button>
  </div>
)}
      {/* ---------- Diagnosis result ----------------------- */}
      {diagnosis && (
        <div className="diagnosis-results">
          <h3>Most probable disease{diagnosis.results.length > 1 ? 's' : ''}</h3>
          <div className="cards-wrapper">
            {diagnosis.results.map(({ disease, hitCount }) => (
              <ResultCard
                key={disease.disease_id}
                disease={disease}
                matchInfo={`${hitCount}/${diagnosis.selectedCount} symptoms matched`}
              />
            ))}
          </div>
          {/* PDF export – we reuse the same component the app already has */}
          <PDFExportButton
            results={diagnosis.results.map(r => r.disease)}
            userName={localStorage.getItem('userName')}
          />
        </div>
      )}
    </div>
  );
};

export default DiseaseCategorySearch;