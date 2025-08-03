'use client';

import { useState } from 'react';
import { Plus, FileText, Tag } from 'lucide-react';

interface TaskFormProps {
  onTaskCreate: (task: { title: string; description: string; status: string }) => void;
  loading?: boolean;
}

export default function TaskForm({ onTaskCreate, loading = false }: TaskFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Pending'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim()) {
      onTaskCreate(formData);
      setFormData({ title: '', description: '', status: 'Pending' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
          <FileText className="w-4 h-4 mr-2 text-blue-500" />
          Task Title
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
          placeholder="What needs to be done?"
        />
      </div>
      
      <div className="space-y-2">
        <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
          <FileText className="w-4 h-4 mr-2 text-green-500" />
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 resize-none"
          placeholder="Add more details (optional)"
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Tag className="w-4 h-4 mr-2 text-purple-500" />
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({...formData, status: e.target.value})}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
        >
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="group w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-xl disabled:shadow-none font-semibold disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-center">
          <Plus className={`w-5 h-5 mr-3 transition-transform ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
          {loading ? 'Creating Task...' : 'Create Task'}
        </div>
      </button>
    </form>
  );
}