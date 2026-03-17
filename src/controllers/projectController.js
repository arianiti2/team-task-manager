const Project = require('../models/Project');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res, next) => {
  try {
    const { name, description, startDate, endDate } = req.body;

    const project = await Project.create({
      name,
      description,
      startDate,
      endDate,
      owner: req.user.id,
      members: [{
        user: req.user.id,
        role: 'manager'
      }]
    });

    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error('Create project error:', error);
    next(error);
  }
};

// @desc    Get all projects for user
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res, next) => {
  try {
    let query = {};

    // Filter projects based on user role
    if (req.user.role === 'admin') {
      // Admin sees all projects
      query = {};
    } else {
      // Regular users see projects they own or are members of
      query = {
        $or: [
          { owner: req.user.id },
          { 'members.user': req.user.id }
        ]
      };
    }

    const projects = await Project.find(query)
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    logger.error('Get projects error:', error);
    next(error);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check access
    const hasAccess = req.user.role === 'admin' ||
      project.owner._id.toString() === req.user.id ||
      project.members.some(m => m.user._id.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this project'
      });
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error('Get project error:', error);
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res, next) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user can update
    const canUpdate = req.user.role === 'admin' ||
      project.owner.toString() === req.user.id ||
      project.members.some(m => m.user.toString() === req.user.id && m.role === 'manager');

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this project'
      });
    }

    project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('owner', 'name email')
     .populate('members.user', 'name email');

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error('Update project error:', error);
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin or Owner only)
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user can delete
    const canDelete = req.user.role === 'admin' ||
      project.owner.toString() === req.user.id;

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this project'
      });
    }

    await project.remove();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error('Delete project error:', error);
    next(error);
  }
};

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private
const addMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user can add members
    const canAdd = req.user.role === 'admin' ||
      project.owner.toString() === req.user.id ||
      project.members.some(m => m.user.toString() === req.user.id && m.role === 'manager');

    if (!canAdd) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to add members'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user already a member
    if (project.members.some(m => m.user.toString() === userId)) {
      return res.status(400).json({
        success: false,
        error: 'User already a member of this project'
      });
    }

    project.members.push({
      user: userId,
      role: role || 'member'
    });

    await project.save();

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error('Add member error:', error);
    next(error);
  }
};

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private
const removeMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user can remove members
    const canRemove = req.user.role === 'admin' ||
      project.owner.toString() === req.user.id ||
      project.members.some(m => m.user.toString() === req.user.id && m.role === 'manager');

    if (!canRemove) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to remove members'
      });
    }

    // Cannot remove the owner
    if (req.params.userId === project.owner.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove the project owner'
      });
    }

    project.members = project.members.filter(
      m => m.user.toString() !== req.params.userId
    );

    await project.save();

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error('Remove member error:', error);
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember
};