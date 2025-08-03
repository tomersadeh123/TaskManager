'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Users, Calendar, Clock } from 'lucide-react';
import ChoreList from '@/components/household/ChoreList';
import ChoreForm from '@/components/household/ChoreForm';

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

export default function ChoresPage() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; userName: string } | null>(null);
  const router = useRouter();

  const fetchChores = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chores', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setChores(data.result || []);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching chores:', error);
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

    fetchChores();
  }, [router, fetchChores]);

  const handleChoreCreate = async (choreData: {
    title: string;
    description: string;
    frequency: string;
    category: string;
    estimatedTime: number;
    priority: string;
  }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(choreData)
      });

      if (response.ok) {
        fetchChores();
      }
    } catch (error) {
      console.error('Error creating chore:', error);
    }
  };

  const handleChoreUpdate = async (choreId: string, updates: Partial<Chore>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/chores/${choreId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        fetchChores();
      }
    } catch (error) {
      console.error('Error updating chore:', error);
    }
  };

  const handleChoreDelete = async (choreId: string) => {
    if (confirm('Are you sure you want to delete this chore?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/chores/${choreId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          fetchChores();
        }
      } catch (error) {
        console.error('Error deleting chore:', error);
      }
    }
  };

  const handleGoBack = () => {
    router.push('/dashboard');
  };

  // Calculate statistics
  const todayChores = chores.filter(chore => {
    const today = new Date().toDateString();
    return new Date(chore.nextDue).toDateString() === today;
  }).length;

  const overdueChores = chores.filter(chore => 
    new Date(chore.nextDue) < new Date() && chore.isActive
  ).length;

  const completedThisWeek = chores.filter(chore => {
    if (!chore.lastCompleted) return false;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return new Date(chore.lastCompleted) >= weekStart;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl mx-auto mb-4 flex items-center justify-center animate-pulse">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">Loading chores...</div>
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-2">Household Chores</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Manage and track household tasks</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{chores.length}</p>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Total Chores</p>
              </div>
            </div>
          </div>
          
          <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{todayChores}</p>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Due Today</p>
              </div>
            </div>
          </div>
          
          <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{overdueChores}</p>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Overdue</p>
              </div>
            </div>
          </div>
          
          <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{completedThisWeek}</p>
                <p className="text-slate-600 dark:text-slate-400 font-medium">This Week</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chore Form */}
          <div className="lg:col-span-1">
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/20 dark:border-slate-700/30 sticky top-8">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mr-4">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create Chore</h2>
                  <p className="text-slate-600 dark:text-slate-400">Add a new household task</p>
                </div>
              </div>
              <ChoreForm onChoreCreate={handleChoreCreate} />
            </div>
          </div>
          
          {/* Chore List */}
          <div className="lg:col-span-2">
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/20 dark:border-slate-700/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl mr-4">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Household Chores</h2>
                    <p className="text-slate-600 dark:text-slate-400">{chores.length} chores in total</p>
                  </div>
                </div>
              </div>
              
              <ChoreList 
                chores={chores} 
                onChoreUpdate={handleChoreUpdate}
                onChoreDelete={handleChoreDelete}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}