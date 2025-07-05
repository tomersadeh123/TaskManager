// app.js
const express = require('express');
const validation = require('./Validations/RequestValidations');
const myCustomMiddleware = require('./middleware');
const mongoose = require('mongoose');

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

app.post('/create-task', async (req, res) => {
  const validationRes = validation(req);
  if (validationRes === true) {
    try {
      const task = new Task(req.body);
      await task.save();
      res.status(200).send({ message: "A task was created" });
    } catch (err) {
      res.status(400).send({ message: "Failed to save task" });
    }
  } else {
    res.status(400).send({ message: "Invalid data" });
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

module.exports = app;
