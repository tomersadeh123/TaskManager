'use client';

import { useState, useEffect } from 'react';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  user: string;
}

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
}

export default function TaskList({ tasks, onTaskUpdate, onTaskDelete }: TaskListProps) {
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: '', description: '', status: '' });

  const startEdit = (task: Task) => {
    setEditingTask(task._id);
    setEditData({
      title: task.title,
      description: task.description,
      status: task.status
    });
  };

  const saveEdit = () => {
    if (editingTask) {
      onTaskUpdate(editingTask, editData);
      setEditingTask(null);
    }
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditData({ title: '', description: '', status: '' });
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No tasks yet. Create your first task!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div key={task._id} className="bg-white shadow rounded-lg p-6 border border-gray-200">
          {editingTask === task._id ? (
            <div className="space-y-4">
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({...editData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Task title"
              />
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({...editData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Task description"
                rows={3}
              />
              <select
                value={editData.status}
                onChange={(e) => setEditData({...editData, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              <div className="flex space-x-2">
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  task.status === 'Completed' 
                    ? 'bg-green-100 text-green-800'
                    : task.status === 'In Progress'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {task.status}
                </span>
              </div>
              <p className="text-gray-600 mb-4">{task.description}</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => startEdit(task)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Edit
                </button>
                <button
                  onClick={() => onTaskDelete(task._id)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}