const app = require('./app');
const mongoose = require('mongoose');

async function start() {
  try {
    await mongoose.connect('mongodb://localhost:27017/tasks');
    console.log('Connected to Db');
    app.listen(3000, () => console.log('Server listening on port 3000'));
  } catch (err) {
    console.error('Could not connect', err);
  }
}

start();
