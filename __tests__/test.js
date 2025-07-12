const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Fix: Mock to return the new validation format
jest.mock('../Validations/RequestValidations', () => jest.fn((req) => ({
  isValid: true,
  data: req.body  // Return the request body as validated data
})));

const app = require('../app');
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

test('POST /create-task - success', async () => {
  const res = await request(app)
      .post('/create-task')
      .send({
        title: 'Test Task',
        description: 'Description',
        user: 'User',
        status: 'Pending'
      });
  expect(res.statusCode).toBe(200);
  expect(res.body.message).toBe('A task was created');
});

test('GET /get-all-tasks - returns empty list', async () => {
  const res = await request(app).get('/get-all-tasks');
  expect(res.statusCode).toBe(200);
  expect(res.body.result).toEqual([]);
});

test('GET /get-all-tasks - returns inserted tasks', async () => {
  await request(app).post('/create-task').send({
    title: 'Task 1',
    description: 'Desc 1',
    user: 'User 1',
    status: 'Pending'
  });
  await request(app).post('/create-task').send({
    title: 'Task 2',
    description: 'Desc 2',
    user: 'User 2',
    status: 'Done'
  });

  const res = await request(app).get('/get-all-tasks');
  expect(res.statusCode).toBe(200);
  expect(res.body.result.length).toBe(2);
  expect(res.body.result[0]).toHaveProperty('title');
});

test('DELETE /delete-task/:id - success', async () => {
  const createRes = await request(app).post('/create-task').send({
    title: 'Task to Delete',
    description: 'Desc',
    user: 'User',
    status: 'Pending'
  });
  const tasks = await request(app).get('/get-all-tasks');
  const id = tasks.body.result[0]._id;

  const res = await request(app).delete(`/delete-task/${id}`);
  expect(res.statusCode).toBe(200);
  expect(res.body.message).toBe('The task has been successfully deleted');

  const afterDelete = await request(app).get('/get-all-tasks');
  expect(afterDelete.body.result).toHaveLength(0);
});

test('POST /update-task/:id/:status - success', async () => {
  const createRes = await request(app).post('/create-task').send({
    title: 'Task to Update',
    description: 'Desc',
    user: 'User',
    status: 'Pending'
  });
  const tasks = await request(app).get('/get-all-tasks');
  const id = tasks.body.result[0]._id;

  const res = await request(app).post(`/update-task/${id}/Done`);
  expect(res.statusCode).toBe(200);
  expect(res.body.message).toBe('The task status has been successfully updated');

  const updated = await request(app).get('/get-all-tasks');
  expect(updated.body.result[0].status).toBe('Done');
});

// Add test for validation failure
test('POST /create-task - validation failure', async () => {
  // Temporarily mock validation to return failure
  const validation = require('../Validations/RequestValidations');
  validation.mockImplementation(() => ({
    isValid: false,
    errors: [{ message: 'Title is required' }]
  }));

  const res = await request(app)
      .post('/create-task')
      .send({
        title: '', // Invalid data
        description: 'Description',
        user: 'User',
        status: 'Pending'
      });

  expect(res.statusCode).toBe(400);
  expect(res.body.message).toBe('Invalid data');

  // Reset mock for other tests
  validation.mockImplementation((req) => ({
    isValid: true,
    data: req.body
  }));
});

// Add test for create-user endpoint
/**test('POST /create-user - success', async () => {
  // Mock user validation
  jest.mock('../Validations/UserValidations', () => jest.fn((req) => ({
    isValid: true,
    data: req.body
  })));

  const res = await request(app)
      .post('/create-user')
      .send({
        UserName: 'testuser',
        Password: 'password123',
        Email: 'test@example.com',
        Address: '123 Test St'
      });

  expect(res.statusCode).toBe(200);
  expect(res.body.message).toBe('User created');
});**/