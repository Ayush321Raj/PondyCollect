const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { requireLogin, requireRole } = require('../middleware/auth');

/**
 * GET /api/dashboard/employee
 * Restricted to authenticated EMPLOYEES
 * Returns:
 * 1. Current employee profile
 * 2. Complete list of registered administrators via SQL INNER JOIN
 */
router.get('/employee', requireLogin, requireRole('employee'), async (req, res) => {
    try {
        // Fetch up-to-date profile for logged-in employee
        const [profileRows] = await pool.execute(
            `SELECT u.id, u.name, u.email, u.role, u.created_at,
                    e.department, e.designation, e.phone
             FROM users u
             INNER JOIN employees e ON u.id = e.user_id
             WHERE u.id = ?`,
            [req.session.user.id]
        );

        if (profileRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee profile not found in database.'
            });
        }

        // Fetch all registered administrators (Cross-role requirement)
        const [adminRows] = await pool.execute(
            `SELECT u.id, u.name, u.email, u.role,
                    a.department, a.designation, a.phone, a.created_at
             FROM admins a
             INNER JOIN users u ON a.user_id = u.id
             ORDER BY u.name ASC`
        );

        return res.status(200).json({
            success: true,
            profile: profileRows[0],
            administrators: adminRows
        });

    } catch (err) {
        console.error('[Employee Dashboard API Error]:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve employee dashboard data.'
        });
    }
});

/**
 * GET /api/dashboard/admin
 * Restricted to authenticated ADMINISTRATORS
 * Returns:
 * 1. Current admin profile
 * 2. Complete list of registered employees via SQL INNER JOIN
 */
router.get('/admin', requireLogin, requireRole('admin'), async (req, res) => {
    try {
        // Fetch up-to-date profile for logged-in admin
        const [profileRows] = await pool.execute(
            `SELECT u.id, u.name, u.email, u.role, u.created_at,
                    a.department, a.designation, a.phone
             FROM users u
             INNER JOIN admins a ON u.id = a.user_id
             WHERE u.id = ?`,
            [req.session.user.id]
        );

        if (profileRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Administrator profile not found in database.'
            });
        }

        // Fetch all registered employees (Cross-role requirement)
        const [employeeRows] = await pool.execute(
            `SELECT u.id, u.name, u.email, u.role,
                    e.department, e.designation, e.phone, e.created_at
             FROM employees e
             INNER JOIN users u ON e.user_id = u.id
             ORDER BY u.name ASC`
        );

        return res.status(200).json({
            success: true,
            profile: profileRows[0],
            employees: employeeRows
        });

    } catch (err) {
        console.error('[Admin Dashboard API Error]:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve admin dashboard data.'
        });
    }
});

/**
 * GET /api/dashboard/admin/stats
 * Restricted to authenticated ADMINISTRATORS
 * Returns dynamic database counts for dashboard summary cards
 */
router.get('/admin/stats', requireLogin, requireRole('admin'), async (req, res) => {
    try {
        // Dynamic counts computed directly from database
        const [[empCountResult]] = await pool.execute('SELECT COUNT(*) AS totalEmployees FROM employees');
        const [[adminCountResult]] = await pool.execute('SELECT COUNT(*) AS totalAdmins FROM admins');
        const [[deptCountResult]] = await pool.execute(
            'SELECT COUNT(DISTINCT department) AS totalDepartments FROM employees'
        );

        return res.status(200).json({
            success: true,
            stats: {
                totalEmployees: empCountResult.totalEmployees,
                totalAdmins: adminCountResult.totalAdmins,
                totalDepartments: deptCountResult.totalDepartments,
                accountStatus: 'Active & Verified',
                serverTime: new Date().toISOString()
            }
        });

    } catch (err) {
        console.error('[Admin Stats API Error]:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve admin statistics.'
        });
    }
});

module.exports = router;
