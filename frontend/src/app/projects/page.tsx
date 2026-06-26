"use client";

import { useState } from "react";
import LeadForm from "@/components/projects/LeadForm";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function ProjectsPage() {
  const [showForm, setShowForm] = useState(false);

  const HOW_IT_WORKS = [
    {
      step: 1,
      title: "Submit Your Requirements",
      description: "Tell us about your project, timeline, and budget",
    },
    {
      step: 2,
      title: "Get a Custom Quote",
      description: "We analyze your needs and provide a detailed proposal",
    },
    {
      step: 3,
      title: "Consultation Call",
      description: "Discuss your project with our expert team",
    },
    {
      step: 4,
      title: "Project Kickoff",
      description: "Start building your solution with a dedicated team",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Custom Projects
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Need a bespoke solution? Tell us your vision and we'll bring it to life.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
          How It Works
        </h2>

        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {HOW_IT_WORKS.map(({ step, title, description }, index) => (
            <div key={step} className="relative">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mb-4">
                  {step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-center">
                  {title}
                </h3>
                <p className="text-sm text-gray-600 text-center">
                  {description}
                </p>
              </div>

              {/* Arrow */}
              {index < HOW_IT_WORKS.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 transform translate-x-1/2 -translate-y-1/2">
                  <ArrowRight className="w-6 h-6 text-blue-300 rotate-0 md:rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      {!showForm && (
        <section className="bg-white border-y">
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to start your project?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Get a free consultation and custom quote from our expert team.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-block"
            >
              Get Started Today
            </button>
          </div>
        </section>
      )}

      {/* Form Section */}
      <section className="max-w-2xl mx-auto px-4 py-16">
        {showForm ? (
          <div>
            <div className="mb-8">
              <button
                onClick={() => setShowForm(false)}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                ← Back
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Project Inquiry Form
              </h2>
              <LeadForm
                onSuccess={() => {
                  setTimeout(() => setShowForm(false), 2000);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Why Choose Us */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Why Choose ABO for Your Project?
              </h3>
              <ul className="space-y-3">
                {[
                  "Experienced team with 10+ years combined expertise",
                  "Transparent pricing with no hidden costs",
                  "Regular communication and progress updates",
                  "Post-project support and maintenance",
                  "Quality-assured delivery on schedule",
                  "Flexible engagement models",
                ].map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recent Projects */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Recent Projects
              </h3>
              <div className="space-y-4">
                {[
                  {
                    name: "E-Commerce Platform",
                    client: "Fashion Brand",
                    tech: "Next.js, FastAPI, PostgreSQL",
                  },
                  {
                    name: "Inventory Management System",
                    client: "Retail Chain",
                    tech: "Python, React, AWS",
                  },
                  {
                    name: "AI-Powered Analytics Dashboard",
                    client: "Tech Startup",
                    tech: "Python, Machine Learning, React",
                  },
                ].map((project, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-bold text-gray-900">{project.name}</h4>
                    <p className="text-sm text-gray-600">{project.client}</p>
                    <p className="text-xs text-gray-500 mt-2">{project.tech}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
