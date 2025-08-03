'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  LogOut, 
  Plus, 
  CheckCircle,
  Home,
  Calendar,
  Bell,
  Settings,
  List,
  Users,
  ShoppingCart,
  DollarSign,
  Wrench,
  Menu,
  X
} from 'lucide-react';
import TaskList from '@/components/TaskList';
import TaskForm from '@/components/forms/TaskForm';
import ChoreForm from '@/components/household/ChoreForm';
import ChoreList from '@/components/household/ChoreList';
import BillForm from '@/components/household/BillForm';
import BillList from '@/components/household/BillList';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
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

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; userName: string } | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

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
    // Mock data for now - will be replaced with actual API call
    setChores([]);
  }, []);

  const fetchBills = useCallback(async () => {
    // Mock data for now - will be replaced with actual API call
    setBills([]);
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

    Promise.all([fetchTasks(), fetchChores(), fetchBills()]).finally(() => {
      setLoading(false);
    });
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
        fetchTasks(); // Refresh tasks
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
        fetchTasks(); // Refresh tasks
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
          fetchTasks(); // Refresh tasks
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
    // Mock implementation - will be replaced with actual API call
    console.log('Creating chore:', choreData);
  };

  const handleChoreUpdate = async (choreId: string, updates: Partial<Chore>) => {
    // Mock implementation - will be replaced with actual API call
    console.log('Updating chore:', choreId, updates);
  };

  const handleChoreDelete = async (choreId: string) => {
    // Mock implementation - will be replaced with actual API call
    console.log('Deleting chore:', choreId);
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
    // Mock implementation - will be replaced with actual API call
    console.log('Creating bill:', billData);
  };

  const handleBillUpdate = async (billId: string, updates: Partial<Bill>) => {
    // Mock implementation - will be replaced with actual API call
    console.log('Updating bill:', billId, updates);
  };

  const handleBillDelete = async (billId: string) => {
    // Mock implementation - will be replaced with actual API call
    console.log('Deleting bill:', billId);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleSidebarNavigation = (itemId: string) => {
    switch (itemId) {
      case 'profile':
        router.push('/profile');
        break;
      case 'dashboard':
        // Already on dashboard, maybe scroll to top or refresh
        break;
      case 'calendar':
        // Future implementation
        break;
      case 'notifications':
        // Future implementation
        break;
      case 'settings':
        // Future implementation
        break;
      default:
        break;
    }
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

  // Calculate task statistics (used in overview tab)
  // const completedTasks = tasks.filter(task => task.status === 'completed').length;
  // const pendingTasks = tasks.filter(task => task.status === 'pending').length;
  // const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: List },
    { id: 'chores', label: 'Chores', icon: Users },
    { id: 'grocery', label: 'Grocery', icon: ShoppingCart },
    { id: 'bills', label: 'Bills', icon: DollarSign },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 border border-white/20 dark:border-slate-700/30">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mr-4">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tasks.length}</p>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Total Tasks</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 border border-white/20 dark:border-slate-700/30">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mr-4">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{chores.length}</p>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Active Chores</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 border border-white/20 dark:border-slate-700/30">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl mr-4">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{bills.length}</p>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Pending Bills</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 border border-white/20 dark:border-slate-700/30">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl mr-4">
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">0</p>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">Maintenance</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Recent Activity</h3>
              <div className="text-slate-600 dark:text-slate-400 text-center py-8">
                No recent activity to display
              </div>
            </div>
          </div>
        );
      case 'tasks':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30 sticky top-8">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mr-4">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create Task</h2>
                    <p className="text-slate-600 dark:text-slate-400">Add a new task</p>
                  </div>
                </div>
                <TaskForm onTaskCreate={handleTaskCreate} />
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl mr-4">
                      <List className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Your Tasks</h2>
                      <p className="text-slate-600 dark:text-slate-400">{tasks.length} tasks in total</p>
                    </div>
                  </div>
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
      case 'chores':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30 sticky top-8">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mr-4">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create Chore</h2>
                    <p className="text-slate-600 dark:text-slate-400">Add a new chore</p>
                  </div>
                </div>
                <ChoreForm onChoreCreate={handleChoreCreate} />
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mr-4">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Household Chores</h2>
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
      case 'grocery':
        return (
          <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mr-4">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Grocery Lists</h2>
                <p className="text-slate-600 dark:text-slate-400">Manage your grocery shopping</p>
              </div>
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-center py-16">
              Grocery list feature coming soon! 🛒
            </div>
          </div>
        );
      case 'bills':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30 sticky top-8">
                <div className="flex items-center mb-6">
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mr-4">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add Bill</h2>
                    <p className="text-slate-600 dark:text-slate-400">Track a new bill</p>
                  </div>
                </div>
                <BillForm onBillCreate={handleBillCreate} />
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl mr-4">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Bills & Payments</h2>
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
      case 'maintenance':
        return (
          <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl mr-4">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Maintenance Tasks</h2>
                <p className="text-slate-600 dark:text-slate-400">Keep track of home maintenance</p>
              </div>
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-center py-16">
              Maintenance tracking feature coming soon! 🔧
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-r border-white/20 dark:border-slate-700/30 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/20 dark:border-slate-700/30">
          <div className="flex items-center">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-3">
              <Home className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Household</h1>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSidebarNavigation(item.id)}
              className="w-full flex items-center px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors font-medium"
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-slate-600/30">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {user?.userName || 'User'}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Household Admin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors text-sm font-medium"
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
        <header className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-b border-white/20 dark:border-slate-700/30">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 mr-4"
                >
                  <Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Welcome back, {user?.userName || 'User'}!
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Manage your household efficiently
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 relative">
                  <Bell className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-b border-white/20 dark:border-slate-700/30">
          <div className="px-6">
            <div className="flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <tab.icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <main className="p-6">
          {renderTabContent()}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}