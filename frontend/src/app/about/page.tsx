import { Bot, Target, Eye, Heart, CheckCircle, Users, Briefcase, ShoppingCart } from "lucide-react";

const VALUES = [
  { icon: Heart, title: "Customer First", desc: "Every decision starts with what's best for our customers and their businesses." },
  { icon: Target, title: "Excellence", desc: "We deliver quality products and services that exceed expectations every time." },
  { icon: CheckCircle, title: "Integrity", desc: "Honest pricing, transparent communication, and delivering on every promise." },
  { icon: Bot, title: "Innovation", desc: "Leveraging the latest technology — including AI — to solve real business problems." },
];

const SERVICES = [
  { icon: ShoppingCart, label: "Quality Products", desc: "Phone accessories, gadgets & electronics at competitive prices" },
  { icon: Briefcase, label: "Printing Services", desc: "Business cards, banners, brochures & professional documents" },
  { icon: Users, label: "Legal Assistance", desc: "GD filing, FIR, legal applications & government documents" },
  { icon: Bot, label: "Software Development", desc: "Websites, AI solutions, automation & enterprise software" },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="gradient-brand text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">ABO Enterprise</h1>
          <p className="text-xl text-brand-100 max-w-2xl mx-auto">
            Your one-stop solution for products, printing services, legal assistance, and cutting-edge software development.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="section-title">Our Story</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  ABO Enterprise was founded with a simple mission: to bring affordable quality products and professional services to individuals and businesses in Bangladesh.
                </p>
                <p>
                  We started as a product reseller and quickly grew into a full-service enterprise offering printing, legal assistance, and software development. Today, we serve customers across Bangladesh with the same dedication to quality and value.
                </p>
                <p>
                  What sets us apart is our unique combination of physical products and digital expertise — we understand both the offline and online needs of modern Bangladeshi businesses.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-brand-50 rounded-2xl p-6 border border-brand-100">
                <Eye className="w-8 h-8 text-brand-600 mb-3" />
                <h3 className="font-bold text-gray-900 text-lg mb-2">Our Vision</h3>
                <p className="text-gray-600">
                  To be Bangladesh&apos;s most trusted enterprise service provider — bridging the gap between quality products and technology solutions for businesses of all sizes.
                </p>
              </div>
              <div className="bg-accent-50 rounded-2xl p-6 border border-accent-100">
                <Target className="w-8 h-8 text-accent-500 mb-3" />
                <h3 className="font-bold text-gray-900 text-lg mb-2">Our Mission</h3>
                <p className="text-gray-600">
                  To deliver exceptional value through quality products, reliable services, and innovative software solutions that help our customers grow and succeed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="section-title text-center">Our Values</h2>
          <div className="section-divider mx-auto" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="section-title text-center">What We Do</h2>
          <div className="section-divider mx-auto" />
          <div className="grid sm:grid-cols-2 gap-6 mt-10">
            {SERVICES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex gap-4 p-5 rounded-2xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all">
                <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{label}</h3>
                  <p className="text-sm text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gray-900 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Work Together?</h2>
          <p className="text-gray-400 mb-8">Whether you need products, services, or software — we&apos;re here to help.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="/contact" className="btn btn-brand btn-lg">Contact Us</a>
            <a href="/products" className="btn btn-outline btn-lg text-white border-white/30 hover:bg-white/10">Browse Products</a>
          </div>
        </div>
      </section>
    </main>
  );
}
