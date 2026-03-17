const Joi = require('joi');

const validators = {
  register: Joi.object({
    name: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'manager', 'member').default('member')
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  project: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().greater(Joi.ref('startDate')).optional(),
    status: Joi.string().valid('active', 'completed', 'on-hold').optional()
  }),

  task: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().max(1000).optional(),
    projectId: Joi.string().required(),
    assignedTo: Joi.string().optional(),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    status: Joi.string().valid('todo', 'in-progress', 'done').default('todo'),
    dueDate: Joi.date().optional()
  }),

  comment: Joi.object({
    content: Joi.string().min(1).max(500).required()
  }),

  userId: Joi.object({
    userId: Joi.string().required()
  }),

  // New validator for role updates
  roleUpdate: Joi.object({
    role: Joi.string().valid('admin', 'manager', 'member').required()
  }),

  // New validator for password change
  passwordChange: Joi.object({
    currentPassword: Joi.string().min(6).when('$isAdmin', {
      is: false,
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    newPassword: Joi.string().min(6).required()
  }),

  // New validator for user status update
  statusUpdate: Joi.object({
    isActive: Joi.boolean().required()
  }),

  // New validator for user profile update
  profileUpdate: Joi.object({
    name: Joi.string().min(3).max(50).optional(),
    email: Joi.string().email().optional(),
    role: Joi.string().valid('admin', 'manager', 'member').when('$isAdmin', {
      is: true,
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
  })
};

module.exports = validators;