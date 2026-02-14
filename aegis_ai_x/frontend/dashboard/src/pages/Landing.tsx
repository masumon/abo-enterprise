import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    tier: 'free',
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    description: 'Get started with AI',
    features: [
      '20 messages per day',
      '500 messages per month',
      'GPT-4o Mini model',
      '10 conversations',
      'Basic chat features',
    ],
    cta: 'Get Started Free',
    popular: false,
    gradient: 'from-gray-600 to-gray-700',
  },
  {
    tier: 'go',
    name: 'Go',
    price: { monthly: 9.99, yearly: 99.99 },
    description: 'For everyday productivity',
    features: [
      '100 messages per day',
      '3,000 messages per month',
      'GPT-4o Mini + GPT-4o models',
      '100 conversations',
      'File upload support',
      'Web search',
    ],
    cta: 'Start with Go',
    popular: false,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: { monthly: 29.99, yearly: 299.99 },
    description: 'For professionals & teams',
    features: [
      '500 messages per day',
      '15,000 messages per month',
      'GPT-4o + Claude + Gemini',
      'Unlimited conversations',
      'Image generation',
      'Code execution',
      'AI Agents (Planner, Code, Automation)',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
    gradient: 'from-violet-500 to-fuchsia-500',
  },
  {
    tier: 'ultra_pro',
    name: 'Ultra Pro',
    price: { monthly: 79.99, yearly: 799.99 },
    description: 'Maximum power, zero limits',
    features: [
      'Unlimited messages',
      'All AI models including Claude Opus 4.6',
      'Unlimited conversations',
      'Image generation',
      'Code execution sandbox',
      'Custom AI agents',
      'API access',
      'Priority queue',
      'Priority support',
    ],
    cta: 'Go Ultra Pro',
    popular: false,
    gradient: 'from-amber-500 to-orange-500',
  },
];

const FEATURES = [
  {
    icon: '~',
    title: 'Multi-AI Engine',
    description: 'Access GPT-4o, Claude, Gemini, and local models — all in one place. Automatically picks the best AI for your task.',
  },
  {
    icon: '#',
    title: 'Code Generation & Execution',
    description: 'Write, review, and run code in a secure sandbox. Python, JavaScript, Go, and more.',
  },
  {
    icon: '@',
    title: 'AI Agents',
    description: 'Specialized agents for planning, coding, and automation. They work together to complete complex tasks.',
  },
  {
    icon: '!',
    title: 'Enterprise Security',
    description: 'Code vulnerability scanning, approval workflows, audit logs, and role-based access control.',
  },
  {
    icon: '%',
    title: 'Full Monitoring',
    description: 'Real-time dashboards with Prometheus & Grafana. Track usage, costs, and performance.',
  },
  {
    icon: '*',
    title: 'Self-Hosted',
    description: 'Deploy on your own servers. Your data stays with you. Multi-cloud support (AWS, GCP, Azure).',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            <span className="text-xl font-bold">SUMONIX AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm mb-8">
            Powered by GPT-4o, Claude, Gemini & more
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
            The AI Platform
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              That Does It All
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Chat, code, create, and automate with the most powerful AI models.
            One platform, unlimited possibilities. Built for everyone.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl text-white font-semibold text-lg transition-all shadow-lg shadow-violet-500/25"
            >
              Start Free Now
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-white font-semibold text-lg transition-all"
            >
              View Demo
            </button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              ['6+', 'AI Models'],
              ['3', 'AI Agents'],
              ['99.9%', 'Uptime'],
              ['24/7', 'Support'],
            ].map(([val, label]) => (
              <div key={label}>
                <div className="text-3xl font-bold text-white">{val}</div>
                <div className="text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Everything you need in one platform
          </h2>
          <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            From casual conversations to enterprise automation, SUMONIX AI handles it all.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-6 bg-gray-800/50 border border-gray-700 rounded-2xl hover:border-violet-500/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 text-2xl mb-4">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-400 text-center mb-8 max-w-2xl mx-auto">
            Start free, upgrade when you need more. Cancel anytime.
          </p>

          {/* Toggle */}
          <div className="flex justify-center mb-12">
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
                Yearly
                <span className="ml-2 text-xs text-green-400">Save 17%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.tier}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.popular
                    ? 'border-violet-500 bg-gray-800/80 shadow-xl shadow-violet-500/10'
                    : 'border-gray-700 bg-gray-800/50'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-violet-600 rounded-full text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${plan.gradient} flex items-center justify-center text-white font-bold text-sm mb-4`}>
                  {plan.name[0]}
                </div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-gray-400 text-sm mt-1 mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-white">
                    ${isYearly ? plan.price.yearly : plan.price.monthly}
                  </span>
                  <span className="text-gray-400 text-sm">
                    /{isYearly ? 'year' : 'month'}
                  </span>
                </div>
                <ul className="flex-1 space-y-3 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-green-400 mt-0.5">+</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/login')}
                  className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${
                    plan.popular
                      ? 'bg-violet-600 hover:bg-violet-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          {[
            ['What AI models are available?', 'SUMONIX AI supports GPT-4o, GPT-4o Mini, Claude Sonnet 4.5, Claude Opus 4.6, Gemini 2.0 Flash, Gemini 2.5 Pro, and local models via Ollama. Model availability depends on your plan.'],
            ['Can I self-host SUMONIX AI?', 'Yes! SUMONIX AI is designed for self-hosting. Deploy on your own servers using Docker, Kubernetes, or cloud platforms (AWS, GCP, Azure). Your data stays with you.'],
            ['How does billing work?', 'We offer monthly and yearly billing. Yearly plans save 17%. You can upgrade, downgrade, or cancel anytime. Free tier is always available.'],
            ['Is there an API?', 'Ultra Pro subscribers get full API access to build custom integrations and automate workflows programmatically.'],
            ['What about data privacy?', 'Your conversations are encrypted and stored securely. We never use your data to train models. Self-hosted deployments give you complete data control.'],
          ].map(([q, a], i) => (
            <div key={i} className="border-b border-gray-800 py-6">
              <h3 className="text-lg font-semibold text-white mb-2">{q}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-400 mb-8">Join thousands of users who already trust SUMONIX AI</p>
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 rounded-xl text-white font-semibold text-lg transition-all shadow-lg shadow-violet-500/25"
          >
            Start Free Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xs">
              S
            </div>
            <span className="text-lg font-bold">SUMONIX AI</span>
          </div>
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} SUMONIX AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
