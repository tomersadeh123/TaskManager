import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Task from '@/models/Task';
import Chore from '@/models/Chore';
import Bill from '@/models/Bill';
import GroceryList from '@/models/GroceryList';
import MaintenanceItem from '@/models/MaintenanceItem';
import { verifyToken } from '@/utils/jwt';
import User from '@/models/User';
import { logger } from '@/lib/logger';

// GET /api/dashboard/overview - Get Dashboard Overview Stats
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  logger.logRequest(request, requestId);
  try {
    // Parse token first
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // Connect to database AFTER token validation
    await connectDB();

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const userId = user._id;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Tasks Statistics
    const [totalTasks, completedTasks, pendingTasks, inProgressTasks] = await Promise.all([
      Task.countDocuments({ user: userId }),
      Task.countDocuments({ user: userId, status: 'completed' }),
      Task.countDocuments({ user: userId, status: 'pending' }),
      Task.countDocuments({ user: userId, status: 'in-progress' })
    ]);

    // Chores Statistics
    const [
      totalChores,
      overdueChores,
      choresDueToday,
      completedChoresThisWeek
    ] = await Promise.all([
      Chore.countDocuments({ 
        $or: [{ assignedTo: userId }, { createdBy: userId }],
        isActive: true 
      }),
      Chore.countDocuments({ 
        $or: [{ assignedTo: userId }, { createdBy: userId }],
        isActive: true,
        nextDue: { $lt: today }
      }),
      Chore.countDocuments({ 
        $or: [{ assignedTo: userId }, { createdBy: userId }],
        isActive: true,
        nextDue: {
          $gte: today.setHours(0, 0, 0, 0),
          $lt: tomorrow.setHours(0, 0, 0, 0)
        }
      }),
      Chore.countDocuments({ 
        $or: [{ assignedTo: userId }, { createdBy: userId }],
        lastCompleted: { 
          $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) 
        }
      })
    ]);

    // Bills Statistics
    const [
      totalBills,
      unpaidBills,
      overdueBills,
      upcomingBills,
      totalUnpaidAmount
    ] = await Promise.all([
      Bill.countDocuments({ user: userId }),
      Bill.countDocuments({ user: userId, isPaid: false }),
      Bill.countDocuments({ 
        user: userId, 
        isPaid: false, 
        dueDate: { $lt: today } 
      }),
      Bill.countDocuments({ 
        user: userId, 
        isPaid: false,
        dueDate: { $gte: today, $lte: nextWeek }
      }),
      Bill.aggregate([
        { 
          $match: { 
            user: userId, 
            isPaid: false 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: '$amount' } 
          } 
        }
      ])
    ]);

    // Grocery Lists Statistics
    const [
      activeGroceryLists,
      totalGroceryItems,
      completedGroceryItems
    ] = await Promise.all([
      GroceryList.countDocuments({
        $or: [
          { createdBy: userId },
          { 'sharedWith.user': userId }
        ],
        isActive: true
      }),
      GroceryList.aggregate([
        {
          $match: {
            $or: [
              { createdBy: userId },
              { 'sharedWith.user': userId }
            ],
            isActive: true
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalItems' }
          }
        }
      ]),
      GroceryList.aggregate([
        {
          $match: {
            $or: [
              { createdBy: userId },
              { 'sharedWith.user': userId }
            ],
            isActive: true
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$completedItems' }
          }
        }
      ])
    ]);

    // Maintenance Statistics
    const [
      totalMaintenanceItems,
      pendingMaintenance,
      overdueMaintenance,
      completedMaintenanceThisMonth
    ] = await Promise.all([
      MaintenanceItem.countDocuments({ user: userId }),
      MaintenanceItem.countDocuments({ 
        user: userId, 
        status: 'pending' 
      }),
      MaintenanceItem.countDocuments({ 
        user: userId, 
        status: { $in: ['pending', 'in_progress'] },
        scheduledDate: { $lt: today }
      }),
      MaintenanceItem.countDocuments({ 
        user: userId, 
        status: 'completed',
        completedDate: { 
          $gte: new Date(today.getFullYear(), today.getMonth(), 1) 
        }
      })
    ]);

    // Recent Activity (last 7 days)
    const recentActivity = await Promise.all([
      Task.find({ 
        user: userId, 
        updatedAt: { $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) }
      })
      .select('title status updatedAt')
      .sort({ updatedAt: -1 })
      .limit(5),
      
      Chore.find({ 
        $or: [{ assignedTo: userId }, { createdBy: userId }],
        lastCompleted: { $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) }
      })
      .select('title lastCompleted')
      .populate('assignedTo', 'userName')
      .sort({ lastCompleted: -1 })
      .limit(5),
      
      Bill.find({ 
        user: userId, 
        paidDate: { $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) }
      })
      .select('name amount paidDate')
      .sort({ paidDate: -1 })
      .limit(5)
    ]);

    const overview = {
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      chores: {
        total: totalChores,
        overdue: overdueChores,
        dueToday: choresDueToday,
        completedThisWeek: completedChoresThisWeek
      },
      bills: {
        total: totalBills,
        unpaid: unpaidBills,
        overdue: overdueBills,
        upcoming: upcomingBills,
        totalUnpaidAmount: totalUnpaidAmount[0]?.total || 0
      },
      grocery: {
        activeLists: activeGroceryLists,
        totalItems: totalGroceryItems[0]?.total || 0,
        completedItems: completedGroceryItems[0]?.total || 0,
        completionRate: totalGroceryItems[0]?.total > 0 ? 
          Math.round((completedGroceryItems[0]?.total / totalGroceryItems[0]?.total) * 100) : 0
      },
      maintenance: {
        total: totalMaintenanceItems,
        pending: pendingMaintenance,
        overdue: overdueMaintenance,
        completedThisMonth: completedMaintenanceThisMonth
      },
      recentActivity: {
        tasks: recentActivity[0],
        chores: recentActivity[1],
        bills: recentActivity[2]
      }
    };

    const duration = Date.now() - startTime;
    logger.logResponse(requestId, 200, duration, user._id.toString());
    logger.logBusinessEvent('dashboard_viewed', user._id.toString(), 'dashboard', undefined, {
      totalTasks: overview.tasks.total,
      totalBills: overview.bills.total,
      totalChores: overview.chores.total
    });
    
    return NextResponse.json({ result: overview });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error fetching dashboard overview', error as Error, { requestId, duration });
    logger.logResponse(requestId, 500, duration);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}