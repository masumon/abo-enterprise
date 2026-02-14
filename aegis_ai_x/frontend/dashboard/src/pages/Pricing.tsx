import React, { useEffect, useState } from 'react';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useNavigate } from 'react-router-dom';

export default function Pricing() {
  const { plans, current, usage, fetchPlans, fetchCurrent, fetchUsage, upgrade } = useSubscriptionStore();
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
    fetchCurrent();
    fetchUsage();
  }, []);

  const handleUpgrade = async (tier: string) => {
    setLoading(tier);
    try {
      await upgrade(tier, isYearly ? 'yearly' : 'monthly');
      await fetchCurrent();
      await fetchUsage();
    } catch {
      // error handled in store
    }
    setLoading(null);
  };

  const planGradients: Record<string, string> = {
    free: 'from-gray-600 to-gray-700',
    go: 'from-blue-500 to-cyan-500',
    pro: 'from-violet-500 to-fuchsia-500',
    ultra_pro: 'from-amber-500 to-orange-500',
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Plans & Billing</h1>
        <p className="text-gray-400 mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current Plan Card */}
      {current && (
        <div className="mb-8 p-6 bg-gray-800/50 border border-gray-700 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm text-gray-400">Current Plan</span>
              <h3 className="text-xl font-bold text-white capitalize">{current.tier.replace('_', ' ')}</h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              current.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {current.status}
            </span>
          </div>
          {usage && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Daily Messages</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full">
                    <div
                      className="h-2 bg-violet-500 rounded-full transition-all"
                      style={{ width: `${Math.min(usage.percentage_daily, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {usage.messages_today}/{usage.daily_limit === -1 ? '\u221e' : usage.daily_limit}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Monthly Messages</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full">
                    <div
                      className="h-2 bg-fuchsia-500 rounded-full transition-all"
                      style={{ width: `${Math.min(usage.percentage_monthly, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {usage.messages_month}/{usage.monthly_limit === -1 ? '\u221e' : usage.monthly_limit}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Tokens Used</div>
                <div className="text-lg font-semibold text-white">
                  {(usage.tokens_month).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => setIsYearly(false)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              !isYearly ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              isYearly ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Yearly <span className="text-xs text-green-400 ml-1">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.tier}
            className={`relative rounded-2xl border p-6 flex flex-col ${
              plan.is_current
                ? 'border-violet-500 bg-gray-800/80 ring-2 ring-violet-500/20'
                : 'border-gray-700 bg-gray-800/50'
            }`}
          >
            {plan.is_current && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-violet-600 rounded-full text-xs font-medium text-white">
                Current Plan
              </div>
            )}
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${planGradients[plan.tier] || 'from-gray-600 to-gray-700'} flex items-center justify-center text-white font-bold text-sm mb-4`}>
              {plan.name[0]}
            </div>
            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-extrabold text-white">
                ${isYearly ? plan.price_yearly : plan.price_monthly}
              </span>
              <span className="text-gray-400 text-sm">/{isYearly ? 'year' : 'month'}</span>
            </div>
            <ul className="flex-1 space-y-2 mb-6">
              <li className="text-sm text-gray-300">
                {plan.limits.messages_per_day === -1 ? 'Unlimited' : plan.limits.messages_per_day} msgs/day
              </li>
              <li className="text-sm text-gray-300">
                {plan.limits.messages_per_month === -1 ? 'Unlimited' : plan.limits.messages_per_month} msgs/month
              </li>
              <li className="text-sm text-gray-300">
                {plan.limits.models?.length || 0} AI models
              </li>
              {plan.limits.file_uploads && <li className="text-sm text-green-400">+ File uploads</li>}
              {plan.limits.image_generation && <li className="text-sm text-green-400">+ Image generation</li>}
              {plan.limits.code_execution && <li className="text-sm text-green-400">+ Code execution</li>}
              {plan.limits.priority_support && <li className="text-sm text-green-400">+ Priority support</li>}
            </ul>
            <button
              onClick={() => !plan.is_current && handleUpgrade(plan.tier)}
              disabled={plan.is_current || loading === plan.tier}
              className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${
                plan.is_current
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              {loading === plan.tier ? 'Processing...' : plan.is_current ? 'Current Plan' : `Upgrade to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
