const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// 1. CRITICAL SECURITY CHECK
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env");
  process.exit(1);
}

// 2. Middleware
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// 3. CORS Configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

// 4. Database Connection
const db = require('./config/db');
db();

// 5. Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/interns', require('./routes/interns'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/evaluations', require('./routes/evaluations'));

// 6. FIX: Correct PORT handling for Render
const PORT = process.env.PORT || 5000;

// IMPORTANT: Listen on 0.0.0.0 for cloud hosting
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
