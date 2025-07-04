const express = require('express')
const validation = require('./Validations/RequestValidations')
const mongo = require("mongoose")
const app = express()
const port = 3000
app.use(express.json());

// mongo db connection
const mongoDb = "mongodb://localhost:27017/tasks"
ConnectToDb();

const TaskSchema = new mongo.Schema({
  id:Number,
  title: String,
  description: String,
  user: String,
  status: String
});

const Task = mongo.model('task', TaskSchema, 'task');
// adding a task
app.post('/create-task', (req, res) => {
  console.log("before validation result",req.body)

  // vlaidation
  const validationRes = validation(req)
if(validationRes === true){
  const task = new Task({title: req.body.title,description:req.body.description,user:req.body.user,status:req.body.status})
  console.log("before saving data in the db")
  task.save()
  console.log("after saving data in the db")
  console.log("the request body is : ", task.status,task.description,task.user,task.title)
  if(res.status(200).send({ message: "everything is ok" })){
    console.log("every thing is ok")
  }
  else{
    console.log("something went wrong")
  }
}
else{
  res.status(400).send({message: validationRes})
  console.log("Something Went wrong please check your data")
}
  
})

// delete a task by id 
app.delete('/delete-task/:id', async (req, res) => {
  const taskToDelete = req.params.id;
  console.log("before deleting task", taskToDelete);

  try {
    const result = await Task.deleteOne({ _id: taskToDelete });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Task not found" });
    }

    res.status(200).send({ message: "The task has been successfully deleted" });
    console.log("You have deleted an item!!!");
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).send({ message: "Error deleting task", error });
  }
});

// update task status
app.post('/update-task/:id/:status', async (req, res) => {
  const statusToUpdate = req.params.status;
  const idToUpdate = req.params.id;
  console.log("before deleting task", statusToUpdate);

  try {
    const result = await Task.updateOne({ _id:idToUpdate,status: statusToUpdate });

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Task not found" });
    }

    res.status(200).send({ message: "The task status has been successfully updated" });
    console.log("You have updated an item!!!");
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).send({ message: "Error updating task", error });
  }
});


async function ConnectToDb(){
  try {
    await mongo.connect(mongoDb)
    console.log("Connected to Db")
  } catch (err) {
    console.error("Could not connect", err)
  }
}
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})