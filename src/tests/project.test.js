const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Project = require('../src/models/Project');

describe('Project Endpoints', () => {
  let token;
  let userId;

  beforeAll(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});

    // Register a user
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Project Tester',
        email: 'project@test.com',
        password: 'password123'
      });

    token = res.body.token;
    userId = res.body.user._id;
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Project',
          description: 'This is a test project'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'Test Project');
      expect(res.body.data.owner).toBe(userId);
    });

    it('should not create project without name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'No name project'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/projects', () => {
    it('should get all projects for user', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});