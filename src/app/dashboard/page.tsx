'use client';

import { useState, useEffect, useCallback } from 'react';

// Types for job data
interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  postingDate: string;
  postingDays: number;
  source: 'LinkedIn' | 'Drushim.il';
  url: string;
  description: string;
  searchKeyword: string;
  scrapedAt: Date;
  isApplied: boolean;
  appliedDate?: Date;
  freshness: string;
  applicationStatus: string;
}

interface JobStats {
  totalJobs: number;
  appliedJobs: number;
  newJobs: number;
  linkedinJobs: number;
  drushimJobs: number;
}

interface JobsResponse {
  jobs: Job[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalJobs: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: JobStats;
}
import { useRouter } from 'next/navigation';
import { 
  User, 
  LogOut, 
  CheckCircle,
  Home,
  Settings,
  Menu,
  X,
  ArrowRight,
  Briefcase,
  Search,
  MapPin,
  Clock,
  ExternalLink,
  Filter,
  Play,
  Target,
  TrendingUp,
  Building2,
  Edit,
  Save,
  RotateCcw,
  Trash2,
  PlusCircle
} from 'lucide-react';



export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; userName: string } | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filter] = useState('all'); // 'all', 'unapplied', 'applied', 'recent'
  const [source, setSource] = useState('all'); // 'all', 'LinkedIn', 'Drushim.il'
  const [scraping, setScraping] = useState(false);
  const [searchConfig, setSearchConfig] = useState({
    linkedin: [
      'solution engineer Israel',
      'technical consultant Israel',
      'product manager Israel'
    ],
    drushim: [
      { position: 'Product Manager', experience: '0-2' },
      { position: 'Solution Engineer', experience: '0-2' },
      { position: 'Technical Consultant', experience: '0-2' }
    ]
  });
  const [editingConfig, setEditingConfig] = useState(false);
  const router = useRouter();

  const fetchJobs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('filter', filter);
      if (source !== 'all') params.set('source', source);
      params.set('limit', '50');
      
      const response = await fetch(`/api/jobs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: { result: JobsResponse } = await response.json();
        setJobs(data.result.jobs || []);
        setStats(data.result.stats || null);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  }, [router, filter, source]);

  const triggerJobScraping = async () => {
    setScraping(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/jobs/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ searchConfig }) // Use user's custom config
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Job scraping completed! Found ${data.result.jobCount} new jobs.`);
        fetchJobs(); // Refresh jobs list
      } else {
        const error = await response.json();
        alert(`❌ Job scraping failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error triggering job scraping:', error);
      alert('❌ Failed to start job scraping');
    } finally {
      setScraping(false);
    }
  };

  const markJobAsApplied = async (jobId: string, isApplied: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isApplied })
      });

      if (response.ok) {
        fetchJobs(); // Refresh jobs list
      } else {
        console.error('Failed to update job status');
      }
    } catch (error) {
      console.error('Error updating job:', error);
    }
  };

  const deleteJob = async (jobId: string) => {
    if (confirm('Are you sure you want to delete this job?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          fetchJobs(); // Refresh jobs list
        } else {
          console.error('Failed to delete job');
        }
      } catch (error) {
        console.error('Error deleting job:', error);
      }
    }
  };

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

    // Load saved search configuration
    const savedConfig = localStorage.getItem('jobSearchConfig');
    if (savedConfig) {
      try {
        setSearchConfig(JSON.parse(savedConfig));
      } catch {
        console.log('Error loading saved search config, using defaults');
      }
    }

    fetchJobs().finally(() => {
      setLoading(false);
    });
  }, [router, fetchJobs]);


  const handleSourceChange = (newSource: string) => {
    setSource(newSource);
  };

  // Refresh jobs when filters change
  useEffect(() => {
    if (!loading) {
      fetchJobs();
    }
  }, [filter, source, fetchJobs, loading]);

  // Job actions
  const openJobUrl = (url: string) => {
    window.open(url, '_blank');
  };

  const getFreshnessColor = (freshness: string) => {
    switch (freshness) {
      case 'Today': return 'bg-green-100 text-green-800';
      case 'Yesterday': return 'bg-blue-100 text-blue-800';
      case 'Hot': return 'bg-orange-100 text-orange-800';
      case 'This Week': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceIcon = (source: string) => {
    return source === 'LinkedIn' ? '💼' : '🇮🇱';
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
    { id: 'dashboard', label: 'Job Dashboard', icon: Home },
    { id: 'search', label: 'Job Search', icon: Search },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'jobs', label: 'All Jobs', icon: Briefcase },
    { id: 'unapplied', label: 'Not Applied', icon: Target },
    { id: 'applied', label: 'Applied', icon: CheckCircle },
    { id: 'scraper', label: 'Job Scraper', icon: Search },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="group bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 border border-white/20 dark:border-slate-700/30 hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all duration-300 cursor-pointer" onClick={() => setActiveTab('jobs')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {stats?.totalJobs || 0}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 font-medium">Total Jobs</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        Found opportunities
                      </p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>
              
              <div className="group bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 border border-white/20 dark:border-slate-700/30 hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all duration-300 cursor-pointer" onClick={() => setActiveTab('unapplied')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {stats ? (stats.totalJobs - stats.appliedJobs) : 0}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 font-medium">Not Applied</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        Ready to apply
                      </p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>
              
              <div className="group bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 border border-white/20 dark:border-slate-700/30 hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all duration-300 cursor-pointer" onClick={() => setActiveTab('applied')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {stats?.appliedJobs || 0}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 font-medium">Applied</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        Applications sent
                      </p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>
              
              <div className="group bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-6 border border-white/20 dark:border-slate-700/30 hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all duration-300 cursor-pointer" onClick={() => setActiveTab('scraper')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl mr-4 group-hover:scale-110 transition-transform">
                      <Search className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {stats?.newJobs || 0}
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 font-medium">New Jobs</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        Recent finds
                      </p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Job Sources Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">🎯 Job Sources</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                    <div className="flex items-center">
                      <Building2 className="w-6 h-6 text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">LinkedIn</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Professional Network</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats?.linkedinJobs || 0}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                    <div className="flex items-center">
                      <Briefcase className="w-6 h-6 text-green-600 mr-3" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">Drushim.il</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Israeli Job Portal</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {stats?.drushimJobs || 0}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Success Rate</p>
                      <p className="text-2xl font-bold">
                        {stats && stats.totalJobs > 0 ? Math.round((stats.appliedJobs / stats.totalJobs) * 100) : 0}%
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 opacity-80" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">🚀 Recent Jobs</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {jobs.slice(0, 5).map((job) => (
                    <div key={job._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm">{getSourceIcon(job.source)}</span>
                          <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                            {job.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {job.company} • {job.location}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${getFreshnessColor(job.freshness)}`}>
                            {job.freshness}
                          </span>
                          {job.isApplied && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                              Applied
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => openJobUrl(job.url)}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {jobs.length === 0 && (
                    <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                      <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No jobs found yet</p>
                      <p className="text-sm">Start by running the job scraper</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'jobs':
      case 'unapplied':  
      case 'applied':
        const filteredJobs = jobs.filter(job => {
          if (activeTab === 'unapplied') return !job.isApplied;
          if (activeTab === 'applied') return job.isApplied;
          return true; // 'jobs' shows all
        });

        return (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-slate-700/30">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <span className="font-medium text-slate-900 dark:text-slate-100">Filters:</span>
                </div>
                
                <select
                  value={source}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="all">All Sources</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Drushim.il">Drushim.il</option>
                </select>
                
                <button
                  onClick={fetchJobs}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Refresh
                </button>
                
                <div className="ml-auto text-sm text-slate-600 dark:text-slate-400">
                  Showing {filteredJobs.length} jobs
                </div>
              </div>
            </div>

            {/* Jobs List */}
            <div className="grid grid-cols-1 gap-4">
              {filteredJobs.map((job) => (
                <div key={job._id} className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 hover:bg-white/70 dark:hover:bg-slate-800/70 transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg">{getSourceIcon(job.source)}</span>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {job.title}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getFreshnessColor(job.freshness)}`}>
                          {job.freshness}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-3 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          <span>{job.company}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{job.postingDate}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{job.source}</span>
                        </div>
                      </div>
                      
                      {job.description && (
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                          {job.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {job.searchKeyword}
                        </span>
                        {job.isApplied && (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                            ✅ Applied {job.appliedDate ? new Date(job.appliedDate).toLocaleDateString() : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => openJobUrl(job.url)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Job
                      </button>
                      
                      <button
                        onClick={() => markJobAsApplied(job._id, !job.isApplied)}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          job.isApplied 
                            ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {job.isApplied ? 'Undo' : 'Mark Applied'}
                      </button>
                      
                      <button
                        onClick={() => deleteJob(job._id)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredJobs.length === 0 && (
                <div className="text-center py-12">
                  <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-2">
                    No jobs found
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {activeTab === 'applied' 
                      ? "You haven't applied to any jobs yet"
                      : activeTab === 'unapplied'
                      ? "No unapplied jobs available"
                      : "No jobs in your list yet"}
                  </p>
                  <button
                    onClick={() => setActiveTab('scraper')}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Start Job Search
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'scraper':
        const addLinkedInKeyword = () => {
          setSearchConfig(prev => ({
            ...prev,
            linkedin: [...prev.linkedin, '']
          }));
        };

        const removeLinkedInKeyword = (index: number) => {
          setSearchConfig(prev => ({
            ...prev,
            linkedin: prev.linkedin.filter((_, i) => i !== index)
          }));
        };

        const updateLinkedInKeyword = (index: number, value: string) => {
          setSearchConfig(prev => ({
            ...prev,
            linkedin: prev.linkedin.map((keyword, i) => i === index ? value : keyword)
          }));
        };

        const addDrushimSearch = () => {
          setSearchConfig(prev => ({
            ...prev,
            drushim: [...prev.drushim, { position: '', experience: '0-2' }]
          }));
        };

        const removeDrushimSearch = (index: number) => {
          setSearchConfig(prev => ({
            ...prev,
            drushim: prev.drushim.filter((_, i) => i !== index)
          }));
        };

        const updateDrushimSearch = (index: number, field: 'position' | 'experience', value: string) => {
          setSearchConfig(prev => ({
            ...prev,
            drushim: prev.drushim.map((search, i) => 
              i === index ? { ...search, [field]: value } : search
            )
          }));
        };

        const resetToDefaults = () => {
          setSearchConfig({
            linkedin: [
              'solution engineer Israel',
              'technical consultant Israel', 
              'product manager Israel'
            ],
            drushim: [
              { position: 'Product Manager', experience: '0-2' },
              { position: 'Solution Engineer', experience: '0-2' },
              { position: 'Technical Consultant', experience: '0-2' }
            ]
          });
          setEditingConfig(false);
        };

        const saveConfiguration = () => {
          // Filter out empty LinkedIn keywords
          const cleanConfig = {
            ...searchConfig,
            linkedin: searchConfig.linkedin.filter(keyword => keyword.trim() !== ''),
            drushim: searchConfig.drushim.filter(search => search.position.trim() !== '')
          };
          setSearchConfig(cleanConfig);
          setEditingConfig(false);
          // Optionally save to localStorage or database
          localStorage.setItem('jobSearchConfig', JSON.stringify(cleanConfig));
        };

        return (
          <div className="space-y-8">
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl mr-4">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Job Scraper</h2>
                    <p className="text-slate-600 dark:text-slate-400">Find new job opportunities automatically</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingConfig(!editingConfig)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    {editingConfig ? 'Cancel' : 'Edit Config'}
                  </button>
                  {editingConfig && (
                    <>
                      <button
                        onClick={saveConfiguration}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={resetToDefaults}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    💼 LinkedIn Keywords
                    {editingConfig && (
                      <button
                        onClick={addLinkedInKeyword}
                        className="p-1 text-blue-500 hover:text-blue-600 transition-colors"
                        title="Add keyword"
                      >
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    )}
                  </h3>
                  <div className="space-y-3">
                    {searchConfig.linkedin.map((keyword, index) => (
                      <div key={index} className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                        {editingConfig ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={keyword}
                              onChange={(e) => updateLinkedInKeyword(index, e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter LinkedIn search keyword"
                            />
                            <button
                              onClick={() => removeLinkedInKeyword(index)}
                              className="p-2 text-red-500 hover:text-red-600 transition-colors"
                              title="Remove keyword"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            • {keyword}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    🇮🇱 Drushim.il Searches
                    {editingConfig && (
                      <button
                        onClick={addDrushimSearch}
                        className="p-1 text-blue-500 hover:text-blue-600 transition-colors"
                        title="Add search"
                      >
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    )}
                  </h3>
                  <div className="space-y-3">
                    {searchConfig.drushim.map((search, index) => (
                      <div key={index} className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                        {editingConfig ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={search.position}
                                onChange={(e) => updateDrushimSearch(index, 'position', e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Job position"
                              />
                              <button
                                onClick={() => removeDrushimSearch(index)}
                                className="p-2 text-red-500 hover:text-red-600 transition-colors"
                                title="Remove search"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <select
                              value={search.experience}
                              onChange={(e) => updateDrushimSearch(index, 'experience', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="0-2">0-2 years experience</option>
                              <option value="2-5">2-5 years experience</option>
                              <option value="5-10">5-10 years experience</option>
                              <option value="10+">10+ years experience</option>
                              <option value="any">Any experience</option>
                            </select>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            • {search.position} ({search.experience} years)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Run Job Search Section */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/30">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">🚀 Run Job Search</h3>
                  <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold">Automatic Job Search</h4>
                        <p className="text-sm opacity-90">Scan LinkedIn & Drushim for new opportunities</p>
                      </div>
                      <Play className="w-8 h-8 opacity-80" />
                    </div>
                    
                    <button
                      onClick={triggerJobScraping}
                      disabled={scraping || editingConfig}
                      className={`w-full py-3 px-6 rounded-lg font-medium transition-all ${
                        scraping || editingConfig
                          ? 'bg-white/20 cursor-not-allowed' 
                          : 'bg-white/20 hover:bg-white/30 active:scale-95'
                      }`}
                    >
                      {scraping ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Searching for jobs...
                        </div>
                      ) : editingConfig ? (
                        'Save configuration first'
                      ) : (
                        'Start Job Search'
                      )}
                    </button>
                    
                    {editingConfig && (
                      <p className="text-xs opacity-75 mt-2 text-center">
                        Please save your configuration before running the search
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">📧 Email Notifications</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      You&apos;ll receive an email report with all new jobs found.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">🎯 Smart Filtering</h4>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Only new jobs are added - duplicates filtered out.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">⚙️ Custom Configuration</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Using your personalized search keywords and filters.
                    </p>
                  </div>
                </div>
              </div>
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
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Job Hunter</h1>
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
                <p className="text-xs text-slate-600 dark:text-slate-400">Job Seeker</p>
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
                    Track your job applications and opportunities
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Future: Add notification bell */}
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