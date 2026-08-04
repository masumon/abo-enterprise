import type { Metadata } from "next";
import { pageMeta } from "@/lib/metadata";
import B2BQuotationForm from "@/components/services/B2BQuotationForm";

export const metadata: Metadata = pageMeta(
  "Request a B2B Quotation — ABO Enterprise",
  "Request a custom quotation for your business — software, automation, AI or enterprise service needs from ABO Enterprise, Bangladesh.",
  "/services/quote"
);

export default function ServiceQuotePage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-heading">
          প্রতিষ্ঠানের জন্য কোটেশন রিকোয়েস্ট
        </h1>
        <p className="text-sm text-[var(--ink-muted)] mt-2">
          Business Quotation Request — company details সহ আপনার প্রয়োজন জানান, আমরা দ্রুত যোগাযোগ করবো।
        </p>
      </div>
      <B2BQuotationForm />
    </div>
  );
}
