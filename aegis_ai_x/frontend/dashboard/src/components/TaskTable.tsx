import React from 'react';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  created_at: string;
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-500/10 text-green-400 ring-green-500/20',
  running: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  pending: 'bg-gray-500/10 text-gray-400 ring-gray-500/20',
  failed: 'bg-red-500/10 text-red-400 ring-red-500/20',
  cancelled: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
  awaiting_approval: 'bg-purple-500/10 text-purple-400 ring-purple-500/20',
};

interface TaskTableProps {
  tasks: Task[];
  onCancel?: (id: string) => void;
}

export default function TaskTable({ tasks, onCancel }: TaskTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Title</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Priority</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Created</th>
            <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="py-3 px-4 text-white">{task.title}</td>
              <td className="py-3 px-4">
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${statusColors[task.status] || statusColors.pending}`}>
                  {task.status}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-300">{task.priority}</td>
              <td className="py-3 px-4 text-gray-400">
                {new Date(task.created_at).toLocaleDateString()}
              </td>
              <td className="py-3 px-4 text-right">
                {['pending', 'running', 'queued'].includes(task.status) && onCancel && (
                  <button
                    onClick={() => onCancel(task.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-500">
                No tasks found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
