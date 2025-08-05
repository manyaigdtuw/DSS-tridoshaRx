import express from 'express';
import pool from './database.js';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import { authenticateToken } from './authMiddleware.js';
import { initializeRedisClient, closeRedisConnection, deleteCache } from './redis.js';
import { cacheMiddleware, rateLimitMiddleware } from './cacheMiddleware.js';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'ihopeyoudontmindlookingatthis';

// Initialize Redis
let redisInitialized = false;
try {
  await initializeRedisClient();
  redisInitialized = true;
  console.log('Redis initialized successfully');
} catch (err) {
  console.error('Redis initialization failed, continuing without Redis:', err);
}

// Cache invalidation helper
const invalidateRelatedCache = async (patterns) => {
  if (!redisInitialized) return;
  
  for (const pattern of patterns) {
    await deleteCache(pattern);
  }
};

// Apply rate limiting to sensitive endpoints
app.use('/api/login', rateLimitMiddleware(5, 60000));
app.use('/api/register', rateLimitMiddleware(10, 60000));
app.use('/api/search-enhanced', rateLimitMiddleware(50, 60000));
app.use('/api/search-partial', rateLimitMiddleware(50, 60000));

// Authentication and User Management Routes
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

    // Invalidate search cache since user count might affect search results
    await invalidateRelatedCache(['cache:/api/search*']);

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

// User Management Routes (Admin Only) - NO CACHING
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

// Core Data Routes - NO CACHING
app.get('/api/diseases', async (req, res) => {
  try {
    const result = await pool.query('SELECT disease_id, name FROM Diseases ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching diseases:', err);
    res.status(500).json({ error: "Failed to fetch diseases" });
  }
});

