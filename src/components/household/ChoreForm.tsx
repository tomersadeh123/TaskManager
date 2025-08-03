'use client';

import { useState } from 'react';
import { Plus, User, Clock, Tag, Calendar, FileText } from 'lucide-react';

interface ChoreFormProps {
  onChoreCreate: (chore: {
    title: string;
    description: string;
    frequency: string;
    category: string;
    estimatedTime: number;
    priority: string;
  }) => void;
  loading?: boolean;
}

export default function ChoreForm({ onChoreCreate, loading = false }: ChoreFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    frequency: 'weekly',
    category: 'cleaning',
    estimatedTime: 30,
    priority: 'medium'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.trim()) {
      onChoreCreate(formData);
      setFormData({
        title: '',
        description: '',
        frequency: 'weekly',
        category: 'cleaning',
        estimatedTime: 30,
        priority: 'medium'
      });
    }
  };

  const frequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'once', label: 'One-time' }
  ];

  const categories = [
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'bathroom', label: 'Bathroom' },
    { value: 'bedroom', label: 'Bedroom' },
    { value: 'outdoor', label: 'Outdoor' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
          <FileText className="w-4 h-4 mr-2 text-blue-500" />
          Chore Title
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Calendar className="w-4 h-4 mr-2 text-purple-500" />
            Frequency
          </label>
          <select
            value={formData.frequency}
            onChange={(e) => setFormData({...formData, frequency: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
          >
            {frequencies.map((freq) => (
              <option key={freq.value} value={freq.value}>{freq.label}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Tag className="w-4 h-4 mr-2 text-orange-500" />
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Clock className="w-4 h-4 mr-2 text-indigo-500" />
            Time (minutes)
          </label>
          <input
            type="number"
            min="5"
            max="480"
            value={formData.estimatedTime}
            onChange={(e) => setFormData({...formData, estimatedTime: parseInt(e.target.value)})}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
            placeholder="30"
          />
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
            <User className="w-4 h-4 mr-2 text-pink-500" />
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({...formData, priority: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300"
          >
            {priorities.map((priority) => (
              <option key={priority.value} value={priority.value}>{priority.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="group w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-xl disabled:shadow-none font-semibold disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-center">
          <Plus className={`w-5 h-5 mr-3 transition-transform ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
          {loading ? 'Creating Chore...' : 'Create Chore'}
        </div>
      </button>
    </form>
  );
}