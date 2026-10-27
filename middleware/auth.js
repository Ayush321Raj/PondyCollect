/**
 * Authentication and Role-Based Authorization Middleware for PondyCollect
 */

// Verify if the user has an active session
function requireLogin(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({
        success: false,
        message: 'Unauthorized: Access requires an active login session. Please sign in.'
    });
}

// Enforce specific role-based authorization
function requireRole(allowedRole) {
    return (req, res, next) => {
        // Ensure user is logged in first
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Please log in to access this resource.'
            });
        }

        // Verify role against server session (not client-provided role)
        if (req.session.user.role !== allowedRole) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: Access restricted to ${allowedRole}s only.`
            });
        }

        next();
    };
}

module.exports = {
    requireLogin,
    requireRole
};
