import express from 'express';
import pool from './database.js';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import 'dotenv/config';


import { authenticateToken } from './authMiddleware.js';
const app = express();
app.use(cors());  
app.use(express.json());



const JWT_SECRET = 'ihopeyoudontmindlookingatthis';




app.get('/api/map-symptoms', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ds.disease_id, ds.symptom_id 
      FROM DiseaseSymptoms ds
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching symptom mappings:', err);
    res.status(500).json({ error: "Failed to fetch symptom mappings" });
  }
});


app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const result = await pool.query('SELECT user_id, email, full_name, role FROM Users ORDER BY role, email');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});


app.put('/api/users/role', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { user_id, role } = req.body;
  
 
  if (user_id === req.user.user_id) {
    return res.status(403).json({ error: 'Cannot modify your own role' });
  }

  try {
    await pool.query('UPDATE Users SET role = $1 WHERE user_id = $2', [role, user_id]);
    res.json({ message: "Role updated successfully" });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ error: "Failed to update role" });
  }
});


// Add to your server.js
app.get('/api/symptom-suggestions', async (req, res) => {
  const { q } = req.query;
  try {
    const result = await pool.query(
      'SELECT symptom_id, name FROM Symptoms WHERE LOWER(name) LIKE $1 ORDER BY name LIMIT 10',
      [`%${(q || '').toLowerCase()}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching symptom suggestions:', err);
    res.status(500).json({ error: "Failed to fetch symptom suggestions" });
  }
});


// Promote existing user to admin/deo (admin only)
app.put('/api/users/promote', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({ error: 'Email and role are required' });
  }

  try {
    
    const userCheck = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    await pool.query('UPDATE Users SET role = $1 WHERE email = $2', [role, email]);
    res.json({ message: "User role updated successfully" });
  } catch (err) {
    console.error('Error promoting user:', err);
    res.status(500).json({ error: "Failed to promote user" });
  }
});

app.post('/api/register', async (req, res) => {
  const { email, password, full_name, role = 'user' } = req.body;

  
  if (role === 'admin' || role === 'deo') {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(403).json({ error: 'Admin privileges required to create admin/DEO accounts' });
    }

    try {
      const user = jwt.verify(token, JWT_SECRET);
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admin can create admin/DEO accounts' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
  }

  try {
   
    const emailCheck = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO Users (email, password, full_name, role) VALUES ($1, $2, $3, $4)',
      [email, hashedPassword, full_name, role]
    );
    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});


app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token, 
      user: { 
        full_name: user.full_name, 
        email: user.email,
        role: user.role 
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get('/api/check-role', authenticateToken, (req, res) => {
  res.json({ role: req.user.role });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM Users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, user: { full_name: user.full_name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});



app.get('/api/diseases', async (req, res) => {
  try {
    const result = await pool.query('SELECT disease_id, name FROM Diseases');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching diseases:', err);
    res.status(500).json({ error: "Failed to fetch diseases" });
  }
});

app.get('/api/symptoms', async (req, res) => {
  try {
    const result = await pool.query('SELECT symptom_id, name FROM Symptoms');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch symptoms" });
  }
});

app.get('/api/medicines', async (req, res) => {
  try {
    const result = await pool.query('SELECT medicine_id, name FROM Medicines');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch medicines" });
  }
});

app.get('/api/lab-tests', async (req, res) => {
  try {
    const result = await pool.query('SELECT lab_id, name FROM LabDiagnoses');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch lab tests" });
  }
});

app.get('/api/procedures', async (req, res) => {
  try {
    const result = await pool.query('SELECT procedure_id, name FROM Procedures');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch procedures" });
  }
});

// Get all lifestyle recommendations
app.get('/api/lifestyle-recommendations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lifestyle_recommendations ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch lifestyle recommendations" });
  }
});

// mapping api's cutus 


app.post('/api/map-lifestyle', async (req, res) => {
  const { disease_id, lifestyle_ids } = req.body;
  try {
    for (const lifestyle_id of lifestyle_ids) {
      await pool.query(
        'INSERT INTO disease_lifestyle (disease_id, lifestyle_id) VALUES ($1, $2)',
        [disease_id, lifestyle_id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to map lifestyle recommendations" });
  }
});


app.post('/api/map-symptoms', async (req, res) => {
  const { disease_id, symptom_ids } = req.body;
  try {
    for (const symptom_id of symptom_ids) {
      await pool.query(
        'INSERT INTO DiseaseSymptoms (disease_id, symptom_id) VALUES ($1, $2)',
        [disease_id, symptom_id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to map symptoms" });
  }
});

app.post('/api/map-medicines', async (req, res) => {
  const { disease_id, medicine_ids } = req.body;
  try {
    for (const medicine_id of medicine_ids) {
      await pool.query(
        'INSERT INTO DiseaseMedicines (disease_id, medicine_id) VALUES ($1, $2)',
        [disease_id, medicine_id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to map medicines" });
  }
});

app.post('/api/map-lab-tests', async (req, res) => {
  const { disease_id, lab_ids } = req.body;
  try {
    for (const lab_id of lab_ids) {
      await pool.query(
        'INSERT INTO DiseaseLabDiagnoses (disease_id, lab_id) VALUES ($1, $2)',
        [disease_id, lab_id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to map lab tests" });
  }
});

app.post('/api/map-procedures', async (req, res) => {
  const { disease_id, procedure_ids } = req.body;
  try {
    for (const procedure_id of procedure_ids) {
      await pool.query(
        'INSERT INTO DiseaseProcedures (disease_id, procedure_id) VALUES ($1, $2)',
        [disease_id, procedure_id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to map procedures" });
  }
});

app.get('/api/diseases/:id/mappings', async (req, res) => {
  const { id } = req.params;
  try {
    const [symptoms, medicines, labTests, procedures] = await Promise.all([
      pool.query('SELECT s.symptom_id, s.name FROM DiseaseSymptoms ds JOIN Symptoms s ON ds.symptom_id = s.symptom_id WHERE ds.disease_id = $1', [id]),
      pool.query('SELECT m.medicine_id, m.name FROM DiseaseMedicines dm JOIN Medicines m ON dm.medicine_id = m.medicine_id WHERE dm.disease_id = $1', [id]),
      pool.query('SELECT l.lab_id, l.name FROM DiseaseLabDiagnoses dld JOIN LabDiagnoses l ON dld.lab_id = l.lab_id WHERE dld.disease_id = $1', [id]),
      pool.query('SELECT p.procedure_id, p.name FROM DiseaseProcedures dp JOIN Procedures p ON dp.procedure_id = p.procedure_id WHERE dp.disease_id = $1', [id])
    ]);
    
    res.json({
      symptoms: symptoms.rows,
      medicines: medicines.rows,
      labTests: labTests.rows,
      procedures: procedures.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch mappings" });
  }
});

app.get('/api/count/diseases', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM Diseases');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: "Failed to count diseases" });
  }
});

app.get('/api/count/symptoms', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM Symptoms');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: "Failed to count symptoms" });
  }
});

app.get('/api/count/medicines', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM Medicines');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: "Failed to count medicines" });
  }
});

app.get('/api/count/lab-tests', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM LabDiagnoses');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: "Failed to count lab tests" });
  }
});

app.get('/api/count/procedures', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM Procedures');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: "Failed to count procedures" });
  }
});

app.get('/api/count/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: "Failed to count users" });
  }
});


app.get('/api/count/lifestyle', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM lifestyle_recommendations');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Detailed error counting lifestyle recommendations:', {
      error: err.message,
      stack: err.stack,
      query: err.query,
      parameters: err.parameters
    });
    res.status(500).json({ 
      error: "Failed to count lifestyle recommendations",
      details: err.message 
    });
  }
});

app.get('/api/export-mappings', async (req, res) => {
  try {
    // Query to get all disease mappings
    const query = `
      SELECT 
        d.name AS disease,
        ARRAY_TO_STRING(ARRAY(
          SELECT s.name FROM DiseaseSymptoms ds
          JOIN Symptoms s ON ds.symptom_id = s.symptom_id
          WHERE ds.disease_id = d.disease_id
        ), ', ') AS symptoms,
        ARRAY_TO_STRING(ARRAY(
          SELECT m.name FROM DiseaseMedicines dm
          JOIN Medicines m ON dm.medicine_id = m.medicine_id
          WHERE dm.disease_id = d.disease_id
        ), ', ') AS medicines,
        ARRAY_TO_STRING(ARRAY(
          SELECT l.name FROM DiseaseLabDiagnoses dld
          JOIN LabDiagnoses l ON dld.lab_id = l.lab_id
          WHERE dld.disease_id = d.disease_id
        ), ', ') AS lab_tests,
        ARRAY_TO_STRING(ARRAY(
          SELECT p.name FROM DiseaseProcedures dp
          JOIN Procedures p ON dp.procedure_id = p.procedure_id
          WHERE dp.disease_id = d.disease_id
        ), ', ') AS procedures,
        ARRAY_TO_STRING(ARRAY(
          SELECT lr.name FROM disease_lifestyle dl
          JOIN lifestyle_recommendations lr ON dl.lifestyle_id = lr.lifestyle_id
          WHERE dl.disease_id = d.disease_id
        ), ', ') AS lifestyle_recommendations
      FROM Diseases d
      ORDER BY d.name
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error exporting mappings:', err);
    res.status(500).json({ error: "Failed to export mappings" });
  }
});



// Get all category types with their hierarchy
app.get('/api/category-hierarchy', async (req, res) => {
  try {
    // Get all category types
    const categoryTypes = await pool.query('SELECT id, type_name FROM categorytype ORDER BY type_name');
    
    // For each category type, get its categories
    const categoriesWithHierarchy = await Promise.all(
      categoryTypes.rows.map(async (type) => {
        const categories = await pool.query(
          'SELECT id, category_name FROM category WHERE categorytype_id = $1 ORDER BY category_name',
          [type.id]
        );
        
        // For each category, get its subcategories
        const categoriesWithSub = await Promise.all(
          categories.rows.map(async (category) => {
            const subcategories = await pool.query(
              'SELECT id, subcategory_name FROM subcategory WHERE category_id = $1 ORDER BY subcategory_name',
              [category.id]
            );
            
            // For each subcategory, get its tertiary categories
            const subcategoriesWithTertiary = await Promise.all(
              subcategories.rows.map(async (subcategory) => {
                const tertiaryCategories = await pool.query(
                  'SELECT id, tertiary_name FROM tertiarycategory WHERE subcategory_id = $1 ORDER BY tertiary_name',
                  [subcategory.id]
                );
                return {
                  ...subcategory,
                  tertiaryCategories: tertiaryCategories.rows
                };
              })
            );
            
            return {
              ...category,
              subcategories: subcategoriesWithTertiary
            };
          })
        );
        
        return {
          ...type,
          categories: categoriesWithSub
        };
      })
    );
    
    res.json(categoriesWithHierarchy);
  } catch (err) {
    console.error('Error fetching category hierarchy:', err);
    res.status(500).json({ error: "Failed to fetch category hierarchy" });
  }
});

// Enhanced search endpoint with category filters & AND Condition
app.get('/api/search-enhanced', async (req, res) => {
  console.log("Incoming search request with params:", req.query);

  const getQueryArray = (req, key) => {
    const raw = req.query[key] || req.query[`${key}[]`];
    if (!raw) return [];
    return Array.isArray(raw) ? raw : raw.split(',').filter(Boolean);
  };

  try {
    const terms = getQueryArray(req, 'term').map(t => t.toLowerCase().trim()).filter(Boolean);
    if (terms.length === 0) {
      return res.status(400).json({ error: "Search term is required" });
    }

    const catTypeArr = getQueryArray(req, 'categorytype_ids').map(Number);
    const catArr     = getQueryArray(req, 'category_ids').map(Number);
    const subArr     = getQueryArray(req, 'subcategory_ids').map(Number);
    const tertArr    = getQueryArray(req, 'tertiary_ids').map(Number);

    // Logging parsed input
    console.log("Parsed category filters:", {
      categorytype_ids: catTypeArr,
      category_ids: catArr,
      subcategory_ids: subArr,
      tertiary_ids: tertArr
    });

    const searchPatterns = terms.map(t => `%${t}%`);
    const symptomConditions = searchPatterns.map((_, i) => `LOWER(s.name) LIKE $${i + 1}`).join(' OR ');
    const requiredMatchCount = terms.length;
    const params = [...searchPatterns];

    let categoryJoin = '';
    const categoryClauses = [];

    if (catTypeArr.length || catArr.length || subArr.length || tertArr.length) {
      categoryJoin = `JOIN diseasecategorymapping dcm ON d.disease_id = dcm.disease_id`;

      if (catTypeArr.length) {
        params.push(catTypeArr);
        categoryClauses.push(`dcm.categorytype_id = ANY($${params.length}::int[])`);
      }
      if (catArr.length) {
        params.push(catArr);
        categoryClauses.push(`dcm.category_id = ANY($${params.length}::int[])`);
      }
      if (subArr.length) {
        params.push(subArr);
        categoryClauses.push(`dcm.subcategory_id = ANY($${params.length}::int[])`);
      }
      if (tertArr.length) {
        params.push(tertArr);
        categoryClauses.push(`dcm.tertiary_id = ANY($${params.length}::int[])`);
      }
    }

    const categoryFilter = categoryClauses.length > 0 ? `AND ${categoryClauses.join(' AND ')}` : '';

    const query = `
      SELECT
        d.disease_id,
        d.name AS disease,
        ARRAY(
          SELECT s.name
          FROM diseasesymptoms ds
          JOIN symptoms s ON ds.symptom_id = s.symptom_id
          WHERE ds.disease_id = d.disease_id
        ) AS symptoms
      FROM diseases d
      ${categoryJoin}
      WHERE (
        SELECT COUNT(DISTINCT s.name)
        FROM diseasesymptoms ds
        JOIN symptoms s ON ds.symptom_id = s.symptom_id
        WHERE ds.disease_id = d.disease_id
        AND (${symptomConditions})
      ) = ${requiredMatchCount}
      ${categoryFilter}
      ORDER BY d.name
    `;

    // Final debug log
    console.log("----------- FINAL QUERY LOG -----------");
    console.log("Search term(s):", terms);
    console.log("Symptom filter SQL:", symptomConditions);
    console.log("Category filters:", categoryClauses);
    console.log("Params:", params);
    console.log("Final SQL Query:\n", query);
    console.log("---------------------------------------");

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error('Error in enhanced search:', {
      error: err.message,
      stack: err.stack,
      query: req.query
    });
    res.status(500).json({ error: "Failed to perform search", details: err.message });
  }
});

// Partial match search endpoint (matches if at least one symptom is present)
app.get('/api/search-partial', async (req, res) => {
  console.log("Incoming partial search request with params:", req.query);
  
  const getQueryArray = (req, key) => {
    const raw = req.query[key] || req.query[`${key}[]`];
    if (!raw) return [];
    return Array.isArray(raw) ? raw : raw.split(',').filter(Boolean);
  };
  
  try {
    const terms = getQueryArray(req, 'term').map(t => t.toLowerCase().trim()).filter(Boolean);
    if (terms.length === 0) {
      return res.status(400).json({ error: "Search term is required" });
    }
    
    const catTypeArr = getQueryArray(req, 'categorytype_ids').map(Number);
    const catArr = getQueryArray(req, 'category_ids').map(Number);
    const subArr = getQueryArray(req, 'subcategory_ids').map(Number);
    const tertArr = getQueryArray(req, 'tertiary_ids').map(Number);
    
    // Logging parsed input
    console.log("Parsed category filters:", {
      categorytype_ids: catTypeArr,
      category_ids: catArr,
      subcategory_ids: subArr,
      tertiary_ids: tertArr
    });
    
    const searchPatterns = terms.map(t => `%${t}%`);
    const symptomConditions = searchPatterns.map((_, i) => `LOWER(s.name) LIKE $${i + 1}`).join(' OR ');
    
    const params = [...searchPatterns];
    let categoryJoin = '';
    const categoryClauses = [];
    
    if (catTypeArr.length || catArr.length || subArr.length || tertArr.length) {
      categoryJoin = `JOIN diseasecategorymapping dcm ON d.disease_id = dcm.disease_id`;
      if (catTypeArr.length) {
        params.push(catTypeArr);
        categoryClauses.push(`dcm.categorytype_id = ANY($${params.length}::int[])`);
      }
      if (catArr.length) {
        params.push(catArr);
        categoryClauses.push(`dcm.category_id = ANY($${params.length}::int[])`);
      }
      if (subArr.length) {
        params.push(subArr);
        categoryClauses.push(`dcm.subcategory_id = ANY($${params.length}::int[])`);
      }
      if (tertArr.length) {
        params.push(tertArr);
        categoryClauses.push(`dcm.tertiary_id = ANY($${params.length}::int[])`);
      }
    }
    
    const categoryFilter = categoryClauses.length > 0 ? `AND ${categoryClauses.join(' AND ')}` : '';
    
    const query = `
      SELECT
        d.disease_id,
        d.name AS disease,
        ARRAY(
          SELECT s.name
          FROM diseasesymptoms ds
          JOIN symptoms s ON ds.symptom_id = s.symptom_id
          WHERE ds.disease_id = d.disease_id
        ) AS symptoms
      FROM diseases d
      ${categoryJoin}
      WHERE (
        SELECT COUNT(DISTINCT s.name)
        FROM diseasesymptoms ds
        JOIN symptoms s ON ds.symptom_id = s.symptom_id
        WHERE ds.disease_id = d.disease_id
        AND (${symptomConditions})
      ) >= 1
      ${categoryFilter}
      ORDER BY d.name
    `;
    
    // Final debug log
    console.log("----------- FINAL PARTIAL QUERY LOG -----------");
    console.log("Search term(s):", terms);
    console.log("Symptom filter SQL:", symptomConditions);
    console.log("Category filters:", categoryClauses);
    console.log("Params:", params);
    console.log("Final SQL Query:\n", query);
    console.log("---------------------------------------");
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in partial search:', {
      error: err.message,
      stack: err.stack,
      query: req.query
    });
    res.status(500).json({ error: "Failed to perform partial search", details: err.message });
  }
});

