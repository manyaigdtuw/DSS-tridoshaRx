import React, { useState, useEffect } from 'react';
import axios from 'axios';
// modern multi-select with search!
import { MultiSelect } from "react-multi-select-component";
import './SearchBar.css';

const API_BASE_URL = "http://localhost:5000";

// Helper for select options
const mapOptions = (list, labelKey = "name", valueKey = "id") =>
  list.map(item => ({
    label: item[labelKey],
    value: item[valueKey],
    raw: item,
  }));

export default function FilterBar({ onCategoryFilter }) {
  // Raw data
  const [categoryTypes, setCategoryTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [tertiaryCategories, setTertiaryCategories] = useState([]);

  // For selections (arrays for multi-select)
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [selectedTertiaries, setSelectedTertiaries] = useState([]);

  // Fetch category TYPES (top level)
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/categorytypes`)
      .then(res => setCategoryTypes(res.data))
      .catch(console.error);
  }, []);

  // Fetch CATEGORIES whenever types change
  useEffect(() => {
    if (!selectedTypes.length) {
      setCategories([]);
      setSelectedCategories([]);
      return;
    }
    const promises = selectedTypes.map(type =>
      axios.get(`${API_BASE_URL}/api/categories`, { params: { categorytype_id: type.value } })
    );
    Promise.all(promises)
      .then(results => {
        // flatten arrays of categories and dedupe by id
        const allCats = [].concat(...results.map(r => r.data));
        const deduped = Object.values(allCats.reduce((acc, cur) => {
          acc[cur.id] = cur; return acc;
        }, {}));
        setCategories(deduped);
        // Remove previously selected if not present in new list
        setSelectedCategories(scats => scats.filter(sel =>
          deduped.some(c => c.id === sel.value)
        ));
      }).catch(console.error);
  }, [selectedTypes]);

  // SUBCATEGORIES fetch—on categories change
  useEffect(() => {
    if (!selectedCategories.length) {
      setSubcategories([]);
      setSelectedSubcategories([]);
      return;
    }
    const promises = selectedCategories.map(cat =>
      axios.get(`${API_BASE_URL}/api/subcategories`, { params: { category_id: cat.value } })
    );
    Promise.all(promises)
      .then(results => {
        const allSubs = [].concat(...results.map(r => r.data));
        const deduped = Object.values(allSubs.reduce((acc, cur) => { acc[cur.id] = cur; return acc; }, {}));
        setSubcategories(deduped);
        setSelectedSubcategories(ssubs => ssubs.filter(sel =>
          deduped.some(s => s.id === sel.value)
        ));
      }).catch(console.error);
  }, [selectedCategories]);

  // TERTIARIES fetch—on subcategories change
  useEffect(() => {
    if (!selectedSubcategories.length) {
      setTertiaryCategories([]);
      setSelectedTertiaries([]);
      return;
    }
    const promises = selectedSubcategories.map(sub =>
      axios.get(`${API_BASE_URL}/api/tertiarycategories`, { params: { subcategory_id: sub.value } })
    );
    Promise.all(promises)
      .then(results => {
        const allTer = [].concat(...results.map(r => r.data));
        const deduped = Object.values(allTer.reduce((acc, cur) => { acc[cur.id] = cur; return acc; }, {}));
        setTertiaryCategories(deduped);
        setSelectedTertiaries(ster => ster.filter(sel =>
          deduped.some(t => t.id === sel.value)
        ));
      }).catch(console.error);
  }, [selectedSubcategories]);

  // Whenever any selection changes, push filters up
  useEffect(() => {
    onCategoryFilter({
      categorytype_ids: selectedTypes.map(o => o.value),
      category_ids: selectedCategories.map(o => o.value),
      subcategory_ids: selectedSubcategories.map(o => o.value),
      tertiary_ids: selectedTertiaries.map(o => o.value),
    });
    // eslint-disable-next-line
  }, [selectedTypes, selectedCategories, selectedSubcategories, selectedTertiaries]);

  // Style controls for the MultiSelect (nicer, but simple for now)
  const multiSelectStyle = { minWidth: 160, maxWidth: 320, margin: "6px 0" };

  return (
    <div className="filter-bar">
      {/* Category Type Multi-select */}
      <div className="filter-section" style={{ minWidth: 170 }}>
        <label>Classifier</label>
        <MultiSelect
          options={mapOptions(categoryTypes, "type_name", "id")}
          value={selectedTypes}
          onChange={setSelectedTypes}
          labelledBy="Select Type"
          hasSelectAll={true}
          overrideStrings={{ selectSomeItems: "Select Type(s)..." }}
          isLoading={categoryTypes.length === 0}
          style={multiSelectStyle}
        />
      </div>
      {/* Category Multi-select */}
      <div className="filter-section" style={{ minWidth: 170 }}>
        <label>Category level 1</label>
        <MultiSelect
          options={mapOptions(categories, "category_name", "id")}
          value={selectedCategories}
          onChange={setSelectedCategories}
          labelledBy="Select Category"
          hasSelectAll={true}
          overrideStrings={{ selectSomeItems: "Select Category(s)..." }}
          isLoading={selectedTypes.length > 0 && categories.length === 0}
          style={multiSelectStyle}
        />
      </div>
      {/* Subcategory Multi-select */}
      <div className="filter-section" style={{ minWidth: 170 }}>
        <label>category level 2</label>
        <MultiSelect
          options={mapOptions(subcategories, "subcategory_name", "id")}
          value={selectedSubcategories}
          onChange={setSelectedSubcategories}
          labelledBy="Select Subcategory"
          hasSelectAll={true}
          overrideStrings={{ selectSomeItems: "Select Subcategory(s)..." }}
          isLoading={selectedCategories.length > 0 && subcategories.length === 0}
          style={multiSelectStyle}
        />
      </div>
      {/* Tertiary Multi-select */}
      <div className="filter-section" style={{ minWidth: 170 }}>
        <label>category level 3</label>
        <MultiSelect
          options={mapOptions(tertiaryCategories, "tertiary_name", "id")}
          value={selectedTertiaries}
          onChange={setSelectedTertiaries}
          labelledBy="Select Tertiary"
          hasSelectAll={true}
          overrideStrings={{ selectSomeItems: "Select Tertiary(s)..." }}
          isLoading={selectedSubcategories.length > 0 && tertiaryCategories.length === 0}
          style={multiSelectStyle}
        />
      </div>
    </div>
  );
}
