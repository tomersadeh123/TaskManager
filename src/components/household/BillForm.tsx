'use client';

import { useState } from 'react';
import { Plus, DollarSign, Calendar, Tag, Bell, FileText } from 'lucide-react';

interface BillFormProps {
  onBillCreate: (bill: {
    name: string;
    amount: number;
    dueDate: string;
    category: string;
    isRecurring: boolean;
    frequency: string;
    reminderDays: number;
    notes: string;
    vendor: string;
  }) => void;
  loading?: boolean;
}

export default function BillForm({ onBillCreate, loading = false }: BillFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    amount: 0,
    dueDate: '',
    category: 'utilities',
    isRecurring: false,
    frequency: 'monthly',
    reminderDays: 3,
    notes: '',
    vendor: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() && formData.amount > 0 && formData.dueDate) {
      onBillCreate(formData);
      setFormData({
        name: '',
        amount: 0,
        dueDate: '',
        category: 'utilities',
        isRecurring: false,
        frequency: 'monthly',
        reminderDays: 3,
        notes: '',
        vendor: ''
      });
    }
  };

  const categories = [
    { value: 'utilities', label: 'Utilities' },
    { value: 'rent', label: 'Rent' },
    { value: 'mortgage', label: 'Mortgage' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'internet', label: 'Internet' },
    { value: 'phone', label: 'Phone' },
    { value: 'groceries', label: 'Groceries' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'other', label: 'Other' }
  ];

  const frequencies = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
          <FileText className="w-4 h-4 mr-2 text-blue-500" />
          Bill Name
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
          placeholder="Electric Bill, Netflix, etc."
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
            <DollarSign className="w-4 h-4 mr-2 text-green-500" />
            Amount
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.amount || ''}
            onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
            placeholder="0.00"
          />
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Calendar className="w-4 h-4 mr-2 text-purple-500" />
            Due Date
          </label>
          <input
            type="date"
            required
            value={formData.dueDate}
            onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        
        <div className="space-y-2">
          <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Bell className="w-4 h-4 mr-2 text-indigo-500" />
            Reminder (days)
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={formData.reminderDays}
            onChange={(e) => setFormData({...formData, reminderDays: parseInt(e.target.value)})}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
            placeholder="3"
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.isRecurring}
            onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
            className="w-5 h-5 text-blue-600 bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recurring Bill</span>
        </label>
        
        {formData.isRecurring && (
          <div className="space-y-2">
            <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 mr-2 text-pink-500" />
              Frequency
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({...formData, frequency: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300"
            >
              {frequencies.map((freq) => (
                <option key={freq.value} value={freq.value}>{freq.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
          <FileText className="w-4 h-4 mr-2 text-slate-500" />
          Vendor (Optional)
        </label>
        <input
          type="text"
          value={formData.vendor}
          onChange={(e) => setFormData({...formData, vendor: e.target.value})}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-300"
          placeholder="Electric Company, Netflix, etc."
        />
      </div>
      
      <div className="space-y-2">
        <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
          <FileText className="w-4 h-4 mr-2 text-amber-500" />
          Notes (Optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-300 resize-none"
          placeholder="Additional notes about this bill..."
          rows={3}
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="group w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-xl disabled:shadow-none font-semibold disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-center">
          <Plus className={`w-5 h-5 mr-3 transition-transform ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
          {loading ? 'Adding Bill...' : 'Add Bill'}
        </div>
      </button>
    </form>
  );
}