"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Loader2, ScrollText } from "lucide-react";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<{ id: string; action: string; entity_type: string; entity_id: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.listAuditLogs()
      .then((r) => setLogs(r.data.data ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="w-6 h-6 text-brand-600" />
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="table-premium">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Entity</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="text-gray-500 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td><span className="badge bg-gray-100 text-gray-700">{log.action}</span></td>
                  <td>{log.entity_type}</td>
                  <td className="text-xs text-gray-400 font-mono">{log.entity_id?.slice(0, 8) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <p className="p-8 text-center text-gray-500">No audit logs yet</p>}
        </div>
      )}
    </div>
  );
}
