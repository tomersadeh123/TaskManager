'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, LogOut, Plus, CheckCircle, Clock, AlertCircle, Home, 
  ClipboardList, ShoppingCart, DollarSign, Wrench, Calendar,
  BarChart3, Settings, Bell, Menu, X
} from 'lucide-react';
import TaskList from '@/components/TaskList';
import TaskForm from '@/components/forms/TaskForm';
import ChoreList from '@/components/household/ChoreList';
import ChoreForm from '@/components/household/ChoreForm';
import BillList from '@/components/household/BillList';
import BillForm from '@/components/household/BillForm';
import NotificationBell from '@/components/NotificationBell';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending';
  user: string;
}

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

export default function HouseholdDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; userName: string } | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Mock data for grocery and maintenance (replace with actual API calls)
  const [groceryStats] = useState({ total: 25, completed: 18, pending: 7 });
  const [maintenanceStats] = useState({ total: 5, completed: 3, upcoming: 2 });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList },
    { id: 'chores', label: 'Chores', icon: Home },
    { id: 'grocery', label: 'Grocery', icon: ShoppingCart },
    { id: 'bills', label: 'Bills', icon: DollarSign },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench }
  ];

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, href: '/dashboard' },
    { id: 'household', label: 'Household Hub', icon: Home, href: '/household' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/calendar' },
    { id: 'notifications', label: 'Notifications', icon: Bell, href: '/notifications' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' }
  ];

  const fetchTasks = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.result || []);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, [router]);

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
      }
    } catch (error) {
      console.error('Error fetching chores:', error);
    }
  }, []);

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
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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

    fetchTasks();
    fetchChores();
    fetchBills();
  }, [router, fetchTasks, fetchChores, fetchBills]);

  const handleTaskCreate = async (taskData: { title: string; description: string; status: string }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskData)
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          fetchTasks();
        }
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl mx-auto mb-4 flex items-center justify-center animate-pulse">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
          <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">Loading your workspace...</div>
          <div className="text-slate-600 dark:text-slate-400 mt-2">Just a moment</div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const pendingTasks = tasks.filter(task => task.status === 'pending').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;

  const choreStats = {
    total: chores.length,
    completed: chores.filter(chore => {
      if (!chore.lastCompleted) return false;
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return new Date(chore.lastCompleted) >= weekStart;
    }).length,
    pending: chores.filter(chore => new Date(chore.nextDue) < new Date() && chore.isActive).length
  };

  const billStats = {
    total: bills.length,
    completed: bills.filter(bill => bill.isPaid).length,
    overdue: bills.filter(bill => !bill.isPaid && new Date(bill.dueDate) < new Date()).length
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/20 dark:border-slate-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Welcome back, {user?.userName}! 👋
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Here&apos;s what&apos;s happening in your household today
            </p>
          </div>
          <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl">
            <Home className="w-12 h-12 text-white" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tasks.length}</p>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Tasks</p>
              <p className="text-xs text-green-600 dark:text-green-400">{completedTasks} completed</p>
            </div>
          </div>
        </div>

        <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{choreStats.total}</p>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Chores</p>
              <p className="text-xs text-green-600 dark:text-green-400">{choreStats.completed} this week</p>
            </div>
          </div>
        </div>

        <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{groceryStats.total}</p>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Grocery</p>
              <p className="text-xs text-green-600 dark:text-green-400">{groceryStats.completed} bought</p>
            </div>
          </div>
        </div>

        <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{billStats.total}</p>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Bills</p>
              <p className="text-xs text-red-600 dark:text-red-400">{billStats.overdue} overdue</p>
            </div>
          </div>
        </div>

        <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{maintenanceStats.total}</p>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Maintenance</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">{maintenanceStats.upcoming} upcoming</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/20 dark:border-slate-700/30">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Recent Tasks</h3>
          <div className="space-y-4">
            {tasks.slice(0, 3).map((task) => (
              <div key={task._id} className="flex items-center p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl">
                <div className={`w-3 h-3 rounded-full mr-4 ${
                  task.status === 'completed' ? 'bg-green-500' :
                  task.status === 'in-progress' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{task.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{task.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/20 dark:border-slate-700/30">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setActiveTab('tasks')}
              className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 font-semibold"
            >
              <Plus className="w-5 h-5 mx-auto mb-2" />
              Add Task
            </button>
            <button 
              onClick={() => setActiveTab('chores')}
              className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 font-semibold"
            >
              <Home className="w-5 h-5 mx-auto mb-2" />
              Add Chore
            </button>
            <button 
              onClick={() => setActiveTab('grocery')}
              className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl hover:from-amber-600 hover:to-amber-700 transition-all duration-300 transform hover:scale-105 font-semibold"
            >
              <ShoppingCart className="w-5 h-5 mx-auto mb-2" />
              Add Item
            </button>
            <button 
              onClick={() => setActiveTab('bills')}
              className="p-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 font-semibold"
            >
              <DollarSign className="w-5 h-5 mx-auto mb-2" />
              Add Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Task Statistics */}
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tasks.length}</p>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Total Tasks</p>
            </div>
          </div>
        </div>
        
        <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{completedTasks}</p>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Completed</p>
            </div>
          </div>
        </div>
        
        <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{inProgressTasks}</p>
              <p className="text-slate-600 dark:text-slate-400 font-medium">In Progress</p>
            </div>
          </div>
        </div>
        
        <div className="group p-6 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20 dark:border-slate-700/30">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{pendingTasks}</p>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Task Form */}
      <div className="lg:col-span-1">
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/20 dark:border-slate-700/30 sticky top-8">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mr-4">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create Task</h2>
              <p className="text-slate-600 dark:text-slate-400">Add a new task to your list</p>
            </div>
          </div>
          <TaskForm onTaskCreate={handleTaskCreate} />
        </div>
      </div>
      
      {/* Task List */}
      <div className="lg:col-span-2">
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/20 dark:border-slate-700/30">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl mr-4">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your Tasks</h2>
                <p className="text-slate-600 dark:text-slate-400">{tasks.length} tasks in total</p>
              </div>
            </div>
            {tasks.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {Math.round((completedTasks / tasks.length) * 100)}% Complete
                </span>
              </div>
            )}
          </div>
          
          <TaskList 
            tasks={tasks} 
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
          />
        </div>
      </div>
    </div>
  );

  const renderChores = () => (
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
                <Home className="w-6 h-6 text-white" />
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
  );

  const renderBills = () => (
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
  );

  const renderPlaceholder = (type: string) => (
    <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/20 dark:border-slate-700/30 text-center">
      <div className="p-8">
        <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl inline-block mb-6">
          {type === 'grocery' && <ShoppingCart className="w-16 h-16 text-white" />}
          {type === 'maintenance' && <Wrench className="w-16 h-16 text-white" />}
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4 capitalize">{type} Management</h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg mb-8">
          {type === 'grocery' && 'Create and manage your grocery shopping lists'}
          {type === 'maintenance' && 'Schedule and track home maintenance tasks'}
        </p>
        <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105">
          Get Started with {type.charAt(0).toUpperCase() + type.slice(1)}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-r border-white/20 dark:border-slate-700/30 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-slate-700/30">
          <div className="flex items-center">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-3">
              <Home className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Household</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              className="w-full flex items-center px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-2xl transition-all duration-200 font-medium"
              onClick={() => router.push(item.href)}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-6 left-4 right-4">
          <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-2xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{user?.userName}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Admin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 font-medium"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Header */}
        <header className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border-b border-white/20 dark:border-slate-700/30">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Tab Navigation */}
            <nav className="flex space-x-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-2xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-xl transition-all duration-200 font-medium ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-lg'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center space-x-3">
              <NotificationBell />
              <button
                onClick={() => router.push('/profile')}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <User className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'tasks' && renderTasks()}
          {activeTab === 'chores' && renderChores()}
          {activeTab === 'bills' && renderBills()}
          {activeTab === 'grocery' && renderPlaceholder('grocery')}
          {activeTab === 'maintenance' && renderPlaceholder('maintenance')}
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}