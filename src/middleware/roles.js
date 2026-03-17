const Project = require('../models/Project');

// Check if user has specific role(s)
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized'
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

// Check if user is project owner, manager, or admin
const checkProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required'
      });
    }

    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user is admin
    if (req.user.role === 'admin') {
      req.project = project;
      return next();
    }

    // Check if user is project owner
    const isOwner = project.owner.toString() === req.user.id;
    
    // Check if user is project manager
    const isManager = project.members.some(
      m => m.user.toString() === req.user.id && m.role === 'manager'
    );

    // Check if user is a member (for read access)
    const isMember = project.members.some(
      m => m.user.toString() === req.user.id
    );

    // For read operations, allow any member
    if (req.method === 'GET' && isMember) {
      req.project = project;
      return next();
    }

    // For write operations, require owner or manager
    if (isOwner || isManager) {
      req.project = project;
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Not authorized to access this project'
    });
  } catch (error) {
    next(error);
  }
};

// Check if user can modify a task
const checkTaskAccess = async (req, res, next) => {
  try {
    const Task = require('../models/Task');
    const taskId = req.params.id;
    
    const task = await Task.findById(taskId).populate('project');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Admin can do anything
    if (req.user.role === 'admin') {
      req.task = task;
      return next();
    }

    // Check project access
    const project = task.project;
    
    // Project owner can modify any task in their project
    if (project.owner.toString() === req.user.id) {
      req.task = task;
      return next();
    }

    // Project managers can modify any task
    const isManager = project.members.some(
      m => m.user.toString() === req.user.id && m.role === 'manager'
    );
    
    if (isManager) {
      req.task = task;
      return next();
    }

    // Task assignee can update status and add comments
    if (task.assignedTo && task.assignedTo.toString() === req.user.id) {
      // For updates, only allow status changes and comments
      if (req.method === 'PUT') {
        // Only allow updating status field
        const allowedUpdates = ['status'];
        const updates = Object.keys(req.body);
        const isValidOperation = updates.every(update => allowedUpdates.includes(update));
        
        if (!isValidOperation) {
          return res.status(403).json({
            success: false,
            error: 'Assignees can only update task status'
          });
        }
      }
      
      req.task = task;
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Not authorized to access this task'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { 
  checkRole, 
  checkProjectAccess,
  checkTaskAccess 
};