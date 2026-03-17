const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserStats
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// All routes require authentication
router.use(protect);

// Routes accessible by authenticated users
router.get('/me', (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

// Admin only routes
router.route('/')
  .get(authorize('admin'), getUsers);

router.route('/:id')
  .get(authorize('admin'), getUser)
  .put(updateUser)  // Users can update their own profile, admins can update any
  .delete(authorize('admin'), deleteUser);

// User statistics - accessible by admin or the user themselves
router.get('/:id/stats', getUserStats);

// Update user role (admin only)
router.patch('/:id/role', 
  authorize('admin'),
  validate('roleUpdate'),
  async (req, res, next) => {
    try {
      const { role } = req.body;
      const User = require('../models/User');
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
);

// Activate/Deactivate user (admin only)
router.patch('/:id/status',
  authorize('admin'),
  async (req, res, next) => {
    try {
      const { isActive } = req.body;
      const User = require('../models/User');
      
      // Don't allow deactivating yourself
      if (req.params.id === req.user.id && isActive === false) {
        return res.status(400).json({
          success: false,
          error: 'You cannot deactivate your own account'
        });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all projects for a specific user
router.get('/:id/projects',
  async (req, res, next) => {
    try {
      const Project = require('../models/Project');
      
      // Check if user is authorized to view these projects
      const isAuthorized = req.user.role === 'admin' || req.user.id === req.params.id;
      
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view these projects'
        });
      }

      const projects = await Project.find({
        $or: [
          { owner: req.params.id },
          { 'members.user': req.params.id }
        ]
      })
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .sort('-createdAt');

      res.json({
        success: true,
        count: projects.length,
        data: projects
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all tasks assigned to a specific user
router.get('/:id/tasks',
  async (req, res, next) => {
    try {
      const Task = require('../models/Task');
      
      // Check if user is authorized to view these tasks
      const isAuthorized = req.user.role === 'admin' || req.user.id === req.params.id;
      
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view these tasks'
        });
      }

      const tasks = await Task.find({ assignedTo: req.params.id })
        .populate('project', 'name')
        .populate('createdBy', 'name email')
        .sort('-createdAt');

      res.json({
        success: true,
        count: tasks.length,
        data: tasks
      });
    } catch (error) {
      next(error);
    }
  }
);

// Change password
router.patch('/:id/change-password',
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const User = require('../models/User');
      
      // Check if user is authorized (themselves or admin)
      const isAuthorized = req.user.role === 'admin' || req.user.id === req.params.id;
      
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to change this password'
        });
      }

      // Get user with password field
      const user = await User.findById(req.params.id).select('+password');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // If not admin, verify current password
      if (req.user.role !== 'admin') {
        const isMatch = await user.comparePassword(currentPassword);
        
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            error: 'Current password is incorrect'
          });
        }
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;