const Task = require('../models/Task');
const Project = require('../models/Project');
const Comment = require('../models/Comment');
const logger = require('../utils/logger');

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res, next) => {
  try {
    const { projectId, title, description, assignedTo, priority, dueDate } = req.body;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user has access to project
    const hasAccess = req.user.role === 'admin' ||
      project.owner.toString() === req.user.id ||
      project.members.some(m => m.user.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create tasks in this project'
      });
    }

    // If assignedTo is provided, check if user is project member
    if (assignedTo) {
      const isMember = req.user.role === 'admin' ||
        project.owner.toString() === assignedTo ||
        project.members.some(m => m.user.toString() === assignedTo);

      if (!isMember) {
        return res.status(400).json({
          success: false,
          error: 'Assigned user is not a member of this project'
        });
      }
    }

    const task = await Task.create({
      title,
      description,
      project: projectId,
      createdBy: req.user.id,
      assignedTo,
      priority,
      dueDate
    });

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Create task error:', error);
    next(error);
  }
};

// @desc    Get all tasks for a project
// @route   GET /api/projects/:projectId/tasks
// @access  Private
const getProjectTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check access
    const hasAccess = req.user.role === 'admin' ||
      project.owner.toString() === req.user.id ||
      project.members.some(m => m.user.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view tasks in this project'
      });
    }

    const tasks = await Task.find({ project: projectId })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    logger.error('Get project tasks error:', error);
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('project', 'name owner members');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check access
    const hasAccess = req.user.role === 'admin' ||
      task.project.owner.toString() === req.user.id ||
      task.project.members.some(m => m.user.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this task'
      });
    }

    // Get comments
    const comments = await Comment.find({ task: task._id })
      .populate('author', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      data: {
        task,
        comments
      }
    });
  } catch (error) {
    logger.error('Get task error:', error);
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id)
      .populate('project', 'owner members');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check if user can update
    const canUpdate = req.user.role === 'admin' ||
      task.project.owner.toString() === req.user.id ||
      task.project.members.some(m => m.user.toString() === req.user.id && m.role === 'manager') ||
      task.assignedTo?.toString() === req.user.id;

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this task'
      });
    }

    task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('createdBy', 'name email')
     .populate('assignedTo', 'name email');

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Update task error:', error);
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'owner');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check if user can delete
    const canDelete = req.user.role === 'admin' ||
      task.project.owner.toString() === req.user.id ||
      task.createdBy.toString() === req.user.id;

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this task'
      });
    }

    // Delete associated comments
    await Comment.deleteMany({ task: task._id });

    await task.remove();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error('Delete task error:', error);
    next(error);
  }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
const addComment = async (req, res, next) => {
  try {
    const { content } = req.body;
    const task = await Task.findById(req.params.id)
      .populate('project', 'owner members');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check access
    const hasAccess = req.user.role === 'admin' ||
      task.project.owner.toString() === req.user.id ||
      task.project.members.some(m => m.user.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to comment on this task'
      });
    }

    const comment = await Comment.create({
      content,
      task: task._id,
      author: req.user.id
    });

    await comment.populate('author', 'name email');

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    logger.error('Add comment error:', error);
    next(error);
  }
};

module.exports = {
  createTask,
  getProjectTasks,
  getTask,
  updateTask,
  deleteTask,
  addComment
};