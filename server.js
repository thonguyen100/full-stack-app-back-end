import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from "mysql2/promise";
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

const app = express();

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

// Database connection - FIXED VERSION
const db = mysql.createPool({
  host: process.env.DB_HOST  || '127.0.0.1',
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection - FIXED
async function testConnection() {
  try {
    const connection = await db.getConnection();
    console.log('Database connected successfully');
    connection.release();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.log('Make sure your MySQL server is running and check your .env file');
  }
}
testConnection();

// Add new student
app.post("/api/add_user", async (req, res) => {
  try {
    const { name, email, age, gender } = req.body;
    
    // Basic validation
    if (!name || !email || !age || !gender) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const sql = "INSERT INTO student_details (`name`,`email`,`age`,`gender`) VALUES (?, ?, ?, ?)";
    const values = [name, email, age, gender];
    
    const [result] = await db.execute(sql, values);
    return res.status(201).json({ 
      success: "Student added successfully", 
      id: result.insertId 
    });
  } catch (err) {
    console.error('Error adding student:', err);
    return res.status(500).json({ message: "Something unexpected has occurred: " + err.message });
  }
});

// Get all students
app.get("/api/students", async (req, res) => {
  try {
    const sql = "SELECT * FROM student_details";
    const [result] = await db.execute(sql);
    return res.json(result);
  } catch (err) {
    console.error('Error fetching students:', err);
    return res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Get specific student by ID
app.get("/api/read/:id", async (req, res) => {
  try {
    const id = req.params.id;
    
    // Validate ID is a number
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid student ID" });
    }

    const sql = "SELECT * FROM student_details WHERE `id` = ?";
    const [result] = await db.execute(sql, [id]);
    
    if (result.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    return res.json(result[0]);
  } catch (err) {
    console.error('Error fetching student:', err);
    return res.status(500).json({ message: "Server error: " + err.message });
  }
});

// Update student
app.put("/api/edit/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { name, email, age, gender } = req.body;
    
    // Validate ID
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid student ID" });
    }
    
    // Basic validation
    if (!name || !email || !age || !gender) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const sql = "UPDATE student_details SET `name`=?, `email`=?, `age`=?, `gender`=? WHERE id=?";
    const values = [name, email, age, gender, id];
    
    const [result] = await db.execute(sql, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    return res.json({ success: "Student updated successfully" });
  } catch (err) {
    console.error('Error updating student:', err);
    return res.status(500).json({ message: "Something unexpected has occurred: " + err.message });
  }
});

// Delete student
app.delete("/api/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    
    // Validate ID
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid student ID" });
    }

    const sql = "DELETE FROM student_details WHERE id=?";
    const [result] = await db.execute(sql, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Student not found" });
    }
    
    return res.json({ success: "Student deleted successfully" });
  } catch (err) {
    console.error('Error deleting student:', err);
    return res.status(500).json({ message: "Something unexpected has occurred: " + err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Add a /health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});


// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});