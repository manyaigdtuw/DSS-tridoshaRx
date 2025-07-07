import express from 'express';
import axios from 'axios';
import pool from './database.js';
import { authenticateToken } from './authMiddleware.js';

const router = express.Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const TABLE_SCHEMAS = {
  diseases: ['disease_id', 'name'],
  symptoms: ['symptom_id', 'name'],
  medicines: ['medicine_id', 'name'],
  procedures: ['procedure_id', 'name'],
  labdiagnoses: ['lab_id', 'name'],
  diseasesymptoms: ['disease_id', 'symptom_id'],
  diseasemedicines: ['disease_id', 'medicine_id'],
  diseaseprocedures: ['disease_id', 'procedure_id'],
  diseaselabdiagnoses: ['disease_id', 'lab_id']
};

router.post('/query', authenticateToken, async (req, res) => {
  console.log('\n=== New Chatbot Request ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    console.error('Invalid message format');
    return res.status(400).json({ error: "Message is required and must be a string" });
  }

  try {
    
    console.log('\n[1/3] Generating SQL with OpenRouter...');
    const sqlResponse = await axios.post(
      OPENROUTER_API_URL,
      {
        model : "openai/chatgpt-4o-latest",


        messages: [
          {
            role: "system",
            content: `You are a medical SQL expert. Generate queries ONLY for:
            ${Object.entries(TABLE_SCHEMAS).map(([table, cols]) => `${table}(${cols.join(', ')})`).join('\n')}
            Rules:
            1. Use explicit JOINs with proper foreign keys
            2. Never suggest non-existent columns
            3. Include LIMIT 5 for safety`
          },
          { role: "user", content: message }
        ],
        temperature: 0.3,
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000', // Update with your frontend URL
          'X-Title': 'Medical Chatbot'
        }
      }
    );

    const generatedSQL = sqlResponse.data.choices[0].message.content;
    console.log('Generated SQL:', generatedSQL);

    // 2. Execute Query
    // 2. Extract and Execute SQL safely
console.log('\n[2/3] Executing SQL...');

// Extract just the SQL query from the AI response
const match = generatedSQL.match(/(SELECT[\s\S]+?;)/i);

if (!match) {
  throw new Error("AI did not return a valid SQL query.");
}

const cleanSQL = match[1].trim();
console.log("Cleaned SQL to Execute:", cleanSQL);

const result = await pool.query(cleanSQL);
console.log('Query Results:', result.rows);

const formattedData = result.rows.length > 0
  ? result.rows.map(row => `- ${row.disease_name}`).join('\n')
  : 'Not in our records';

    // 3. Format Response with OpenRouter
    console.log('\n[3/3] Formatting Response...');
    const chatResponse = await axios.post(
      OPENROUTER_API_URL,
      {
        
        model : "openai/chatgpt-4o-latest",


        messages: [
          {
            role: "system",
            content: `You're a doctor explaining medical data. Rules:
1. Use markdown with **bold** for key terms
3. Never invent information
4. State "Not in our records" if data is empty

Data:
${formattedData}`

          },
          { role: "system",
content: `You're a medical assistant summarizing raw database query results.
Rules:
1. Use markdown with **bold** for terms and start with a general greeting.
2. make the conversation human.
3. NEVER infer or assume missing symptoms, diseases, or causes.
4. If result is empty, respond with: "Not in our records."
5. Your response must only reflect the provided data:

Data: ${JSON.stringify(result.rows)}`
 }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Medical Chatbot'
        }
      }
    );

    const responseContent = chatResponse.data.choices[0].message.content;
    console.log('\n=== Final Response ===');
    console.log(responseContent);

    res.json({
      response: responseContent,
      sources: findUsedTables(generatedSQL)
    });

  } catch (err) {
    console.error('\n!!! ERROR !!!');
    console.error('Full error:', {
      message: err.message,
      stack: err.stack,
      response: err.response?.data
    });

    let errorMessage = "Sorry, I encountered an error processing your request.";
    
    if (err.message.includes('database')) {
      errorMessage = "Database connection issue. Please try again later.";
    } else if (err.message.includes('OpenRouter') || err.response?.status === 429) {
      errorMessage = "AI service is currently unavailable. Please try again later.";
    }

    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

function findUsedTables(sql) {
  if (!sql) return [];
  return Object.keys(TABLE_SCHEMAS).filter(table => 
    new RegExp(`\\b${table}\\b`, 'i').test(sql)
  );
}

export default router;