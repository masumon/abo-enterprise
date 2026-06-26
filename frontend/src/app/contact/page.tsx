"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Mail, MapPin, MessageSquare, Send, Loader2, CheckCircle } from "lucide-react";
import { leadsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().regex(/^0[13-9]\d{8}$/, "Enter a valid BD phone number (01XXXXXXXXX)"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  project_description: z.string().min(10, "Please describe what you need (min 10 characters)"),
});
type FormData = z.infer<typeof schema>;

const CONTACT_INFO = [
  {
    icon: Phone,
    label: "Phone / WhatsApp",
    value: "+880 1825-007977",
    href: "tel:+8801825007977",
  },
  {
    icon: Mail,
    label: "Email",
    value: "abo.enterprise@gmail.com",
    href: "mailto:abo.enterprise@gmail.com",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "Hazi Bahar Uddin Market, Sylhet-3170",
    href: null,
  },
  {
    icon: MessageSquare,
    label: "WhatsApp",
    value: "Chat with us directly",
    href: "https://wa.me/8801825007977",
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setSubmitError(null);
    try {
      await leadsApi.create({
        lead_type: "general",
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        project_description: data.project_description,
      });
      setSubmitted(true);
    } catch {
      setSubmitError("Failed to send message. Please try WhatsApp or call us directly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="gradient-brand text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-3">Contact Us</h1>
          <p className="text-brand-100 text-lg">We&apos;re here to help. Reach out anytime.</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Contact Info */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Get in Touch</h2>
            {CONTACT_INFO.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  {href ? (
                    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                      className="text-sm font-medium text-brand-600 hover:underline">
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-gray-900">{value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-xl">
              <p className="text-sm text-green-800 font-medium">Business Hours</p>
              <p className="text-sm text-green-700 mt-1">Saturday – Thursday<br />9:00 AM – 8:00 PM</p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="w-14 h-14 text-green-500 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-gray-500">We&apos;ve received your message and will get back to you within 24 hours.</p>
                <p className="text-gray-500 mt-2 text-sm">For urgent matters, please WhatsApp us directly.</p>
                <a href="https://wa.me/8801825007977" target="_blank" rel="noopener noreferrer" className="btn btn-brand btn-md mt-6">
                  Open WhatsApp
                </a>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Send a Message</h2>
                {submitError && (
                  <p role="alert" className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">
                    {submitError}
                  </p>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input {...register("name")} className={cn("input", errors.name && "input-error")} placeholder="Your name" />
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                      <input {...register("phone")} className={cn("input", errors.phone && "input-error")} placeholder="01XXXXXXXXX" />
                      {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                    <input {...register("email")} type="email" className="input" placeholder="your@email.com" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">How can we help? *</label>
                    <textarea
                      {...register("project_description")}
                      rows={5}
                      className={cn("input resize-none", errors.project_description && "input-error")}
                      placeholder="Tell us what you need — products, printing, legal help, or software..."
                    />
                    {errors.project_description && <p className="text-red-500 text-xs mt-1">{errors.project_description.message}</p>}
                  </div>

                  <button type="submit" disabled={loading} className="btn btn-brand btn-md w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {loading ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
