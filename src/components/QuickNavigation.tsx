'use client';

import { useRouter } from 'next/navigation';
import { 
  DollarSign, 
  CheckSquare, 
  Users, 
  Home,
  User
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  color: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/dashboard',
    color: 'from-blue-500 to-blue-600',
    description: 'Overview of everything'
  },
  {
    id: 'bills',
    label: 'Bills',
    icon: DollarSign,
    path: '/bills',
    color: 'from-green-500 to-emerald-600',
    description: 'Manage household bills'
  },
  {
    id: 'chores',
    label: 'Chores',
    icon: CheckSquare,
    path: '/chores',
    color: 'from-purple-500 to-indigo-600',
    description: 'Track household tasks'
  },
  {
    id: 'household',
    label: 'Household',
    icon: Users,
    path: '/household',
    color: 'from-orange-500 to-red-600',
    description: 'Manage household members'
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    path: '/profile',
    color: 'from-pink-500 to-rose-600',
    description: 'Your account settings'
  }
];

interface QuickNavigationProps {
  currentPage?: string;
  compact?: boolean;
}

export default function QuickNavigation({ currentPage, compact = false }: QuickNavigationProps) {
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  if (compact) {
    // Compact version for smaller spaces
    return (
      <div className="flex space-x-2">
        {navItems
          .filter(item => item.id !== currentPage)
          .slice(0, 4)
          .map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className="group p-2 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all duration-300 transform hover:scale-105"
                title={item.description}
              >
                <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100" />
              </button>
            );
          })}
      </div>
    );
  }

  // Full navigation grid
  return (
    <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 dark:border-slate-700/30">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Quick Navigation</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {navItems
          .filter(item => item.id !== currentPage)
          .map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className="group p-4 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-all duration-300 transform hover:scale-105 text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 bg-gradient-to-r ${item.color} rounded-xl group-hover:scale-110 transition-transform`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {item.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}