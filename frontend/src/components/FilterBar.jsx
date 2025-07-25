import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SearchBar.css';

const API_BASE_URL = "http://localhost:5000";

export default function FilterBar({ onCategoryFilter }) {
  const [categoryTypes, setCategoryTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [tertiaryCategories, setTertiaryCategories] = useState([]);
  
  const [selectedType, setSelectedType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedTertiary, setSelectedTertiary] = useState("");

  
  useEffect(() => {
    const fetchCategoryTypes = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/categorytypes`);
        setCategoryTypes(response.data);
      } catch (error) {
        console.error("Error fetching category types:", error);
      }
    };
    fetchCategoryTypes();
  }, []);

  
  useEffect(() => {
    if (!selectedType) {
      setCategories([]);
      setSelectedCategory("");
      return;
    }
    
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/categories`, {
          params: { categorytype_id: selectedType }
        });
        setCategories(response.data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, [selectedType]);

  
  useEffect(() => {
    if (!selectedCategory) {
      setSubcategories([]);
      setSelectedSubcategory("");
      return;
    }
    
    const fetchSubcategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/subcategories`, {
          params: { category_id: selectedCategory }
        });
        setSubcategories(response.data);
      } catch (error) {
        console.error("Error fetching subcategories:", error);
      }
    };
    fetchSubcategories();
  }, [selectedCategory]);

  
  useEffect(() => {
    if (!selectedSubcategory) {
      setTertiaryCategories([]);
      setSelectedTertiary("");
      return;
    }
    
    const fetchTertiaryCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/tertiarycategories`, {
          params: { subcategory_id: selectedSubcategory }
        });
        setTertiaryCategories(response.data);
      } catch (error) {
        console.error("Error fetching tertiary categories:", error);
      }
    };
    fetchTertiaryCategories();
  }, [selectedSubcategory]);

  
  useEffect(() => {
    const filters = {};
if (selectedType) filters.categorytype_ids = [selectedType];
if (selectedCategory) filters.category_ids = [selectedCategory];
if (selectedSubcategory) filters.subcategory_ids = [selectedSubcategory];
if (selectedTertiary) filters.tertiary_ids = [selectedTertiary];

onCategoryFilter(filters);
  }, [selectedType, selectedCategory, selectedSubcategory, selectedTertiary]);

  return (
    <div className="filter-bar">
      {/* Category Type Dropdown */}
      <div className="filter-section">
        <label>Type:</label>
        <select 
          value={selectedType} 
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="">All Types</option>
          {categoryTypes.map(type => (
            <option key={type.id} value={type.id}>
              {type.type_name}
            </option>
          ))}
        </select>
      </div>

      {/* Category Dropdown (only shown if type is selected) */}
      {selectedType && (
        <div className="filter-section">
          <label>Category:</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.category_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Subcategory Dropdown (only shown if category is selected) */}
      {selectedCategory && (
        <div className="filter-section">
          <label>Subcategory:</label>
          <select 
            value={selectedSubcategory} 
            onChange={(e) => setSelectedSubcategory(e.target.value)}
          >
            <option value="">All Subcategories</option>
            {subcategories.map(subcategory => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.subcategory_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tertiary Dropdown (only shown if subcategory is selected) */}
      {selectedSubcategory && (
        <div className="filter-section">
          <label>Tertiary:</label>
          <select 
            value={selectedTertiary} 
            onChange={(e) => setSelectedTertiary(e.target.value)}
          >
            <option value="">All Tertiary</option>
            {tertiaryCategories.map(tertiary => (
              <option key={tertiary.id} value={tertiary.id}>
                {tertiary.tertiary_name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}