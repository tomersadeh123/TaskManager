'use client';

import { useState } from 'react';
import { Edit3, Trash2, Save, X, CheckCircle, Clock, Calendar, User, Tag } from 'lucide-react';

interface Chore {
  _id: string;
  title: string;
  description: string;
  assignedTo: {
    _id: string;
    userName: string;
  };
  frequency: string;
  lastCompleted: Date;
  nextDue: Date;
  category: string;
  estimatedTime: number;
  priority: string;
  isActive: boolean;
}

interface ChoreListProps {
  chores: Chore[];
  onChoreUpdate: (choreId: string, updates: Partial<Chore>) => void;
  onChoreDelete: (choreId: string) => void;
}

export default function ChoreList({ chores, onChoreUpdate, onChoreDelete }: ChoreListProps) {
  const [editingChore, setEditingChore] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    frequency: '',
    category: '',
    estimatedTime: 0,
    priority: ''
  });

  const startEdit = (chore: Chore) => {
    setEditingChore(chore._id);
    setEditData({
      title: chore.title,
      description: chore.description,
      frequency: chore.frequency,
      category: chore.category,
      estimatedTime: chore.estimatedTime,
      priority: chore.priority
    });
  };

  const saveEdit = () => {
    if (editingChore) {
      onChoreUpdate(editingChore, editData);
      setEditingChore(null);
    }
  };

  const cancelEdit = () => {
    setEditingChore(null);
    setEditData({
      title: '',
      description: '',
      frequency: '',
      category: '',
      estimatedTime: 0,
      priority: ''
    });
  };

  const markComplete = async (choreId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chores/${choreId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Refresh the chores list by calling the parent update function
        window.location.reload(); // Temporary solution - ideally pass a refresh function from parent
      } else {
        console.error('Failed to mark chore as complete');
      }
    } catch (error) {
      console.error('Error marking chore as complete:', error);
      // Fallback to the original method
      onChoreUpdate(choreId, { 
        lastCompleted: new Date(),
        nextDue: getNextDueDate(new Date())
      });
    }
  };

  const getNextDueDate = (lastCompleted: Date) => {
    const nextDue = new Date(lastCompleted);
    // This is simplified - you'd implement proper frequency calculation
    nextDue.setDate(nextDue.getDate() + 7); // Default to weekly
    return nextDue;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-700';
      case 'medium':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-700';
      default:
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'cleaning':
        return '🧹';
      case 'kitchen':
        return '🍳';
      case 'bathroom':
        return '🚿';
      case 'bedroom':
        return '🛏️';
      case 'outdoor':
        return '🌿';
      case 'maintenance':
        return '🔧';
      default:
        return '📋';
    }
  };

  const isOverdue = (nextDue: Date) => {
    return new Date(nextDue) < new Date();
  };

  const isDueToday = (nextDue: Date) => {
    const today = new Date().toDateString();
    return new Date(nextDue).toDateString() === today;
  };

  if (chores.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-3xl mx-auto mb-6 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No chores yet</h3>
        <p className="text-slate-600 dark:text-slate-400">Create your first household chore to get started! 🧹</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {chores.map((chore) => (
        <div key={chore._id} className="group bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 border border-white/20 dark:border-slate-700/30 hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50">
          {editingChore === chore._id ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Title</label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({...editData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  placeholder="Chore title"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({...editData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 resize-none"
                  placeholder="Chore description"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Frequency</label>
                  <select
                    value={editData.frequency}
                    onChange={(e) => setEditData({...editData, frequency: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="once">One-time</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Priority</label>
                  <select
                    value={editData.priority}
                    onChange={(e) => setEditData({...editData, priority: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
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
                  <div className="text-3xl mt-1">
                    {getCategoryIcon(chore.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {chore.title}
                      </h3>
                      {isOverdue(chore.nextDue) && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full">
                          Overdue
                        </span>
                      )}
                      {isDueToday(chore.nextDue) && !isOverdue(chore.nextDue) && (
                        <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded-full">
                          Due Today
                        </span>
                      )}
                    </div>
                    
                    {chore.description && (
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">{chore.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        <span>{chore.assignedTo?.userName || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{chore.frequency}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{chore.estimatedTime} min</span>
                      </div>
                      <div className="flex items-center">
                        <Tag className="w-4 h-4 mr-1" />
                        <span className="capitalize">{chore.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-3">
                  <span className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-full border ${getPriorityColor(chore.priority)}`}>
                    <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
                    {chore.priority}
                  </span>
                  
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => markComplete(chore._id)}
                      className="group/btn p-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded-xl transition-all duration-300 transform hover:scale-110"
                      title="Mark complete"
                    >
                      <CheckCircle className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                    </button>
                    
                    <button
                      onClick={() => startEdit(chore)}
                      className="group/btn p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl transition-all duration-300 transform hover:scale-110"
                      title="Edit chore"
                    >
                      <Edit3 className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                    </button>
                    
                    <button
                      onClick={() => onChoreDelete(chore._id)}
                      className="group/btn p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl transition-all duration-300 transform hover:scale-110"
                      title="Delete chore"
                    >
                      <Trash2 className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Next due: {new Date(chore.nextDue).toLocaleDateString()}
                </div>
                {chore.lastCompleted && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Last done: {new Date(chore.lastCompleted).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}