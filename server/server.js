// server/server.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const session = require('express-session');
const path = require('path');

const app = express();
connectDB();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false, sameSite: 'lax' }
}));

app.get('/', (req, res) => res.send('API Running'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/interns', require('./routes/interns'));
app.use('/api/evaluations', require('./routes/evaluations'));
app.use('/api/users', require('./routes/users'));


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