// Get all category types 
app.get('/api/categorytypes', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, type_name FROM categorytype ORDER BY type_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch category types" });
  }
});

// Get categories under a category type
app.get('/api/categories', async (req, res) => {
  const { categorytype_id } = req.query;
  if (!categorytype_id) return res.status(400).json({ error: 'categorytype_id required' });
  try {
    const result = await pool.query(
      'SELECT id, category_name FROM category WHERE categorytype_id = $1 ORDER BY category_name',
      [categorytype_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Get subcategories under a category
app.get('/api/subcategories', async (req, res) => {
  let { category_id } = req.query;  // Accept as string (e.g., "1,2,3") or array
  if (!category_id) return res.status(400).json({ error: 'category_id required' });

  // Handle as array
  if (!Array.isArray(category_id)) category_id = category_id.split(',').map(id => parseInt(id.trim())).filter(Boolean);
  if (category_id.length === 0) return res.status(400).json({ error: 'Invalid category_ids' });

  try {
    const result = await pool.query(
      'SELECT id, subcategory_name FROM subcategory WHERE category_id = ANY($1::int[]) ORDER BY subcategory_name',
      [category_id]  // Pass array directly to PostgreSQL's ANY()
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});


// Get tertiary categories under a subcategory (optional)
app.get('/api/tertiarycategories', async (req, res) => {
  let { subcategory_id } = req.query;  // Accept as string (e.g., "1,2,3") or array
  if (!subcategory_id) return res.status(400).json({ error: 'subcategory_id required' });

  // Handle as array
  if (!Array.isArray(subcategory_id)) subcategory_id = subcategory_id.split(',').map(id => parseInt(id.trim())).filter(Boolean);
  if (subcategory_id.length === 0) return res.status(400).json({ error: 'Invalid subcategory_ids' });

  try {
    const result = await pool.query(
      'SELECT id, tertiary_name FROM tertiarycategory WHERE subcategory_id = ANY($1::int[]) ORDER BY tertiary_name',
      [subcategory_id]  // Pass array directly to ANY()
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tertiary categories" });
  }
});


// Get diseases by selected path
app.get('/api/categories', async (req, res) => {
  let { categorytype_id } = req.query;  // Accept as string (e.g., "1,2,3") or array
  if (!categorytype_id) return res.status(400).json({ error: 'categorytype_id required' });

  // Handle as array
  if (!Array.isArray(categorytype_id)) categorytype_id = categorytype_id.split(',').map(id => parseInt(id.trim())).filter(Boolean);
  if (categorytype_id.length === 0) return res.status(400).json({ error: 'Invalid categorytype_ids' });

  try {
    const result = await pool.query(
      'SELECT id, category_name FROM category WHERE categorytype_id = ANY($1::int[]) ORDER BY category_name',
      [categorytype_id]  // Pass array directly to ANY()
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});



const checkDuplicate = async (table, name) => {
  const result = await pool.query(`SELECT * FROM ${table} WHERE name ILIKE $1`, [name]);
  return result.rows.length > 0;
};

// new entry end point bbg <3
// Update the add-entry endpoint
app.post('/api/add-entry', async (req, res) => {
  const { type, name } = req.body;

  const tableMap = {
    symptom: 'symptoms',
    disease: 'diseases',
    medicine: 'medicines',
    labdiagnosis: 'labdiagnoses',
    procedure: 'procedures',
    lifestyle: 'lifestyle_recommendations'
  };

  const table = tableMap[type];

  if (!table) {
    return res.status(400).json({ error: 'Invalid entry type' });
  }

  try {
    const isDuplicate = await checkDuplicate(table, name);
    if (isDuplicate) {
      return res.status(409).json({ message: `${type} already exists` });
    }

    await pool.query(`INSERT INTO ${table} (name) VALUES ($1)`, [name]);
    res.status(201).json({ message: `${type} added successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add entry' });
  }
});

// ------------------------------------------------------------------
// GET /api/diseases/by-category
// Returns every disease that belongs to the supplied hierarchy
// (categorytype, category, subcategory, tertiary) together with
// an ARRAY of its symptom objects {symptom_id, name}.
// If no filter is given the whole catalogue is returned.
// ------------------------------------------------------------------
app.get('/api/diseases/by-category', async (req, res) => {
  const getQueryArray = (req, key) => {
    const raw = req.query[key] || req.query[`${key}[]`];
    if(!raw) return [];
    return Array.isArray(raw) ? raw : raw.split(',').filter(Boolean);
  };

  try {
    // ----- 1️⃣ parse filters -------------------------------------------------
    const catTypeArr = getQueryArray(req, 'categorytype_ids').map(Number);
    const catArr     = getQueryArray(req, 'category_ids').map(Number);
    const subArr     = getQueryArray(req, 'subcategory_ids').map(Number);
    const tertArr    = getQueryArray(req, 'tertiary_ids').map(Number);

    // ----- 2️⃣ build dynamic parts -------------------------------------------
    const params = [];
    let joinClause = '';
    const whereClauses = [];

    if (catTypeArr.length || catArr.length || subArr.length || tertArr.length) {
     Clause = `JOIN diseasecategorymapping dcm ON d.disease_id = dcm.disease_id`;
      if (catTypeArr.length) {
        params.push(catTypeArr);
        whereClauses.push(`dcm.categorytype_id = ANY($${params.length}::int[])`);
      }
      if (catArr.length) {
        params.push(catArr);
        whereClauses.push(`dcm.category_id = ANY($${params.length}::int[])`);
      }
      if (subArr.length) {
        params.push(subArr);
        whereClauses.push(`dcm.subcategory_id = ANY($${params.length}::int[])`);
      }
      if (tertArr.length) {
        params.push(tertArr);
        whereClauses.push(`dcm.tertiary_id = ANY($${params.length}::int[])`);
      }
    }

    const filterSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // ----- 3️⃣ final query ----------------------------------------------------
    const sql = `
      SELECT
        d.disease_id,
        d.name AS disease,
        ARRAY(
          SELECT json_build_object('symptom_id', s.symptom_id, 'name', s.name)
          FROM diseasesymptoms ds
          JOIN symptoms s ON ds.symptom_id = s.symptom_id
          WHERE ds.disease_id = d.disease_id
        ) AS symptoms
      FROM diseases d
      ${joinClause}
      ${filterSQL}
      ORDER BY d.name;
    `;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in /api/diseases/by-category:', err);
    res.status(500).json({ error: 'Failed to fetch diseases', details: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
