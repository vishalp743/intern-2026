// server/server.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // 1. Import
const connectDB = require('./config/db');
const session = require('express-session');

const app = express();
connectDB();

app.use(cors({
  origin: 'http://localhost:3000',  // Your frontend URL
  credentials: true                 // Required to send session cookies
}));

app.use(express.json());

app.use(cookieParser()); // 2. Use the middleware

app.use(session({
    secret: 'your-secret-key',           // Change this to something secure
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 3600 * 1000,             // 1 hour
        secure: false                    // Set true if using HTTPS
    }
}));

app.get('/', (req, res) => res.send('API Running'));

// Define Routes
// app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/interns', require('./routes/interns'));
app.use('/api/evaluations', require('./routes/evaluations'));
app.use('/api/users', require('./routes/users'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));