const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');
const { validate } = require('../middleware/validation');

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getProjects)
  .post(validate('project'), createProject);

router.route('/:id')
  .get(getProject)
  .put(validate('project'), updateProject)
  .delete(deleteProject);

router.post('/:id/members', validate('userId'), addMember);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;