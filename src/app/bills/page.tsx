'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
import BillList from '@/components/household/BillList';
import BillForm from '@/components/household/BillForm';

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

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; userName: string } | null>(null);
  const router = useRouter();

  const fetchBills = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/bills', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBills(data.result || []);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchBills();
  }, [router, fetchBills]);

  const handleBillCreate = async (billData: {
    name: string;
    amount: number;
    dueDate: string;
    category: string;
    isRecurring: boolean;
    frequency: string;
    reminderDays: number;
    notes: string;
    vendor: string;
  }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(billData)
      });

      if (response.ok) {
        fetchBills();
      }
    } catch (error) {
      console.error('Error creating bill:', error);
    }
  };

  const handleBillUpdate = async (billId: string, updates: Partial<Bill>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bills/${billId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        fetchBills();
      }
    } catch (error) {
      console.error('Error updating bill:', error);
    }
  };

  const handleBillDelete = async (billId: string) => {
    if (confirm('Are you sure you want to delete this bill?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/bills/${billId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          fetchBills();
        }
      } catch (error) {
        console.error('Error deleting bill:', error);
      }
    }
  };

  const handleGoBack = () => {
    router.push('/dashboard');
  };

  // Calculate statistics
  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const paidThisMonth = bills.filter(bill => {
    if (!bill.isPaid || !bill.paidDate) return false;
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const paidDate = new Date(bill.paidDate);
    return paidDate.getMonth() === thisMonth && paidDate.getFullYear() === thisYear;
  }).length;

  const dueSoon = bills.filter(bill => {
    if (bill.isPaid) return false;
    const dueDate = new Date(bill.dueDate);
    const today = new Date();
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= bill.reminderDays && daysDiff >= 0;
  }).length;

  const overdue = bills.filter(bill => {
    if (bill.isPaid) return false;
    return new Date(bill.dueDate) < new Date();
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl mx-auto mb-4 flex items-center justify-center animate-pulse">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">Loading bills...</div>
          <div className="text-slate-600 dark:text-slate-400 mt-2">Just a moment</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleGoBack}
            className="group inline-flex items-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-6 transition-all duration-200"
          >
            <div className="p-2 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors mr-3">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="font-medium">Back to Dashboard</span>
          </button>
          <div className="text-left">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-2">Bill Tracker</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Keep track of your household bills and payments</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">${totalAmount.toFixed(0)}</p>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Total Bills</p>
              </div>
            </div>
          </div>
          
          <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{paidThisMonth}</p>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Paid This Month</p>
              </div>
            </div>
          </div>
          
          <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{dueSoon}</p>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Due Soon</p>
              </div>
            </div>
          </div>
          
          <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{overdue}</p>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Overdue</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bill Form */}
          <div className="lg:col-span-1">
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/20 dark:border-slate-700/30 sticky top-8">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mr-4">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add Bill</h2>
                  <p className="text-slate-600 dark:text-slate-400">Track a new bill or expense</p>
                </div>
              </div>
              <BillForm onBillCreate={handleBillCreate} />
            </div>
          </div>
          
          {/* Bill List */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/20 dark:border-slate-700/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl mr-4">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your Bills</h2>
                    <p className="text-slate-600 dark:text-slate-400">{bills.length} bills tracked</p>
                  </div>
                </div>
              </div>
              
              <BillList 
                bills={bills} 
                onBillUpdate={handleBillUpdate}
                onBillDelete={handleBillDelete}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}