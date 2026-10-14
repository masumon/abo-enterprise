/**
 * Plain-Bangla names for the automatic e-mails and their {{variables}}, so a
 * non-technical admin sees "বুকিং নিশ্চিত হলে গ্রাহককে যায়" instead of
 * `booking_confirmed`. Stored template names/variables are unchanged.
 */

export const TEMPLATE_INFO: Record<string, { icon: string; bn: string; when: string }> = {
  booking_confirmation: { icon: "📅", bn: "বুকিং পাওয়া গেছে", when: "গ্রাহক বুকিং করার সাথে সাথে তাকে যায়" },
  booking_confirmed: { icon: "✅", bn: "বুকিং নিশ্চিত", when: "আপনি বুকিং নিশ্চিত করলে গ্রাহককে যায়" },
  invoice_generated: { icon: "🧾", bn: "ইনভয়েস তৈরি", when: "ইনভয়েস বানালে গ্রাহককে যায়" },
  order_confirmation: { icon: "🛒", bn: "অর্ডার নিশ্চিতকরণ", when: "গ্রাহক অর্ডার দিলে তাকে যায়" },
  payment_received: { icon: "💳", bn: "পেমেন্ট পাওয়া গেছে", when: "পেমেন্ট গ্রহণ হলে গ্রাহককে যায়" },
  order_shipped: { icon: "🚚", bn: "অর্ডার পাঠানো হয়েছে", when: "অর্ডার কুরিয়ারে দিলে যায়" },
  order_delivered: { icon: "📦", bn: "অর্ডার পৌঁছেছে", when: "ডেলিভারি সম্পন্ন হলে যায়" },
  password_reset: { icon: "🔑", bn: "পাসওয়ার্ড রিসেট", when: "পাসওয়ার্ড ভুলে গেলে যায়" },
  welcome: { icon: "👋", bn: "স্বাগতম", when: "নতুন অ্যাকাউন্ট খুললে যায়" },
};

export const VAR_INFO: Record<string, { bn: string; sample: string }> = {
  customer_name: { bn: "গ্রাহকের নাম", sample: "রহিম উদ্দিন" },
  booking_number: { bn: "বুকিং নম্বর", sample: "BK-1024" },
  service_name: { bn: "সেবার নাম", sample: "প্রিন্টিং ও ফটোকপি" },
  booking_date: { bn: "বুকিংয়ের তারিখ", sample: "১৫ অক্টোবর ২০২৬" },
  scheduled_date: { bn: "নির্ধারিত তারিখ", sample: "১৭ অক্টোবর ২০২৬" },
  estimated_price: { bn: "আনুমানিক দাম", sample: "৳১,২০০" },
  invoice_number: { bn: "ইনভয়েস নম্বর", sample: "INV-2026-0042" },
  amount: { bn: "টাকার পরিমাণ", sample: "৳১,২৯০" },
  issue_date: { bn: "ইস্যুর তারিখ", sample: "১৪ অক্টোবর ২০২৬" },
  order_number: { bn: "অর্ডার নম্বর", sample: "ORD-5531" },
  order_id: { bn: "অর্ডার নম্বর", sample: "ORD-5531" },
  total_amount: { bn: "মোট দাম", sample: "৳২,৫৮০" },
  estimated_delivery: { bn: "সম্ভাব্য ডেলিভারি", sample: "২-৩ দিনে" },
  payment_method: { bn: "পেমেন্টের মাধ্যম", sample: "bKash" },
  payment_date: { bn: "পেমেন্টের তারিখ", sample: "১৪ অক্টোবর ২০২৬" },
  tracking_number: { bn: "ট্র্যাকিং নম্বর", sample: "SF-778812" },
};

export const templateInfo = (name?: string) =>
  TEMPLATE_INFO[name ?? ""] ?? { icon: "✉️", bn: (name ?? "").replace(/[_-]+/g, " "), when: "নির্দিষ্ট ঘটনায় নিজে থেকে যায়" };

export const varLabel = (v: string) => VAR_INFO[v]?.bn ?? v.replace(/[_-]+/g, " ");

/** Fill {{vars}} with readable sample values for the preview. */
export function fillSamples(text: string, variables: string[]): string {
  let out = text ?? "";
  for (const v of variables) out = out.replace(new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`, "g"), VAR_INFO[v]?.sample ?? `[${varLabel(v)}]`);
  return out;
}
