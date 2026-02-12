import React, { useEffect, useState } from 'react';
import MetricsCard from '../components/MetricsCard';
import { analyticsAPI } from '../api/endpoints';

interface DashboardMetrics {
  total_tasks: number;
  tasks_by_status: Record<string, number>;
  success_rate: number;
  total_cost: number;
  active_agents: number;
  active_users: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.dashboard({ days: 30 })
      .then(({ data }) => setMetrics(data))
      .catch(() => {
        // Use placeholder data when API is unavailable
        setMetrics({
          total_tasks: 0,
          tasks_by_status: {},
          success_rate: 0,
          total_cost: 0,
          active_agents: 0,
          active_users: 0,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your AI platform activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricsCard
          title="Total Tasks"
          value={metrics?.total_tasks ?? 0}
          subtitle="Last 30 days"
          icon="☰"
        />
        <MetricsCard
          title="Success Rate"
          value={`${metrics?.success_rate ?? 0}%`}
          subtitle="Completion rate"
          icon="✓"
        />
        <MetricsCard
          title="Active Agents"
          value={metrics?.active_agents ?? 0}
          subtitle="Currently configured"
          icon="⚙"
        />
        <MetricsCard
          title="Total Cost"
          value={`$${metrics?.total_cost?.toFixed(2) ?? '0.00'}`}
          subtitle="LLM API costs"
          icon="$"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tasks by Status</h2>
          <div className="space-y-3">
            {Object.entries(metrics?.tasks_by_status ?? {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-gray-400 capitalize">{status.replace('_', ' ')}</span>
                <span className="text-sm font-medium text-white">{count}</span>
              </div>
            ))}
            {Object.keys(metrics?.tasks_by_status ?? {}).length === 0 && (
              <p className="text-gray-500 text-sm">No tasks yet</p>
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a href="/tasks" className="block p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
              <p className="text-sm font-medium text-white">Create New Task</p>
              <p className="text-xs text-gray-400 mt-1">Submit a task for AI agent processing</p>
            </a>
            <a href="/agents" className="block p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
              <p className="text-sm font-medium text-white">Configure Agents</p>
              <p className="text-xs text-gray-400 mt-1">Set up and manage your AI agents</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
