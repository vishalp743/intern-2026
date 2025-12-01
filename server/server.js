const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet'); // ✅ Security Headers
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

// 1. CRITICAL SECURITY CHECK
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env");
  process.exit(1);
}

// 2. Middleware
app.use(helmet()); // ✅ Protects headers
app.use(express.json());
app.use(cookieParser());

// CORS Configuration
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// 3. Database Connection
const db = require('./config/db');
db();

// 4. Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/interns', require('./routes/interns'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/evaluations', require('./routes/evaluations'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));