'use client';

import { useState } from 'react';
import { Edit3, Trash2, Save, X, CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending';
  user: string;
}

interface TaskListProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
}

export default function TaskList({ tasks, onTaskUpdate, onTaskDelete }: TaskListProps) {
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ title: string; description: string; status: 'completed' | 'in-progress' | 'pending' }>({ title: '', description: '', status: 'pending' });

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
    setEditData({ title: '', description: '', status: 'pending' });
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-3xl mx-auto mb-6 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No tasks yet</h3>
        <p className="text-slate-600 dark:text-slate-400">Create your first task to get started! 🚀</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
      case 'in progress':
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-700';
      case 'in-progress':
      case 'in progress':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-700';
      default:
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-700';
    }
  };

  return (
    <div className="space-y-6">
      {tasks.map((task) => (
        <div key={task._id} className="group bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 border border-white/20 dark:border-slate-700/30 hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50">
          {editingTask === task._id ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Title</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({...editData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="Task title"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({...editData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 resize-none"
                  placeholder="Task description"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({...editData, status: e.target.value as 'completed' | 'in-progress' | 'pending'})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={saveEdit}
                  className="group flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                >
                  <div className="flex items-center justify-center">
                    <Save className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                    Save Changes
                  </div>
                </button>
                <button
                  onClick={cancelEdit}
                  className="group flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl transition-all duration-300 transform hover:scale-105 font-semibold"
                >
                  <div className="flex items-center justify-center">
                    <X className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                    Cancel
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl mt-1">
                    {getStatusIcon(task.status)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{task.title}</h3>
                    {task.description && (
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{task.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-3">
                  <span className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full border ${getStatusColor(task.status)}`}>
                    <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
                    {task.status}
                  </span>
                  
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(task)}
                      className="group/btn p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl transition-all duration-300 transform hover:scale-110"
                      title="Edit task"
                    >
                      <Edit3 className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                    </button>
                    
                    <button
                      onClick={() => onTaskDelete(task._id)}
                      className="group/btn p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl transition-all duration-300 transform hover:scale-110"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Task ID: {task._id.slice(-6)}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}