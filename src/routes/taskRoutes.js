const express = require('express');
const router = express.Router();
const {
  createTask,
  getProjectTasks,
  getTask,
  updateTask,
  deleteTask,
  addComment
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// All routes require authentication
router.use(protect);

router.route('/')
  .post(validate('task'), createTask);

router.get('/project/:projectId', getProjectTasks);

router.route('/:id')
  .get(getTask)
  .put(validate('task'), updateTask)
  .delete(deleteTask);

router.post('/:id/comments', validate('comment'), addComment);

module.exports = router;