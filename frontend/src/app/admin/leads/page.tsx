"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Mail, Phone, Briefcase, TrendingUp } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface Lead {
  id: string;
  lead_number: string;
  name: string;
  email?: string;
  phone: string;
  company?: string;
  project_description?: string;
  lead_type: string;
  qualification_score: number;
  status: string;
  budget_min?: number;
  budget_max?: number;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    fetchLeads();
  }, [minScore]);

  async function fetchLeads() {
    try {
      setLoading(true);
      const params: any = { page: 1, per_page: 20 };
      if (minScore > 0) params.min_score = minScore;

      const response = await api.get("/admin/leads", { params });
      setLeads(response.data.data);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateLeadStatus(leadId: string, newStatus: string) {
    try {
      await api.patch(/admin/leads/{leadId}/status, { status: newStatus });
      setLeads(leads.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    } catch (error) {
      alert("Failed to update lead status");
    }
  }

  const SCORE_COLORS = (score: number) => {
    if (score >= 70) return "bg-green-100 text-green-700";
    if (score >= 50) return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Project Leads</h1>

      <div className="flex gap-4">
        <button
          onClick={() => setMinScore(0)}
          className={px-4 py-2 rounded-lg }
        >
          All Leads
        </button>
        <button
          onClick={() => setMinScore(50)}
          className={px-4 py-2 rounded-lg }
        >
          Warm (50+)
        </button>
        <button
          onClick={() => setMinScore(70)}
          className={px-4 py-2 rounded-lg }
        >
          Hot (70+)
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-2">
            {leads.map((lead) => (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={p-4 border rounded-lg cursor-pointer hover:bg-gray-50 }
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{lead.name}</h3>
                    <p className="text-sm text-gray-600">{lead.lead_type}</p>
                    <p className="text-sm text-gray-900 mt-1">{lead.company}</p>
                  </div>
                  <div className="text-right">
                    <div className={px-3 py-1 rounded font-bold text-sm }>
                      {lead.qualification_score}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedLead && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Lead Details</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">NAME</p>
                  <p className="text-gray-900">{selectedLead.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">TYPE</p>
                  <p className="text-gray-900">{selectedLead.lead_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">SCORE</p>
                  <p className={	ext-lg font-bold }>
                    {selectedLead.qualification_score}/100
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">BUDGET</p>
                  <p className="text-gray-900">
                    {selectedLead.budget_min && selectedLead.budget_max
                      ? ৳ - ৳
                      : "Not specified"}
                  </p>
                </div>
                <button
                  onClick={() => updateLeadStatus(selectedLead.id, "qualified")}
                  className="w-full mt-6 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Mark as Qualified
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
