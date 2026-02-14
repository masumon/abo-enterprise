import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface AdminStats {
  total_users: number;
  active_subscriptions: number;
  total_conversations: number;
  total_messages: number;
  revenue_monthly: number;
}

export default function Admin() {
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    active_subscriptions: 0,
    total_conversations: 0,
    total_messages: 0,
    revenue_monthly: 0,
  });
  const [tab, setTab] = useState<'overview' | 'users' | 'subscriptions'>('overview');

  // In production, these would be real API calls
  useEffect(() => {
    setStats({
      total_users: 1247,
      active_subscriptions: 389,
      total_conversations: 15840,
      total_messages: 284520,
      revenue_monthly: 8750.50,
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <p className="text-gray-400 mt-1">Manage users, subscriptions, and platform settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1 mb-8 w-fit">
        {(['overview', 'users', 'subscriptions'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Users', value: stats.total_users.toLocaleString(), color: 'text-blue-400' },
              { label: 'Active Subs', value: stats.active_subscriptions.toLocaleString(), color: 'text-green-400' },
              { label: 'Conversations', value: stats.total_conversations.toLocaleString(), color: 'text-purple-400' },
              { label: 'Total Messages', value: stats.total_messages.toLocaleString(), color: 'text-cyan-400' },
              { label: 'Monthly Revenue', value: `$${stats.revenue_monthly.toLocaleString()}`, color: 'text-amber-400' },
            ].map((stat) => (
              <div key={stat.label} className="p-5 bg-gray-800/50 border border-gray-700 rounded-2xl">
                <div className="text-sm text-gray-400 mb-1">{stat.label}</div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Revenue Chart Placeholder */}
          <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-2xl mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue Overview</h3>
            <div className="h-48 flex items-end gap-2">
              {[40, 55, 70, 45, 80, 90, 65, 75, 85, 95, 70, 88].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-gradient-to-t from-violet-600 to-fuchsia-500 rounded-t-lg transition-all hover:opacity-80"
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-xs text-gray-500">
                    {['J','F','M','A','M','J','J','A','S','O','N','D'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Distribution */}
          <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Subscription Distribution</h3>
            <div className="space-y-4">
              {[
                { plan: 'Free', count: 858, pct: 69, color: 'bg-gray-500' },
                { plan: 'Go', count: 198, pct: 16, color: 'bg-blue-500' },
                { plan: 'Pro', count: 142, pct: 11, color: 'bg-violet-500' },
                { plan: 'Ultra Pro', count: 49, pct: 4, color: 'bg-amber-500' },
              ].map((item) => (
                <div key={item.plan} className="flex items-center gap-4">
                  <span className="w-24 text-sm text-gray-300">{item.plan}</span>
                  <div className="flex-1 h-3 bg-gray-700 rounded-full">
                    <div className={`h-3 ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                  </div>
                  <span className="text-sm text-gray-400 w-20 text-right">{item.count} ({item.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'users' && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Users</h3>
            <input
              type="text"
              placeholder="Search users..."
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 w-64"
            />
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {[
                { username: 'admin', email: 'admin@sumonix.ai', role: 'admin', active: true, date: '2024-01-15' },
                { username: 'john_dev', email: 'john@example.com', role: 'developer', active: true, date: '2024-02-20' },
                { username: 'sarah_ops', email: 'sarah@company.io', role: 'operator', active: true, date: '2024-03-10' },
                { username: 'guest_user', email: 'guest@test.com', role: 'viewer', active: false, date: '2024-04-05' },
              ].map((u) => (
                <tr key={u.username} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-white text-sm font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{u.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'subscriptions' && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold text-white">Active Subscriptions</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Billing</th>
                <th className="px-4 py-3">Messages Used</th>
              </tr>
            </thead>
            <tbody>
              {[
                { user: 'john_dev', plan: 'Pro', status: 'active', billing: 'Monthly', msgs: '342/500' },
                { user: 'sarah_ops', plan: 'Ultra Pro', status: 'active', billing: 'Yearly', msgs: '1,205/Unlimited' },
                { user: 'admin', plan: 'Ultra Pro', status: 'active', billing: 'Monthly', msgs: '89/Unlimited' },
              ].map((s, i) => (
                <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-white text-sm font-medium">{s.user}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400">
                      {s.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{s.billing}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{s.msgs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
