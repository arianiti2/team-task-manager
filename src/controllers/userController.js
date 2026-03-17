const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const logger = require('../utils/logger');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
const getUsers = async (req, res, next) => {
  try {
    // Add pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Add filtering
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort('-createdAt');

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (error) {
    logger.error('Get users error:', error);
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin only)
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

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
    logger.error('Get user error:', error);
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or own user)
const updateUser = async (req, res, next) => {
  try {
    // Check if user can update
    const isOwnProfile = req.user.id === req.params.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this user'
      });
    }

    // Define allowed updates based on role
    let allowedUpdates = ['name', 'email'];
    
    // Only admin can update role and isActive
    if (isAdmin) {
      allowedUpdates = [...allowedUpdates, 'role', 'isActive'];
    }

    // Filter request body to only include allowed fields
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Don't allow non-admins to update their own role or isActive
    if (!isAdmin) {
      delete updates.role;
      delete updates.isActive;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    logger.info(`User ${req.params.id} updated by ${req.user.id}`);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Update user error:', error);
    next(error);
  }
};

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Don't allow deleting yourself
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // Soft delete - deactivate user
    user.isActive = false;
    await user.save();

    // Optionally, you might want to:
    // 1. Reassign their tasks
    // 2. Remove them from projects
    // 3. Notify project owners

    logger.info(`User ${req.params.id} deactivated by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: {}
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    next(error);
  }
};

// @desc    Get user stats
// @route   GET /api/users/:id/stats
// @access  Private (Admin or own user)
const getUserStats = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check access
    const isOwnProfile = req.user.id === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view these stats'
      });
    }

    // Get projects count
    const projectsOwned = await Project.countDocuments({ owner: userId });
    const projectsMember = await Project.countDocuments({
      'members.user': userId
    });

    // Get tasks stats
    const tasksAssigned = await Task.countDocuments({ assignedTo: userId });
    const tasksCompleted = await Task.countDocuments({
      assignedTo: userId,
      status: 'done'
    });
    const tasksPending = await Task.countDocuments({
      assignedTo: userId,
      status: { $ne: 'done' }
    });
    const tasksOverdue = await Task.countDocuments({
      assignedTo: userId,
      status: { $ne: 'done' },
      dueDate: { $lt: new Date() }
    });

    // Get tasks by priority
    const tasksByPriority = await Task.aggregate([
      { $match: { assignedTo: require('mongoose').Types.ObjectId(userId) } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Get recent activity
    const recentTasks = await Task.find({
      $or: [
        { assignedTo: userId },
        { createdBy: userId }
      ]
    })
    .sort('-updatedAt')
    .limit(5)
    .populate('project', 'name');

    res.json({
      success: true,
      data: {
        projects: {
          owned: projectsOwned,
          member: projectsMember,
          total: projectsOwned + projectsMember
        },
        tasks: {
          assigned: tasksAssigned,
          completed: tasksCompleted,
          pending: tasksPending,
          overdue: tasksOverdue,
          completionRate: tasksAssigned > 0 
            ? Math.round((tasksCompleted / tasksAssigned) * 100) 
            : 0,
          byPriority: tasksByPriority.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
          }, { low: 0, medium: 0, high: 0 })
        },
        recentActivity: recentTasks
      }
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserStats
};