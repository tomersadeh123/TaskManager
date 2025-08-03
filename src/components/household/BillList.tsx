'use client';

import { useState } from 'react';
import { Edit3, Trash2, Save, X, DollarSign, Calendar, AlertTriangle, CheckCircle, Tag } from 'lucide-react';

interface Bill {
  _id: string;
  name: string;
  amount: number;
  dueDate: Date;
  category: string;
  isRecurring: boolean;
  frequency: string;
  isPaid: boolean;
  paidDate?: Date;
  reminderDays: number;
  notes?: string;
  vendor?: string;
}

interface BillListProps {
  bills: Bill[];
  onBillUpdate: (billId: string, updates: Partial<Bill>) => void;
  onBillDelete: (billId: string) => void;
}

export default function BillList({ bills, onBillUpdate, onBillDelete }: BillListProps) {
  const [editingBill, setEditingBill] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    name: '',
    amount: 0,
    dueDate: '',
    category: '',
    isRecurring: false,
    frequency: '',
    reminderDays: 3,
    notes: '',
    vendor: ''
  });

  const startEdit = (bill: Bill) => {
    setEditingBill(bill._id);
    setEditData({
      name: bill.name,
      amount: bill.amount,
      dueDate: new Date(bill.dueDate).toISOString().split('T')[0],
      category: bill.category,
      isRecurring: bill.isRecurring,
      frequency: bill.frequency,
      reminderDays: bill.reminderDays,
      notes: bill.notes || '',
      vendor: bill.vendor || ''
    });
  };

  const saveEdit = () => {
    if (editingBill) {
      onBillUpdate(editingBill, {
        ...editData,
        dueDate: new Date(editData.dueDate)
      });
      setEditingBill(null);
    }
  };

  const cancelEdit = () => {
    setEditingBill(null);
    setEditData({
      name: '',
      amount: 0,
      dueDate: '',
      category: '',
      isRecurring: false,
      frequency: '',
      reminderDays: 3,
      notes: '',
      vendor: ''
    });
  };

  const markPaid = (billId: string) => {
    onBillUpdate(billId, { 
      isPaid: true,
      paidDate: new Date()
    });
  };

  const markUnpaid = (billId: string) => {
    onBillUpdate(billId, { 
      isPaid: false,
      paidDate: undefined
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      utilities: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
      rent: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
      mortgage: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400',
      insurance: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      internet: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-400',
      phone: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-400',
      groceries: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400',
      entertainment: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
      other: 'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-400'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      utilities: '⚡',
      rent: '🏠',
      mortgage: '🏡',
      insurance: '🛡️',
      internet: '🌐',
      phone: '📱',
      groceries: '🛒',
      entertainment: '🎬',
      other: '📄'
    };
    return icons[category as keyof typeof icons] || icons.other;
  };

  const isOverdue = (dueDate: Date, isPaid: boolean) => {
    return !isPaid && new Date(dueDate) < new Date();
  };

  const isDueSoon = (dueDate: Date, reminderDays: number, isPaid: boolean) => {
    if (isPaid) return false;
    const daysDiff = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= reminderDays && daysDiff >= 0;
  };

  if (bills.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-3xl mx-auto mb-6 flex items-center justify-center">
          <DollarSign className="w-12 h-12 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No bills yet</h3>
        <p className="text-slate-600 dark:text-slate-400">Add your first bill to start tracking payments! 💰</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bills.map((bill) => (
        <div key={bill._id} className="group bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 border border-white/20 dark:border-slate-700/30 hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50">
          {editingBill === bill._id ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bill Name</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Bill name"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.amount}
                    onChange={(e) => setEditData({...editData, amount: parseFloat(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Due Date</label>
                  <input
                    type="date"
                    value={editData.dueDate}
                    onChange={(e) => setEditData({...editData, dueDate: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={editData.category}
                    onChange={(e) => setEditData({...editData, category: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="utilities">Utilities</option>
                    <option value="rent">Rent</option>
                    <option value="mortgage">Mortgage</option>
                    <option value="insurance">Insurance</option>
                    <option value="internet">Internet</option>
                    <option value="phone">Phone</option>
                    <option value="groceries">Groceries</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="other">Other</option>
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
                    {getCategoryIcon(bill.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {bill.name}
                      </h3>
                      {bill.isPaid && (
                        <span className="px-3 py-1 text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">
                          Paid
                        </span>
                      )}
                      {isOverdue(bill.dueDate, bill.isPaid) && (
                        <span className="px-3 py-1 text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full">
                          Overdue
                        </span>
                      )}
                      {isDueSoon(bill.dueDate, bill.reminderDays, bill.isPaid) && (
                        <span className="px-3 py-1 text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded-full">
                          Due Soon
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-6 mb-3">
                      <div className="flex items-center">
                        <DollarSign className="w-5 h-5 mr-1 text-green-600" />
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          ${bill.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>Due: {new Date(bill.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(bill.category)}`}>
                        <Tag className="w-3 h-3 mr-1" />
                        {bill.category}
                      </span>
                      {bill.vendor && (
                        <span>Vendor: {bill.vendor}</span>
                      )}
                      {bill.isRecurring && (
                        <span>Every {bill.frequency}</span>
                      )}
                    </div>
                    
                    {bill.notes && (
                      <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm">{bill.notes}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!bill.isPaid ? (
                    <button
                      onClick={() => markPaid(bill._id)}
                      className="group/btn p-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded-xl transition-all duration-300 transform hover:scale-110"
                      title="Mark as paid"
                    >
                      <CheckCircle className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                    </button>
                  ) : (
                    <button
                      onClick={() => markUnpaid(bill._id)}
                      className="group/btn p-2 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-xl transition-all duration-300 transform hover:scale-110"
                      title="Mark as unpaid"
                    >
                      <AlertTriangle className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => startEdit(bill)}
                    className="group/btn p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl transition-all duration-300 transform hover:scale-110"
                    title="Edit bill"
                  >
                    <Edit3 className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                  </button>
                  
                  <button
                    onClick={() => onBillDelete(bill._id)}
                    className="group/btn p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl transition-all duration-300 transform hover:scale-110"
                    title="Delete bill"
                  >
                    <Trash2 className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                  </button>
                </div>
              </div>
              
              {bill.paidDate && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Paid on: {new Date(bill.paidDate).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}