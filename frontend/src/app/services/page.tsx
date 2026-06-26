import Link from "next/link";
import { Printer, Scale, Code2, Bot, Cog, Smartphone, ArrowRight, CheckCircle } from "lucide-react";

const SERVICES = [
  {
    icon: Printer,
    title: "Printing Services",
    subtitle: "Professional quality, fast turnaround",
    href: "/services/printing",
    color: "brand",
    features: [
      "Business cards (500 pcs from ৳350)",
      "Banners & flex printing",
      "Brochures & flyers",
      "Legal documents & certificates",
      "Stickers & labels",
      "Letterheads & envelopes",
    ],
    cta: "Book Printing Service",
  },
  {
    icon: Scale,
    title: "Legal Assistance",
    subtitle: "Government documents & legal filings",
    href: "/services/legal",
    color: "accent",
    features: [
      "GD (General Diary) filing",
      "FIR applications",
      "Legal application drafting",
      "Complaint letters",
      "Government document preparation",
      "Police station assistance",
    ],
    cta: "Get Legal Help",
  },
  {
    icon: Code2,
    title: "Software Development",
    subtitle: "Web, mobile & enterprise solutions",
    href: "/services/software",
    color: "green",
    features: [
      "Business websites & e-commerce",
      "AI-powered solutions",
      "Python automation & scripting",
      "ERP, POS & CRM systems",
      "Mobile & desktop applications",
      "DevOps & cloud deployment",
    ],
    cta: "Discuss Your Project",
  },
];

const TECH_STACK = [
  { icon: Bot, label: "AI Solutions" },
  { icon: Code2, label: "Web Dev" },
  { icon: Cog, label: "Automation" },
  { icon: Smartphone, label: "Mobile Apps" },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="gradient-brand text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Services</h1>
          <p className="text-xl text-brand-100 max-w-2xl mx-auto">
            From printing to legal help to full-stack software — everything your business needs, under one roof.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto space-y-8">
          {SERVICES.map(({ icon: Icon, title, subtitle, href, color, features, cta }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="grid md:grid-cols-5 gap-0">
                {/* Left panel */}
                <div className={`md:col-span-2 p-8 ${
                  color === "brand" ? "bg-brand-600" :
                  color === "accent" ? "bg-accent-500" : "bg-green-600"
                } text-white`}>
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-5">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{title}</h2>
                  <p className="text-white/80 mb-8">{subtitle}</p>
                  <Link
                    href={href}
                    className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-5 py-2.5 rounded-xl hover:bg-white/90 transition-colors text-sm"
                  >
                    {cta} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Right panel */}
                <div className="md:col-span-3 p-8">
                  <h3 className="font-semibold text-gray-900 mb-5">What&apos;s included:</h3>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {features.map(f => (
                      <li key={f} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Expertise Banner */}
      <section className="py-12 px-4 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Powered by Modern Technology</h2>
          <p className="text-gray-400 mb-8">We use cutting-edge tools to deliver the best solutions</p>
          <div className="flex justify-center gap-6 flex-wrap">
            {TECH_STACK.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
                <Icon className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Not sure which service you need?</h2>
          <p className="text-gray-500 mb-8">Tell us about your project and we&apos;ll recommend the best solution.</p>
          <Link href="/contact" className="btn btn-brand btn-lg">
            Talk to Us
          </Link>
        </div>
      </section>
    </main>
  );
}
