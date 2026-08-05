import type { Metadata } from "next";
import { cookies } from "next/headers";
import { pageMeta } from "@/lib/metadata";
import { LANG_COOKIE, normalizeLang } from "@/lib/lang";
import B2BQuotationForm from "@/components/services/B2BQuotationForm";
import Accordion from "@/components/ui/Accordion";

export const metadata: Metadata = pageMeta(
  "Request a B2B Quotation — ABO Enterprise",
  "Request a custom quotation for your business — software, automation, AI or enterprise service needs from ABO Enterprise, Bangladesh.",
  "/services/quote"
);

export default function ServiceQuotePage() {
  const lang = normalizeLang(cookies().get(LANG_COOKIE)?.value);

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-heading">
          {lang === "bn" ? "প্রতিষ্ঠানের জন্য কোটেশন রিকোয়েস্ট" : "Request a Business Quotation"}
        </h1>
        <p className="text-sm text-[var(--ink-muted)] mt-2">
          {lang === "bn"
            ? "প্রতিষ্ঠানের বিবরণসহ আপনার প্রয়োজন জানান, আমরা দ্রুত যোগাযোগ করবো।"
            : "Share your company details and requirements — we'll get back to you quickly."}
        </p>
      </div>
      <Accordion
        items={[
          {
            id: "b2b-quote-form",
            question:
              lang === "bn"
                ? "কোটেশন ফর্ম পূরণ করুন"
                : "Fill out the quotation form",
            answer: <B2BQuotationForm />,
          },
        ]}
      />
    </div>
  );
}
