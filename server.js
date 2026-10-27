const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

// Route handlers
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'pondycollect_default_session_secret_2026',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true, // Prevents client-side script from accessing cookies (XSS protection)
            secure: process.env.NODE_ENV === 'production', // true in production with HTTPS
            sameSite: 'lax', // CSRF protection
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    })
);

// Server-side page access guard for protected dashboard HTML files
app.get('/employee-dashboard.html', (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login.html?error=unauthorized');
    }
    if (req.session.user.role !== 'employee') {
        return res.redirect('/admin-dashboard.html');
    }
    next();
});

app.get('/admin-dashboard.html', (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login.html?error=unauthorized');
    }
    if (req.session.user.role !== 'admin') {
        return res.redirect('/employee-dashboard.html');
    }
    next();
});

// Serve static frontend assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Root route fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint '${req.originalUrl}' not found.`
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('[Unhandled Server Error]:', err.stack);
    res.status(500).json({
        success: false,
        message: 'An internal server error occurred.'
    });
});

// Start Express server
app.listen(PORT, () => {
    console.log('====================================================');
    console.log('  🛍️  PondyCollect — E-Commerce & Role-Based System');
    console.log(`  🚀  Server running at: http://localhost:${PORT}`);
    console.log(`  🌐  Local Portal:      http://127.0.0.1:${PORT}`);
    console.log('====================================================');
});

module.exports = app;
