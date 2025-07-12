require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');

async function start() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI not set in environment');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to DB');
    app.listen(3000, () => console.log('🚀 Server listening on port 3000'));
  } catch (err) {
    console.error('❌ Could not connect to DB:', err);
  }
}

start();