app.get('/api/symptoms', async (req, res) => {
  try {
    const result = await pool.query('SELECT symptom_id, name FROM Symptoms ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch symptoms" });
  }
});

app.get('/api/medicines', async (req, res) => {
  try {
    const result = await pool.query('SELECT medicine_id, name FROM Medicines ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch medicines" });
  }
});

app.get('/api/lab-tests', async (req, res) => {
  try {
    const result = await pool.query('SELECT lab_id, name FROM LabDiagnoses ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch lab tests" });
  }
});

app.get('/api/procedures', async (req, res) => {
  try {
    const result = await pool.query('SELECT procedure_id, name FROM Procedures ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch procedures" });
  }
});

app.get('/api/lifestyle-recommendations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lifestyle_recommendations ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch lifestyle recommendations" });
  }
});

// Symptom Suggestions - NO CACHING
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

// Category Hierarchy - NO CACHING
app.get('/api/category-hierarchy', async (req, res) => {
  try {
    const categoryTypes = await pool.query('SELECT id, type_name FROM categorytype ORDER BY type_name');
    
    const categoriesWithHierarchy = await Promise.all(
      categoryTypes.rows.map(async (type) => {
        const categories = await pool.query(
          'SELECT id, category_name FROM category WHERE categorytype_id = $1 ORDER BY category_name',
          [type.id]
        );

        const categoriesWithSub = await Promise.all(
          categories.rows.map(async (category) => {
            const subcategories = await pool.query(
              'SELECT id, subcategory_name FROM subcategory WHERE category_id = $1 ORDER BY subcategory_name',
              [category.id]
            );

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

// Category Routes - NO CACHING
app.get('/api/categorytypes', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, type_name FROM categorytype ORDER BY type_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch category types" });
  }
});

app.get('/api/categories', async (req, res) => {
  let { categorytype_id } = req.query;
  if (!categorytype_id) return res.status(400).json({ error: 'categorytype_id required' });

  if (!Array.isArray(categorytype_id)) {
    categorytype_id = categorytype_id.split(',').map(id => parseInt(id.trim())).filter(Boolean);
  }
  if (categorytype_id.length === 0) return res.status(400).json({ error: 'Invalid categorytype_ids' });

  try {
    const result = await pool.query(
      'SELECT id, category_name FROM category WHERE categorytype_id = ANY($1::int[]) ORDER BY category_name',
      [categorytype_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get('/api/subcategories', async (req, res) => {
  let { category_id } = req.query;
  if (!category_id) return res.status(400).json({ error: 'category_id required' });

  if (!Array.isArray(category_id)) {
    category_id = category_id.split(',').map(id => parseInt(id.trim())).filter(Boolean);
  }
  if (category_id.length === 0) return res.status(400).json({ error: 'Invalid category_ids' });

  try {
    const result = await pool.query(
      'SELECT id, subcategory_name FROM subcategory WHERE category_id = ANY($1::int[]) ORDER BY subcategory_name',
      [category_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

app.get('/api/tertiarycategories', async (req, res) => {
  let { subcategory_id } = req.query;
  if (!subcategory_id) return res.status(400).json({ error: 'subcategory_id required' });

  if (!Array.isArray(subcategory_id)) {
    subcategory_id = subcategory_id.split(',').map(id => parseInt(id.trim())).filter(Boolean);
  }
  if (subcategory_id.length === 0) return res.status(400).json({ error: 'Invalid subcategory_ids' });

  try {
    const result = await pool.query(
      'SELECT id, tertiary_name FROM tertiarycategory WHERE subcategory_id = ANY($1::int[]) ORDER BY tertiary_name',
      [subcategory_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tertiary categories" });
  }
});

// ONLY SEARCH ROUTES HAVE CACHING
app.get('/api/search-enhanced', cacheMiddleware(120), async (req, res) => {
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
    const catArr = getQueryArray(req, 'category_ids').map(Number);
    const subArr = getQueryArray(req, 'subcategory_ids').map(Number);
    const tertArr = getQueryArray(req, 'tertiary_ids').map(Number);

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

app.get('/api/search-partial', cacheMiddleware(120), async (req, res) => {
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

// Mapping Routes - NO CACHING
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

app.post('/api/map-symptoms', async (req, res) => {
  const { disease_id, symptom_ids } = req.body;
  try {
    for (const symptom_id of symptom_ids) {
      await pool.query(
        'INSERT INTO DiseaseSymptoms (disease_id, symptom_id) VALUES ($1, $2)',
        [disease_id, symptom_id]
      );
    }
    
    // Only invalidate search cache
    await invalidateRelatedCache([
      'cache:/api/search*'
    ]);
    
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
    
    // Only invalidate search cache
    await invalidateRelatedCache([
      'cache:/api/search*'
    ]);
    
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
    
    // Only invalidate search cache
    await invalidateRelatedCache([
      'cache:/api/search*'
    ]);
    
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
    
    // Only invalidate search cache
    await invalidateRelatedCache([
      'cache:/api/search*'
    ]);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to map procedures" });
  }
});

app.post('/api/map-lifestyle', async (req, res) => {
  const { disease_id, lifestyle_ids } = req.body;
  try {
    for (const lifestyle_id of lifestyle_ids) {
      await pool.query(
        'INSERT INTO disease_lifestyle (disease_id, lifestyle_id) VALUES ($1, $2)',
        [disease_id, lifestyle_id]
      );
    }
    
    // Only invalidate search cache
    await invalidateRelatedCache([
      'cache:/api/search*'
    ]);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to map lifestyle recommendations" });
  }
});

// Disease Mappings Route - NO CACHING
app.get('/api/diseases/:id/mappings', async (req, res) => {
  const { id } = req.params;
  try {
    const [symptoms, medicines, labTests, procedures, lifestyle] = await Promise.all([
      pool.query('SELECT s.symptom_id, s.name FROM DiseaseSymptoms ds JOIN Symptoms s ON ds.symptom_id = s.symptom_id WHERE ds.disease_id = $1', [id]),
      pool.query('SELECT m.medicine_id, m.name FROM DiseaseMedicines dm JOIN Medicines m ON dm.medicine_id = m.medicine_id WHERE dm.disease_id = $1', [id]),
      pool.query('SELECT l.lab_id, l.name FROM DiseaseLabDiagnoses dld JOIN LabDiagnoses l ON dld.lab_id = l.lab_id WHERE dld.disease_id = $1', [id]),
      pool.query('SELECT p.procedure_id, p.name FROM DiseaseProcedures dp JOIN Procedures p ON dp.procedure_id = p.procedure_id WHERE dp.disease_id = $1', [id]),
      pool.query('SELECT lr.lifestyle_id, lr.name FROM disease_lifestyle dl JOIN lifestyle_recommendations lr ON dl.lifestyle_id = lr.lifestyle_id WHERE dl.disease_id = $1', [id])
    ]);

    res.json({
      symptoms: symptoms.rows,
      medicines: medicines.rows,
      labTests: labTests.rows,
      procedures: procedures.rows,
      lifestyle: lifestyle.rows
    });
  } catch (err) {
    console.error('Error fetching disease mappings:', err);
    res.status(500).json({ error: "Failed to fetch mappings" });
  }
});

// Count Routes - NO CACHING
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

// Export Mappings - NO CACHING
app.get('/api/export-mappings', async (req, res) => {
  try {
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

// Add Entry Route with Cache Invalidation for Search Only
const checkDuplicate = async (table, name) => {
  const result = await pool.query(`SELECT * FROM ${table} WHERE name ILIKE $1`, [name]);
  return result.rows.length > 0;
};

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
    
    // Only invalidate search cache since new entries might affect search results
    await invalidateRelatedCache(['cache:/api/search*']);
    
    res.status(201).json({ message: `${type} added successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add entry' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await closeRedisConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await closeRedisConnection();
  process.exit(0);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (redisInitialized) {
    console.log('✅ Redis caching is active for search endpoints only');
  } else {
    console.log('⚠️  Running without Redis caching');
  }
});
