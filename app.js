const express = require('express');
const validation = require('./Validations/RequestValidations');
const myCustomMiddleware = require('./middleware');
const mongoose = require('mongoose');
const userValidation = require("./Validations/UserValidations");

const app = express();
app.use(express.json());
app.use(myCustomMiddleware);

const TaskSchema = new mongoose.Schema({
  title: String,
  description: String,
  user: String,
  status: String
});
const Task = mongoose.model('task', TaskSchema, 'task');

const UserSchema = new mongoose.Schema({
  userName: String,
  password: String,
  email: String,
  address: String
});
const User = mongoose.model('Users', UserSchema, 'Users');

app.post('/create-task', async (req, res) => {
  console.log("🔥 Starting create-task");

  const validationRes = validation(req);
  console.log("✅ Validation result:", validationRes);


  if (validationRes.isValid) {
    console.log("✅ Validation passed - entering success branch");
    try {
      console.log("💾 About to save task:", validationRes.data);
      const task = new Task(validationRes.data);
      await task.save();
      console.log("✅ Task saved.");
      res.status(200).send({ message: "A task was created" });
    } catch (err) {
      console.error('❌ Error saving task:', err);
      res.status(400).send({ message: "Failed to save task" });
    }
  } else {
    console.log("❌ Validation errors:", validationRes.errors);
    res.status(400).send({ message: "Invalid data", errors: validationRes.errors });
  }
});

app.delete('/delete-task/:id', async (req, res) => {
  try {
    const result = await Task.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Task not found" });
    }
    res.status(200).send({ message: "The task has been successfully deleted" });
  } catch (error) {
    res.status(500).send({ message: "Error deleting task" });
  }
});

app.post('/update-task/:id/:status', async (req, res) => {
  try {
    const result = await Task.updateOne(
        { _id: req.params.id },
        { status: req.params.status }
    );
    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Task not found" });
    }
    res.status(200).send({ message: "The task status has been successfully updated" });
  } catch (error) {
    res.status(500).send({ message: "Error updating task" });
  }
});

app.get('/get-all-tasks', async (req, res) => {
  try {
    const result = await Task.find();
    res.status(200).send({ message: "All items were found.", result });
  } catch (error) {
    res.status(500).send({ message: "Error getting tasks" });
  }
});

app.post('/health', (res) => {
  try{
    res.status(200).send({ message: "Server is healthy" });
  }catch (error){
    res.status(500).send({ message: "Server is not healthy" });
  }
});


app.post('create-user',async (req,res) => {
  var validationRes = userValidation(req);
  console.log("Validations Result",validationRes)
  if(validationRes.isValid){
    try{
      const user = new User(req.body);
      await user.save();
      console.log("✅ Task saved.");
      res.status(200).send({ message: "User created" });
    }catch (e) {
      res.status(500).send({message: "something wen wrong"});
    }
  }
  else {
    console.log("❌ Validation failed:", validationRes);
    res.status(400).send({ message: "Invalid data" ,validationRes});
  }
});

module.exports = app;
