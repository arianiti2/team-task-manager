const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/env');
const logger = require('../utils/logger');

// Protect routes - verify JWT token and attach user to request
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies (if you're using cookies)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get user from token (exclude password)
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found with this token'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Your account has been deactivated. Please contact support.'
        });
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      // Handle specific JWT errors
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token. Please log in again.'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Your token has expired. Please log in again.'
        });
      }

      logger.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    next(error);
  }
};

// Optional: Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`
      });
    }

    next();
  };
};

// Optional: Check if user owns the resource or is admin
const checkOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const userId = req.user.id;

      // If user is admin, allow access
      if (req.user.role === 'admin') {
        return next();
      }

      // Find the resource
      const resource = await model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found'
        });
      }

      // Check if user owns the resource
      // This assumes the resource has a 'user' or 'owner' field
      const ownerField = resource.user || resource.owner || resource.createdBy;
      
      if (ownerField && ownerField.toString() === userId) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action'
      });
    } catch (error) {
      logger.error('Ownership check error:', error);
      next(error);
    }
  };
};

module.exports = {
  protect,
  authorize,
  checkOwnership
};