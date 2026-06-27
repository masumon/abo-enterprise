"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { serviceLeadsApi } from "@/lib/api";
import { toLeadV2Type } from "@/lib/leadTypes";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

const bdPhoneRegex = /^0[13-9]\d{8}$/;

const leadSchema = z.object({
  lead_type: z.string().min(1, "Please select a service"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(bdPhoneRegex, "Invalid Bangladesh phone number"),
  email: z.string().email("Invalid email address"),
  company: z.string().optional(),
  project_description: z.string().min(20, "Please describe your project (minimum 20 characters)"),
  requirements: z.string().min(10, "Please provide your requirements"),
  budget_min: z.number().optional(),
  budget_max: z.number().optional(),
  timeline: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadFormProps {
  defaultLeadType?: string;
  onSuccess?: () => void;
}

const SERVICE_OPTIONS = [
  { value: "software_development", label: "Custom Software Development" },
  { value: "ai_solutions", label: "AI Solutions & Implementation" },
  { value: "python_automation", label: "Python Automation" },
  { value: "web_development", label: "Website Development" },
  { value: "mobile_app", label: "Mobile App Development" },
  { value: "consulting", label: "Business Consultation" },
  { value: "other", label: "Other Services" },
];

const TIMELINE_OPTIONS = [
  { value: "1-3_months", label: "1-3 months" },
  { value: "3-6_months", label: "3-6 months" },
  { value: "6-12_months", label: "6-12 months" },
  { value: "12_months_plus", label: "12+ months" },
  { value: "urgent", label: "ASAP/Urgent" },
];

export default function LeadForm({ defaultLeadType, onSuccess }: LeadFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      lead_type: defaultLeadType || "",
    },
  });

  async function onSubmit(data: LeadFormData) {
    try {
      setSubmitting(true);

      const response = await serviceLeadsApi.create({
        lead_type: toLeadV2Type(data.lead_type),
        name: data.name,
        phone: data.phone,
        email: data.email,
        company: data.company,
        project_description: data.project_description,
        requirements: data.requirements,
        budget_min: data.budget_min,
        budget_max: data.budget_max,
        timeline: data.timeline,
      });

      if (response.status === 200 || response.status === 201) {
        setSuccess(true);
        reset();
        setTimeout(() => {
          setSuccess(false);
          onSuccess?.();
        }, 3000);
      }
    } catch (error) {
      console.error("Lead submission failed:", error);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Lead Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What service do you need? *
        </label>
        <select
          {...register("lead_type")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a service...</option>
          {SERVICE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.lead_type && (
          <p className="text-red-500 text-sm mt-1">{errors.lead_type.message}</p>
        )}
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          {...register("name")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Your full name"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      {/* Email & Phone (Two columns) */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            {...register("email")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="your@email.com"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone (BD) *
          </label>
          <input
            type="tel"
            {...register("phone")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="01XXXXXXXXX"
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
          )}
        </div>
      </div>

      {/* Company */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company Name (Optional)
        </label>
        <input
          type="text"
          {...register("company")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Company name"
        />
      </div>

      {/* Project Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project Description *
        </label>
        <textarea
          {...register("project_description")}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Tell us about your project..."
        />
        {errors.project_description && (
          <p className="text-red-500 text-sm mt-1">{errors.project_description.message}</p>
        )}
      </div>

      {/* Requirements */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Detailed Requirements *
        </label>
        <textarea
          {...register("requirements")}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="What are your specific requirements?"
        />
        {errors.requirements && (
          <p className="text-red-500 text-sm mt-1">{errors.requirements.message}</p>
        )}
      </div>

      {/* Budget & Timeline (Two columns) */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Budget Range (Optional)
          </label>
          <div className="space-y-2">
            <input
              type="number"
              {...register("budget_min", { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Min budget (BDT)"
            />
            <input
              type="number"
              {...register("budget_max", { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Max budget (BDT)"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timeline (Optional)
          </label>
          <select
            {...register("timeline")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select timeline...</option>
            {TIMELINE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          Thank you! We received your inquiry. We'll contact you within 24 hours.
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <LoadingSpinner /> Submitting...
          </>
        ) : (
          "Submit Project Inquiry"
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        We'll review your requirements and contact you with a custom quote within 24 hours.
      </p>
    </form>
  );
}
