const mysql = require('mysql2/promise');
require('dotenv').config();

// Create MySQL connection pool with promise support
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pondycollect_db',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection on startup
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log(`[Database] Successfully connected to MySQL database: ${process.env.DB_NAME || 'pondycollect_db'}`);
        connection.release();
    } catch (err) {
        console.error('[Database Connection Error]: Could not connect to MySQL.');
        console.error(`Details: ${err.message}`);
        console.error('Please verify XAMPP MySQL is running on port 3306 and .env variables are correct.');
    }
}

testConnection();

module.exports = pool;
