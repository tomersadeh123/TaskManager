const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
jest.mock('../Validations/RequestValidations', () => jest.fn(() => true));

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
