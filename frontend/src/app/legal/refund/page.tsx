"use client";

import Link from "next/link";
import ContactActions from "@/components/common/ContactActions";
import { useLanguageStore } from "@/store/language";
import LegalPageLayout, { type LegalSection } from "@/components/layout/LegalPageLayout";
import PageHero from "@/components/ui/PageHero";
import { useLegalPageOverride } from "@/hooks/useLegalPageOverride";
import { BulletList, ComplianceOfficerBlock } from "@/components/legal/LegalShared";

const LAST_UPDATED = "2026-10-07";

export default function RefundPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";
  const pageTitle = isBn ? "রিফান্ড নীতি" : "Refund Policy";
  const overrideSections = useLegalPageOverride("refund", pageTitle, isBn);

  const sections: LegalSection[] = [
    {
      id: "overview",
      title: isBn ? "সারসংক্ষেপ" : "Overview",
      content: (
        <p>
          {isBn
            ? "গ্রাহক সন্তুষ্টি আমাদের অগ্রাধিকার। ভোক্তা-অধিকার সংরক্ষণ আইন, ২০০৯ ও আন্তর্জাতিক e-commerce মান অনুসরণ করে আমরা ত্রুটিপূর্ণ বা ভুল পণ্যের ক্ষেত্রে ন্যায্য রিটার্ন, প্রতিস্থাপন ও রিফান্ড নিশ্চিত করি।"
            : "Customer satisfaction is our priority. In line with the Consumer Rights Protection Act, 2009 and international e-commerce standards, we ensure fair returns, replacement and refunds for defective or incorrect items."}
        </p>
      ),
    },
    {
      id: "window",
      title: isBn ? "রিটার্ন উইন্ডো ও শর্ত" : "Return Window & Conditions",
      content: (
        <>
          <p>
            {isBn
              ? "পণ্য বুঝে পাওয়ার ৭ (সাত) দিনের মধ্যে রিটার্ন/রিফান্ডের অনুরোধ করতে হবে। পণ্য যোগ্য হতে হলে:"
              : "Return/refund requests must be made within 7 (seven) days of receiving the product. To qualify, the item must be:"}
          </p>
          <ul className="list-disc list-inside space-y-1.5">
            <li>{isBn ? "অব্যবহৃত ও আসল অবস্থায়, মূল প্যাকেজিং ও ট্যাগসহ" : "Unused and in original condition with original packaging and tags"}</li>
            <li>{isBn ? "অর্ডার নম্বর ও ক্রয়ের প্রমাণসহ (রসিদ/ইনভয়েস)" : "Accompanied by the order number and proof of purchase (receipt/invoice)"}</li>
            <li>{isBn ? "ত্রুটির ক্ষেত্রে সমস্যার ছবি/ভিডিও প্রমাণসহ" : "Supported by photo/video evidence in case of a defect"}</li>
          </ul>
        </>
      ),
    },
    {
      id: "products",
      title: isBn ? "পণ্য রিফান্ড ও প্রতিস্থাপন" : "Product Refund & Replacement",
      content: (
        <p>
          {isBn
            ? "পণ্য ত্রুটিপূর্ণ, ক্ষতিগ্রস্ত বা ভুল ডেলিভারি হলে বিনামূল্যে প্রতিস্থাপন অথবা সম্পূর্ণ রিফান্ড প্রদান করা হয়। উপযুক্ত ক্ষেত্রে রিটার্ন শিপিং খরচ আমরা বহন করি।"
            : "If a product is defective, damaged or wrongly delivered, we provide a free replacement or full refund. Where applicable, we bear the return shipping cost."}
        </p>
      ),
    },
    {
      id: "custom",
      title: isBn ? "কাস্টম সেবা ও সফটওয়্যার" : "Custom Services & Software",
      content: (
        <p>
          {isBn
            ? "কাস্টম প্রিন্টিং, ডিজাইন ও সফটওয়্যার প্রজেক্টে রিফান্ড কাজের অগ্রগতি ও লিখিত চুক্তির শর্তের ওপর নির্ভর করে। কাজ শুরুর আগে বাতিল করলে অগ্রিমের সমন্বয় করা হয়; সম্পন্ন অংশ রিফান্ডযোগ্য নয়।"
            : "For custom printing, design and software projects, refunds depend on work progress and the written agreement. Cancellation before work begins is adjusted against advances; completed portions are non-refundable."}
        </p>
      ),
    },
    {
      id: "non-refundable",
      title: isBn ? "যা রিফান্ডযোগ্য নয়" : "Non-Refundable Items",
      content: (
        <ul className="list-disc list-inside space-y-1.5">
          <li>{isBn ? "কাস্টমাইজড/পার্সোনালাইজড পণ্য (ত্রুটি ছাড়া)" : "Customized/personalized items (unless defective)"}</li>
          <li>{isBn ? "শুরু হয়ে যাওয়া কাস্টম সেবার সম্পন্ন অংশ" : "Completed portions of custom services already begun"}</li>
          <li>{isBn ? "ডেলিভারি চার্জ (পণ্য ত্রুটিপূর্ণ না হলে)" : "Delivery charges (unless the product was defective)"}</li>
          <li>{isBn ? "৭ দিনের সময়সীমা পেরিয়ে গেলে" : "Requests made after the 7-day window"}</li>
        </ul>
      ),
    },
    {
      id: "process",
      title: isBn ? "রিফান্ড প্রক্রিয়া" : "Refund Process",
      content: (
        <ol className="list-decimal list-inside space-y-2">
          <li>{isBn ? "অর্ডার নম্বর ও সমস্যার বিবরণসহ যোগাযোগ করুন" : "Contact us with your order number and issue description"}</li>
          <li>{isBn ? "আমাদের টিম ২৪–৪৮ ঘণ্টার মধ্যে অনুরোধ যাচাই করবে" : "Our team reviews the request within 24–48 hours"}</li>
          <li>{isBn ? "অনুমোদিত হলে ৩–৭ কর্মদিবসের মধ্যে রিফান্ড সম্পন্ন হবে" : "Approved refunds are processed within 3–7 business days"}</li>
        </ol>
      ),
    },
    {
      id: "method",
      title: isBn ? "রিফান্ড কীভাবে ফেরত আসে" : "How Refunds Are Returned",
      content: (
        <p>
          {isBn
            ? "রিফান্ড সাধারণত মূল পেমেন্ট মাধ্যমেই ফেরত দেওয়া হয় (bKash, Nagad, কার্ড/ব্যাংক)। ক্যাশ-অন-ডেলিভারি অর্ডারের ক্ষেত্রে আপনার নির্দেশিত bKash/Nagad বা ব্যাংক অ্যাকাউন্টে রিফান্ড পাঠানো হয়।"
            : "Refunds are normally returned to the original payment method (bKash, Nagad, card/bank). For Cash on Delivery orders, refunds are sent to your specified bKash/Nagad or bank account."}
        </p>
      ),
    },
    {
      id: "defective",
      title: isBn ? "ত্রুটিপূর্ণ, ক্ষতিগ্রস্ত বা ভুল পণ্য" : "Defective, Damaged or Wrong Items",
      content: (
        <div className="space-y-3">
        <BulletList
          items={
            isBn
              ? [
                    "রিটার্ন সময়ের মধ্যে অর্ডার নম্বরসহ সমস্যার স্পষ্ট ছবি বা আনবক্সিং ভিডিও পাঠিয়ে জানান।",
                    "আমরা ২৪–৪৮ ঘণ্টায় যাচাই করি। নিশ্চিত হলে আমাদের খরচে পিকআপ বা ফেরত পাঠানোর ব্যবস্থা করে পণ্য প্রতিস্থাপন বা আপনার পরিশোধিত ডেলিভারি চার্জসহ পুরো টাকা ফেরত দিই।",
                    "ডেড-অন-অ্যারাইভাল, ভুল বা ক্ষতিগ্রস্ত ডেলিভারিতে সবসময় এই নিয়ম প্রযোজ্য; কোনো রিস্টকিং ফি নেই।",
                  ]
              : [
                    "Tell us within the return window and send your order number with clear photos or an unboxing video showing the problem.",
                    "We verify within 24–48 hours. If confirmed, we arrange pickup or return shipping at our cost and replace the item or refund you in full, including the delivery charge you paid.",
                    "Dead-on-arrival products and wrong or damaged deliveries are always handled this way; no restocking fee applies.",
                  ]
          }
        />
        </div>
      ),
    },
    {
      id: "change-of-mind",
      title: isBn ? "মত বদলের রিটার্ন" : "Change-of-mind Returns",
      content: (
        <div className="space-y-3">
        <p>
          {isBn
            ? "যোগ্য পণ্যে আপনি অব্যবহৃত পণ্য মূল ও সম্পূর্ণ প্যাকেজিং, সব এক্সেসরিজ, ট্যাগ ও ইনভয়েসসহ রিটার্ন সময়ের মধ্যে ফেরত দিতে পারেন। মত বদলের রিটার্নে ফেরত পাঠানোর খরচ গ্রাহক বহন করেন। খোলা হাইজিন বা ব্যক্তিগত পরিচর্যার পণ্য, সফটওয়্যার বা ডিজিটাল পণ্য, অর্ডার-অনুযায়ী বা কাস্টমাইজড পণ্য এবং গ্রাহকের কারণে ক্ষতিগ্রস্ত পণ্য যোগ্য নয়; ‘যা রিফান্ডযোগ্য নয়’ অংশ দেখুন।"
            : "Where a product is eligible, you may return an unused item in its original, complete packaging with all accessories, tags and the invoice within the return window. For change-of-mind returns the return-shipping cost is borne by the customer. Opened hygiene or personal-care products, software or digital goods, made-to-order or customised items, and items damaged by the customer are not eligible; see Non-Refundable Items."}
        </p>
        </div>
      ),
    },
    {
      id: "refund-destinations",
      title: isBn ? "রিফান্ড কোথায় যায়" : "Where Your Refund Goes",
      content: (
        <BulletList
          items={
            isBn
              ? [
                    "পেমেন্ট গেটওয়ে বা কার্ডে প্রিপেইড হলে: মূল পেমেন্ট পদ্ধতিতেই ফেরত।",
                    "bKash বা Nagad এ পরিশোধ করলে: একই ওয়ালেট নম্বরে ফেরত।",
                    "ক্যাশ অন ডেলিভারি অর্ডারে: আপনার bKash, Nagad বা ব্যাংক অ্যাকাউন্টে, অথবা চাইলে আমাদের দোকানে নগদে।",
                    "ফেরত দেওয়া বা বাতিল পণ্যের জন্য প্রকৃত পরিশোধিত অর্থই রিফান্ড হয়; প্রতিটি রিফান্ড আমরা এসএমএস, ইমেইল বা হোয়াটসঅ্যাপে নিশ্চিত করি। ব্যাংক বা গেটওয়ের প্রক্রিয়ায় কয়েক দিন বাড়তি লাগতে পারে।",
                  ]
              : [
                    "Prepaid by a payment gateway or card: back to the original payment method.",
                    "Paid by bKash or Nagad: back to the same wallet number.",
                    "Cash on delivery orders: to your bKash, Nagad or bank account, or by cash at our shop if you prefer.",
                    "Refunds are for the amount actually paid for the returned or cancelled item; we confirm each refund by SMS, email or WhatsApp. Bank or gateway processing time can add a few days.",
                  ]
          }
        />
      ),
    },
    {
      id: "cancellation",
      title: isBn ? "অর্ডার বাতিল" : "Order Cancellation",
      content: (
        <p>
          {isBn
            ? "পণ্য কুরিয়ারে হস্তান্তরের আগে আপনি বিনা খরচে অর্ডার বাতিল করতে পারেন; প্রিপেইড অর্ডারের পুরো টাকা ফেরত দেওয়া হবে। হস্তান্তরের পর বাতিল করতে চাইলে পণ্য গ্রহণ না করে ফেরত পাঠান বা আমাদের জানান — তখন রিটার্ন নীতি প্রযোজ্য হবে।"
            : "You can cancel an order free of charge before it is handed to the courier, and a prepaid order is refunded in full. After dispatch, refuse the parcel or contact us — the return rules above then apply."}
        </p>
      ),
    },
    {
      id: "non-delivery",
      title: isBn ? "ডেলিভারি না হলে বা বিলম্বিত হলে" : "Non-delivery & Late Delivery",
      content: (
        <div className="space-y-2">
          <p>
            {isBn
              ? "আমরা প্রতিশ্রুত সময়ের মধ্যে পণ্য পৌঁছাতে ব্যর্থ হলে বা অর্ডার পূরণ করতে না পারলে আপনি বাতিল করে পরিশোধিত পুরো টাকা ফেরত পাবেন। এই ক্ষেত্রে রিফান্ড ১০ দিনের মধ্যে সম্পন্ন করা হয়। ক্যাশব্যাক বা অফারের অর্থ আমরা ওয়ালেটে আটকে রাখি না।"
              : "If we fail to deliver within the promised time or cannot fulfil your order, you can cancel and get everything you paid back — completed within 10 days. We do not hold cashback or offer money back in a wallet."}
          </p>
        </div>
      ),
    },
    {
      id: "consumer-rights",
      title: isBn ? "আপনার ভোক্তা-অধিকার" : "Your Consumer Rights",
      content: (
        <BulletList
          items={
            isBn
              ? [
                  "এই নীতি ভোক্তা-অধিকার সংরক্ষণ আইন, ২০০৯ ও ডিজিটাল কমার্স পরিচালনা নির্দেশিকা, ২০২১ এর অধীন আপনার অধিকার সীমিত করে না।",
                  "ত্রুটিপূর্ণ বা বর্ণনার সাথে মেলে না এমন পণ্যে রিটার্ন-ডেলিভারি খরচ আমরা বহন করি।",
                  "সমাধানে সন্তুষ্ট না হলে জাতীয় ভোক্তা-অধিকার সংরক্ষণ অধিদপ্তরে (হটলাইন ১৬১২১) অভিযোগ করতে পারেন।",
                ]
              : [
                  "This policy does not limit your rights under the Consumer Rights Protection Act, 2009 or the Digital Commerce Operation Guidelines, 2021.",
                  "For defective items or items not matching the description, we bear the return-delivery cost.",
                  "If you are not satisfied with the outcome, you may complain to the Directorate of National Consumer Rights Protection (hotline 16121).",
                ]
          }
        />
      ),
    },
    {
      id: "support",
      title: isBn ? "সাপোর্ট ও অভিযোগ" : "Support & Complaints",
      content: (
        <div className="space-y-3">
          <p>{isBn ? "রিফান্ডের জন্য অর্ডার নম্বর ও প্রমাণসহ যোগাযোগ করুন।" : "Contact us with your order number and proof for refund requests."}</p>
          <ComplianceOfficerBlock />
        </div>
      ),
    },
  ];

  return (
    <main>
      <PageHero
        pageKey="refund"
        variant="light"
        title={pageTitle}
        breadcrumbs={[{ label: isBn ? "রিফান্ড" : "Refund" }]}
      />
      <LegalPageLayout
        title={pageTitle}
        sections={overrideSections ?? sections}
        showTitle={false}
        lastUpdated={LAST_UPDATED}
      />
    </main>
  );
}
