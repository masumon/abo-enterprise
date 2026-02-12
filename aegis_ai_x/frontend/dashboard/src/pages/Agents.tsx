import React, { useEffect, useState } from 'react';
import { agentsAPI } from '../api/endpoints';

interface Agent {
  id: string;
  name: string;
  agent_type: string;
  description: string | null;
  llm_provider: string;
  llm_model: string;
  is_active: boolean;
}

const agentTypeColors: Record<string, string> = {
  planner: 'bg-purple-500/10 text-purple-400',
  code: 'bg-blue-500/10 text-blue-400',
  automation: 'bg-green-500/10 text-green-400',
};

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentsAPI.list()
      .then(({ data }) => setAgents(data.agents))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Agents</h1>
          <p className="text-gray-400 mt-1">Manage your AI agent configurations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Default agent type cards */}
        {['planner', 'code', 'automation'].map((type) => (
          <div key={type} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${agentTypeColors[type]}`}>
                {type}
              </span>
              <span className="text-xs text-gray-500">
                {agents.filter(a => a.agent_type === type).length} configured
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white capitalize mb-2">{type} Agent</h3>
            <p className="text-sm text-gray-400 mb-4">
              {type === 'planner' && 'Architecture design, task decomposition, and planning'}
              {type === 'code' && 'Code generation, review, debugging, and testing'}
              {type === 'automation' && 'CI/CD pipelines, deployment, and DevOps automation'}
            </p>
            <div className="space-y-2">
              {agents.filter(a => a.agent_type === type).map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                  <span className="text-sm text-white">{agent.name}</span>
                  <span className="text-xs text-gray-500">{agent.llm_provider}/{agent.llm_model}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center text-gray-400 mt-8">Loading agents...</div>
      )}
    </div>
  );
}
