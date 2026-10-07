"use client";

import { useLanguageStore } from "@/store/language";
import LegalPageLayout, { type LegalSection } from "@/components/layout/LegalPageLayout";
import PageHero from "@/components/ui/PageHero";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { useLegalPageOverride } from "@/hooks/useLegalPageOverride";
import { BulletList, ComplianceOfficerBlock } from "@/components/legal/LegalShared";

const LAST_UPDATED = "2026-10-07";

export default function TermsPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";
  const pageTitle = isBn ? "সেবার শর্তাবলী" : "Terms of Service";
  const overrideSections = useLegalPageOverride("terms", pageTitle, isBn);
  const { settings } = usePublicSettings(["contact_email", "contact_phone", "contact_address"]);
  const address = getSettingValue(settings, "contact_address", isBn ? "সিলেট, বাংলাদেশ" : "Sylhet, Bangladesh");

  const sections: LegalSection[] = [
    {
      id: "agreement",
      title: isBn ? "চুক্তি ও গ্রহণযোগ্যতা" : "Agreement & Acceptance",
      content: (
        <>
          <p>
            {isBn
              ? "ABO Enterprise-এর ওয়েবসাইট, অ্যাপ ও সেবা ব্যবহার করে আপনি এই শর্তাবলী এবং আমাদের গোপনীয়তা নীতি ও কুকি নীতি মেনে নিচ্ছেন। আপনি যদি এই শর্তাবলীর সাথে একমত না হন, অনুগ্রহ করে সেবা ব্যবহার করবেন না।"
              : "By using the ABO Enterprise website, app and services, you agree to these Terms of Service together with our Privacy Policy and Cookies Policy. If you do not agree, please do not use the services."}
          </p>
          <p>
            {isBn
              ? "সেবা ব্যবহারের জন্য আপনাকে কমপক্ষে ১৮ বছর বয়সী হতে হবে অথবা আইনগত অভিভাবকের তত্ত্বাবধানে থাকতে হবে।"
              : "You must be at least 18 years old, or use the services under the supervision of a legal guardian."}
          </p>
        </>
      ),
    },
    {
      id: "company",
      title: isBn ? "প্রতিষ্ঠান পরিচিতি" : "About the Company",
      content: (
        <p>
          {isBn
            ? "ABO Enterprise বাংলাদেশ থেকে পরিচালিত একটি নিবন্ধিত প্রতিষ্ঠান, যা ই-কমার্স পণ্য, প্রিন্টিং, সফটওয়্যার ও ডিজিটাল সেবা প্রদান করে। ঠিকানা: "
            : "ABO Enterprise is a registered business operating from Bangladesh, providing e-commerce products, printing, software and digital services. Address: "}
          <b>{address}</b>।
        </p>
      ),
    },
    {
      id: "orders",
      title: isBn ? "অর্ডার, মূল্য ও পেমেন্ট" : "Orders, Pricing & Payment",
      content: (
        <>
          <p>
            {isBn
              ? "সকল মূল্য বাংলাদেশি টাকায় (৳/BDT) এবং প্রযোজ্য ভ্যাট/ট্যাক্সসহ প্রদর্শিত হয়। পণ্যের মূল্য, স্টক ও অফার পূর্ব ঘোষণা ছাড়াই পরিবর্তন হতে পারে।"
              : "All prices are shown in Bangladeshi Taka (BDT) inclusive of applicable VAT/tax. Product prices, stock and offers may change without prior notice."}
          </p>
          <p>
            {isBn
              ? "আমরা ক্যাশ-অন-ডেলিভারি এবং অনুমোদিত অনলাইন গেটওয়ে (bKash, Nagad, ব্যাংক কার্ড, SSLCOMMERZ) গ্রহণ করি। অর্ডার নিশ্চিতকরণের পর আমরা ফোন বা ইমেইলে যোগাযোগ করব।"
              : "We accept Cash on Delivery and approved online gateways (bKash, Nagad, bank cards, SSLCOMMERZ). We will contact you by phone or email after order confirmation."}
          </p>
          <p>
            {isBn
              ? "স্পষ্ট মূল্য-ত্রুটি, স্টক সীমাবদ্ধতা বা জালিয়াতির সন্দেহ থাকলে আমরা যেকোনো অর্ডার বাতিল বা প্রত্যাখ্যান করার অধিকার সংরক্ষণ করি; সেক্ষেত্রে পরিশোধিত অর্থ সম্পূর্ণ ফেরত দেওয়া হবে।"
              : "We reserve the right to cancel or decline any order in cases of obvious pricing errors, stock limitations or suspected fraud; any amount paid will be fully refunded in such cases."}
          </p>
        </>
      ),
    },
    {
      id: "delivery",
      title: isBn ? "ডেলিভারি ও রিটার্ন" : "Delivery & Returns",
      content: (
        <p>
          {isBn
            ? "ডেলিভারি সময় ও চার্জ এলাকাভেদে ভিন্ন হয় এবং চেকআউটে প্রদর্শিত হয়। ফেরত ও রিফান্ড সংক্রান্ত বিস্তারিত আমাদের রিফান্ড নীতি ও শিপিং তথ্য পেজে বর্ণিত আছে, যা ভোক্তা-অধিকার সংরক্ষণ আইন, ২০০৯ অনুসারে পরিচালিত।"
            : "Delivery time and charges vary by area and are shown at checkout. Returns and refunds are detailed in our Refund Policy and Shipping pages, handled in line with the Consumer Rights Protection Act, 2009 of Bangladesh."}
        </p>
      ),
    },
    {
      id: "software",
      title: isBn ? "সফটওয়্যার ও কাস্টম প্রজেক্ট" : "Software & Custom Projects",
      content: (
        <p>
          {isBn
            ? "সফটওয়্যার, ওয়েব ও কাস্টম প্রজেক্টের জন্য পৃথক লিখিত চুক্তি (স্কোপ, মাইলস্টোন, পেমেন্ট শিডিউল) প্রযোজ্য। সেই চুক্তির শর্ত এই সাধারণ শর্তাবলীর ওপর প্রাধান্য পাবে।"
            : "Software, web and custom projects are governed by separate written agreements (scope, milestones, payment schedule). The terms of that agreement prevail over these general terms."}
        </p>
      ),
    },
    {
      id: "ip",
      title: isBn ? "বৌদ্ধিক সম্পত্তি" : "Intellectual Property",
      content: (
        <p>
          {isBn
            ? "এই ওয়েবসাইটের সকল কনটেন্ট, লোগো, ট্রেডমার্ক, গ্রাফিক্স ও সফটওয়্যার ABO Enterprise বা এর লাইসেন্সদাতার সম্পত্তি এবং প্রযোজ্য কপিরাইট ও ট্রেডমার্ক আইন দ্বারা সুরক্ষিত। পূর্বানুমতি ছাড়া অনুলিপি, বিতরণ বা বাণিজ্যিক ব্যবহার নিষিদ্ধ।"
            : "All content, logos, trademarks, graphics and software on this website belong to ABO Enterprise or its licensors and are protected by applicable copyright and trademark laws. Copying, distribution or commercial use without prior permission is prohibited."}
        </p>
      ),
    },
    {
      id: "conduct",
      title: isBn ? "ব্যবহারকারীর দায়িত্ব" : "Acceptable Use",
      content: (
        <p>
          {isBn
            ? "আপনি সঠিক তথ্য প্রদান করতে, অ্যাকাউন্টের গোপনীয়তা রক্ষা করতে এবং সেবা কোনো বেআইনি, প্রতারণামূলক বা ক্ষতিকর উদ্দেশ্যে ব্যবহার না করতে সম্মত হচ্ছেন। তথ্য ও যোগাযোগ প্রযুক্তি আইনসহ প্রযোজ্য আইন লঙ্ঘন করলে অ্যাকাউন্ট স্থগিত হতে পারে।"
            : "You agree to provide accurate information, keep your account credentials secure, and not use the services for any unlawful, fraudulent or harmful purpose. Violating applicable law, including ICT regulations, may result in account suspension."}
        </p>
      ),
    },
    {
      id: "liability",
      title: isBn ? "দায়সীমা ও ওয়ারেন্টি" : "Liability & Warranty",
      content: (
        <p>
          {isBn
            ? "সেবা \"যেমন আছে\" ভিত্তিতে প্রদান করা হয়। আমরা মানসম্পন্ন সেবা দিতে সর্বোচ্চ চেষ্টা করি, তবে আমাদের নিয়ন্ত্রণবহির্ভূত পরিস্থিতি (প্রাকৃতিক দুর্যোগ, নেটওয়ার্ক বিভ্রাট, কুরিয়ার বিলম্ব) থেকে সৃষ্ট পরোক্ষ ক্ষতির জন্য দায়ী নই। আমাদের সর্বোচ্চ দায় সংশ্লিষ্ট অর্ডারের পরিশোধিত মূল্যের মধ্যে সীমাবদ্ধ।"
            : "The services are provided \"as is\". We strive to deliver quality service but are not liable for indirect losses arising from circumstances beyond our control (natural disasters, network outages, courier delays). Our maximum liability is limited to the amount paid for the relevant order."}
        </p>
      ),
    },
    {
      id: "account",
      title: isBn ? "অ্যাকাউন্ট ও নিবন্ধন" : "Account & Registration",
      content: (
        <BulletList
          items={
            isBn
              ? [
                    "নিবন্ধন বা অর্ডারের সময় সঠিক ও হালনাগাদ তথ্য দিন এবং তা হালনাগাদ রাখুন।",
                    "লগইন তথ্য ও ওয়ান-টাইম কোড গোপন রাখা এবং আপনার অ্যাকাউন্টের সকল কার্যকলাপের দায়িত্ব আপনার।",
                    "অননুমোদিত ব্যবহারের সন্দেহ হলে সাথে সাথে আমাদের জানান।",
                    "মিথ্যা তথ্য, সেবার অপব্যবহার বা প্রতারণায় ব্যবহৃত অ্যাকাউন্ট আমরা (সম্ভব হলে নোটিশ দিয়ে) স্থগিত বা বন্ধ করতে পারি।",
                  ]
              : [
                    "Provide accurate, current information when you register or order, and keep it up to date.",
                    "You are responsible for keeping your login details and one-time codes confidential and for all activity under your account.",
                    "Tell us immediately if you suspect unauthorised use of your account.",
                    "We may suspend or close an account that gives false information, abuses the service or is used for fraud, after notice where reasonably possible.",
                  ]
          }
        />
      ),
    },
    {
      id: "product-info",
      title: isBn ? "পণ্য তথ্য, মূল্য ও অর্ডার গ্রহণ" : "Product Information, Pricing & Order Acceptance",
      content: (
        <BulletList
          items={
            isBn
              ? [
                    "বিবরণ, ছবি, স্পেসিফিকেশন ও মূল্য সঠিক রাখতে আমরা যত্নবান; ছবি দৃষ্টান্তমূলক, রং বা প্যাকেজিংয়ে সামান্য পার্থক্য হতে পারে।",
                    "মূল্য বাংলাদেশি টাকায় (BDT) এবং প্রযোজ্য ভ্যাটসহ, অন্যথা উল্লেখ না থাকলে। ডেলিভারি চার্জ নিশ্চিত করার আগে আলাদাভাবে দেখানো হয়।",
                    "পণ্যের প্রাপ্যতা স্টকের উপর নির্ভরশীল। মূল্য বা স্টকে ভুল ধরা পড়লে আমরা সংশ্লিষ্ট অর্ডার বাতিল করতে পারি এবং পরিশোধিত টাকা সম্পূর্ণ ফেরত দেব।",
                    "আমরা অর্ডার নিশ্চিত করলে (এসএমএস, ইমেইল, হোয়াটসঅ্যাপ বা কলে) তবেই চুক্তি বাধ্যতামূলক হয়। সন্দেহজনক প্রতারণা, অপব্যবহার, অপ্রাপ্যতা বা সেবা-বহির্ভূত ঠিকানার কারণে অর্ডার প্রত্যাখ্যান বা বাতিল করতে পারি; পরিশোধিত অর্থ সম্পূর্ণ ফেরত পাবেন।",
                    "কুপন ও অফার সংশ্লিষ্ট শর্ত মেনে চলে, নগদে রূপান্তরযোগ্য নয় এবং নির্ধারিত সময়ের পর প্রত্যাহার হতে পারে।",
                  ]
              : [
                    "We take care that descriptions, images, specifications and prices are accurate; images are illustrative and minor variations in colour or packaging can occur.",
                    "Prices are in Bangladeshi Taka (BDT) and include applicable VAT unless stated otherwise. Delivery charges are shown separately before you confirm.",
                    "Availability is subject to stock. If a price or stock error is found, we may cancel the affected order and will refund any payment in full.",
                    "An order is a binding contract only once we confirm it (by SMS, email, WhatsApp or call). We may decline or cancel an order for suspected fraud, abuse, unavailability or an unserviceable address, with a full refund of anything paid.",
                    "Coupons and offers follow the conditions shown with them, cannot be exchanged for cash and may be withdrawn after their stated period.",
                  ]
          }
        />
      ),
    },
    {
      id: "payments-security",
      title: isBn ? "পেমেন্ট পদ্ধতি ও নিরাপত্তা" : "Payment Methods & Security",
      content: (
        <BulletList
          items={
            isBn
              ? [
                    "ক্যাশ অন ডেলিভারি, bKash, Nagad, কার্ড ও ব্যাংক পেমেন্ট (গেটওয়ে পার্টনারের মাধ্যমে) চেকআউটে দেখানো হয়; অর্ডার বা এলাকাভেদে ভিন্ন হতে পারে।",
                    "কার্ড ও ওয়ালেটের তথ্য পেমেন্ট প্রদানকারীর নিরাপদ পেজে দিতে হয়; আমরা আপনার পূর্ণ কার্ড তথ্য বা পিন দেখি না বা সংরক্ষণ করি না।",
                    "ম্যানুয়াল মোবাইল-ওয়ালেট পেমেন্টে সঠিক ট্রানজেকশন আইডি ও পরিমাণ দিতে হবে; অমিল, দ্বৈত বা যাচাইহীন পেমেন্টে অর্ডার বিলম্বিত হতে পারে এবং পাঠানোর আগে আপনার সাথে মীমাংসা করা হয়।",
                    "পেমেন্ট ব্যর্থ হয়ে টাকা কেটে গেলে ট্রানজেকশনের তথ্যসহ যোগাযোগ করুন; যাচাইকৃত অর্থ মূল পেমেন্ট পদ্ধতিতে ফেরত দেওয়া হয়।",
                  ]
              : [
                    "Available methods (cash on delivery, bKash, Nagad, card and bank payments via our gateway partners) are shown at checkout and may differ by order or area.",
                    "Card and wallet credentials are entered on the payment provider's secure page; we do not see or store your full card details or PIN.",
                    "For manual mobile-wallet payments you must give the correct transaction ID and amount; mismatched, duplicate or unverified payments may delay the order and are resolved with you before dispatch.",
                    "If a payment fails but money is deducted, contact us with the transaction details; verified amounts are refunded to the original payment method.",
                  ]
          }
        />
      ),
    },
    {
      id: "warranty-claims",
      title: isBn ? "ওয়ারেন্টি ও ডেড-অন-অ্যারাইভাল" : "Warranty & Dead-on-Arrival",
      content: (
        <div className="space-y-3">
        <p>
          {isBn
            ? "ব্র্যান্ড বা বিক্রেতার ওয়ারেন্টিযুক্ত পণ্যে পণ্য পেজ বা ওয়ারেন্টি কার্ডে উল্লেখিত মেয়াদ ও শর্ত প্রযোজ্য। ওয়ারেন্টি উৎপাদনজনিত ত্রুটি কভার করে; শারীরিক বা তরল ক্ষতি, অপব্যবহার, অননুমোদিত মেরামত বা স্বাভাবিক ক্ষয় কভার করে না।"
            : "Where a product carries a brand or seller warranty, the warranty period and terms stated on the product page or warranty card apply. Warranty covers manufacturing defects; it does not cover physical or liquid damage, misuse, unauthorised repair or normal wear."}
        </p>
        <p>
          {isBn
            ? "প্রথম খোলার সময় চালু না হওয়া (ডেড-অন-অ্যারাইভাল), ক্ষতিগ্রস্ত বা ভুল পণ্য রিফান্ড নীতির রিটার্ন সময়ের মধ্যে — সম্ভব হলে আনবক্সিংয়ের ছবি/ভিডিওসহ — জানান। আমরা প্রতিস্থাপন বা রিফান্ড দিই এবং ফেরত পাঠানোর খরচ বহন করি।"
            : "A product that does not work when first opened (dead on arrival) or arrives damaged or wrong should be reported within the return window in our Refund Policy, ideally with an unboxing photo or video. We then replace or refund it and bear the return cost."}
        </p>
        </div>
      ),
    },
    {
      id: "bookings",
      title: isBn ? "সেবা বুকিং" : "Service Bookings",
      content: (
        <p>
          {isBn
            ? "আমরা নিশ্চিত করলে তবেই বুকিং নিশ্চিত হয়। মূল্য, প্রয়োজনীয় কাগজপত্র, অগ্রিমের পরিমাণ, সময় পরিবর্তন ও বাতিলের শর্ত সেবা পেজ বা বুকিং নিশ্চিতকরণে দেখানো হয় এবং ওই বুকিংয়ে প্রযোজ্য। সরকারি বা তৃতীয় পক্ষের ফি থাকলে তা আলাদা দেখানো হয় এবং সংশ্লিষ্ট সংস্থাকে পরিশোধের পর ফেরতযোগ্য নয়।"
            : "A booking is confirmed only when we confirm it. Prices, required documents, advance amounts, rescheduling and cancellation conditions are shown on the service page or booking confirmation and apply to that booking. Where a government or third-party fee is involved, it is shown separately and is non-refundable once paid to that body."}
        </p>
      ),
    },
    {
      id: "force-majeure",
      title: isBn ? "অনিবার্য কারণ (ফোর্স ম্যাজোর)" : "Force Majeure",
      content: (
        <p>
          {isBn
            ? "আমাদের যুক্তিসঙ্গত নিয়ন্ত্রণ-বহির্ভূত ঘটনা — প্রাকৃতিক দুর্যোগ, বন্যা, অগ্নিকাণ্ড, মহামারি, ধর্মঘট বা হরতাল, যুদ্ধ বা অস্থিরতা, সরকারি পদক্ষেপ, বিদ্যুৎ, ইন্টারনেট বা কুরিয়ার নেটওয়ার্কের বিপর্যয় — থেকে সৃষ্ট বিলম্ব বা ব্যর্থতার দায় আমরা বহন করি না। আমরা দ্রুত জানাব, এবং প্রভাবিত অর্ডার বাতিল করে পরিশোধিত পুরো টাকা ফেরত নিতে পারবেন।"
            : "We are not liable for delay or failure caused by events beyond our reasonable control — natural disaster, flood, fire, epidemic, strike or hartal, war or unrest, government action, power, internet or courier network failure. We will tell you promptly, and you may cancel an affected order for a full refund of what you paid."}
        </p>
      ),
    },
    {
      id: "indemnity",
      title: isBn ? "অপব্যবহারের দায়" : "Responsibility for Misuse",
      content: (
        <p>
          {isBn
            ? "আপনার সাইট অপব্যবহার, এই শর্ত ভঙ্গ বা অন্যের অধিকার লঙ্ঘনের কারণে আমাদের ক্ষতি বা তৃতীয় পক্ষের দাবি তৈরি হলে আইন অনুমোদিত সীমায় আপনি ক্ষতিপূরণ দিতে সম্মত। এতে আইনগত কোনো ভোক্তা-অধিকার ক্ষুণ্ণ হয় না; আমাদের নিজস্ব প্রতারণা, চরম অবহেলা এবং আইনে বাদ দেওয়া যায় না এমন দায় আমরা বহন করব।"
            : "If your misuse of the site, breach of these terms or infringement of another person's rights causes us loss or a third-party claim, you agree to compensate us to the extent permitted by law. This does not reduce any consumer right you have by law, and we remain responsible for our own fraud, gross negligence and anything the law does not allow us to exclude."}
        </p>
      ),
    },
    {
      id: "general",
      title: isBn ? "সাধারণ বিধান" : "General Provisions",
      content: (
        <BulletList
          items={
            isBn
              ? [
                    "ইলেকট্রনিক চুক্তি: এই শর্তাবলী ও আপনার অর্ডার বাংলাদেশের আইন — চুক্তি আইন, ১৮৭২ ও তথ্য ও যোগাযোগ প্রযুক্তি আইন, ২০০৬ সহ — অনুযায়ী বৈধ ইলেকট্রনিক চুক্তি গঠন করে; আমাদের ইলেকট্রনিক রেকর্ড লেনদেনের প্রমাণ হিসেবে গ্রহণযোগ্য।",
                    "পৃথকযোগ্যতা: কোনো বিধান অবৈধ বা অকার্যকর প্রমাণিত হলে বাকি অংশ বহাল থাকবে।",
                    "অধিকার ত্যাগ নয়: কোনো বিধান প্রয়োগ না করা মানে তা ত্যাগ করা নয়।",
                    "হস্তান্তর: আমরা ব্যবসার উত্তরসূরির কাছে আমাদের অধিকার ও দায়িত্ব হস্তান্তর করতে পারি; আপনি আমাদের সম্মতি ছাড়া তা পারবেন না।",
                    "সম্পূর্ণ চুক্তি: এই শর্তাবলী, গোপনীয়তা নীতি, কুকি নীতি ও রিফান্ড নীতি মিলে সাইট ব্যবহারের সম্পূর্ণ চুক্তি।",
                    "তৃতীয় পক্ষের লিংক: আমরা যেসব বাইরের ওয়েবসাইটে লিংক দিই, তাদের বিষয়বস্তু বা চর্চার দায় আমাদের নয়।",
                    "নোটিশ: সাইটে প্রকাশ করে অথবা আপনার দেওয়া যোগাযোগের ঠিকানায় এসএমএস, ইমেইল বা হোয়াটসঅ্যাপে আমরা নোটিশ দিতে পারি।",
                  ]
              : [
                    "Electronic contracts: these terms and your orders form a valid electronic contract under the laws of Bangladesh, including the Contract Act, 1872 and the Information and Communication Technology Act, 2006; our electronic records are admissible as evidence of the transaction.",
                    "Severability: if any provision is found invalid or unenforceable, the rest remains in force.",
                    "No waiver: failing to enforce a provision is not a waiver of it.",
                    "Assignment: we may transfer our rights and duties to a successor of the business; you may not transfer yours without our consent.",
                    "Entire agreement: these terms, the Privacy Policy, Cookie Policy and Refund Policy together form the whole agreement about your use of the site.",
                    "Third-party links: we are not responsible for the content or practices of external websites we link to.",
                    "Notices: we may give notice by posting on the site or by SMS, email or WhatsApp to the contact details you provided.",
                  ]
          }
        />
      ),
    },
    {
      id: "law",
      title: isBn ? "প্রযোজ্য আইন ও এখতিয়ার" : "Governing Law & Jurisdiction",
      content: (
        <p>
          {isBn
            ? "এই শর্তাবলী গণপ্রজাতন্ত্রী বাংলাদেশের প্রচলিত আইন দ্বারা পরিচালিত হবে। উদ্ভূত যেকোনো বিরোধ প্রথমে সৌহার্দ্যপূর্ণভাবে নিষ্পত্তির চেষ্টা করা হবে; ব্যর্থ হলে তা বাংলাদেশের উপযুক্ত আদালতের একচ্ছত্র এখতিয়ারভুক্ত হবে।"
            : "These terms are governed by the laws of the People's Republic of Bangladesh. Any dispute will first be addressed amicably; failing that, it falls under the exclusive jurisdiction of the competent courts of Bangladesh."}
        </p>
      ),
    },
    {
      id: "business-info",
      title: isBn ? "ব্যবসায়িক তথ্য ও আইন মেনে চলা" : "Business Information & Compliance",
      content: (
        <p>
          {isBn
            ? "ডিজিটাল কমার্স পরিচালনা নির্দেশিকা, ২০২১ অনুযায়ী আমাদের ট্রেড লাইসেন্স, TIN/BIN ও অন্যান্য নিবন্ধন নম্বর ওয়েবসাইটের ফুটারে প্রদর্শিত আছে। পণ্যের বিবরণ, মূল্য, ডেলিভারি চার্জ ও সময় অর্ডারের আগে দেখানো হয়। এই শর্তাবলী বাংলা ও ইংরেজিতে দেওয়া হয়েছে; অমিল থাকলে বাংলাদেশের ভোক্তাদের ক্ষেত্রে বাংলা পাঠ প্রাধান্য পাবে।"
            : "In line with the Digital Commerce Operation Guidelines, 2021, our trade licence, TIN/BIN and other registrations are shown in the website footer. Product details, price, delivery charge and delivery time are shown before you order. These terms are provided in Bangla and English; if they differ, the Bangla text prevails for consumers in Bangladesh."}
        </p>
      ),
    },
    {
      id: "delivery-times",
      title: isBn ? "ডেলিভারির সময়সীমা" : "Delivery Timelines",
      content: (
        <div className="space-y-3">
          <BulletList
            items={
              isBn
                ? [
                    "অর্ডার নিশ্চিত হওয়ার (প্রিপেইডের ক্ষেত্রে পেমেন্ট পাওয়ার) পর ৪৮ ঘণ্টার মধ্যে পণ্য কুরিয়ারের কাছে হস্তান্তর করা হয়।",
                    "সাধারণত একই শহর/গ্রামে ৫ দিন এবং অন্য শহর/গ্রামে ১০ দিনের মধ্যে ডেলিভারি দেওয়া হয়।",
                    "সরকারি ছুটি, প্রাকৃতিক দুর্যোগ, হরতাল বা দুর্গম এলাকার কারণে বিলম্ব হলে আমরা আপনাকে জানাব।",
                    "ডেলিভারি চার্জ ও ফ্রি-ডেলিভারির শর্ত চেকআউটে প্রদর্শিত হয়। এখানে উল্লেখিত সময় সর্বোচ্চ সীমা; এলাকাভিত্তিক সাধারণ সময় শিপিং পেজে দেখুন। পণ্য গ্রহণের সময় প্যাকেট যাচাই করে নিন।",
                  ]
                : [
                    "Goods are handed to the courier within 48 hours of order confirmation (or of receiving payment for prepaid orders).",
                    "Delivery is normally within 5 days in the same city/village and 10 days to other cities/villages.",
                    "If public holidays, natural disasters, strikes or remote locations delay delivery, we will tell you.",
                    "Delivery charges and any free-delivery conditions are shown at checkout. The times above are maximums; typical times by area are on the Shipping page. Please check the parcel when you receive it.",
                  ]
            }
          />
        </div>
      ),
    },
    {
      id: "advance",
      title: isBn ? "অগ্রিম পেমেন্ট" : "Advance Payments",
      content: (
        <p>
          {isBn
            ? "স্টকে থাকা ও পাঠানোর জন্য প্রস্তুত পণ্যে শতভাগ অগ্রিম নেওয়া হতে পারে। স্টকে না থাকা, প্রি-অর্ডার বা বিশেষভাবে আনতে হয় এমন পণ্যে সর্বোচ্চ ১০% অগ্রিম নেওয়া হয় (অনুমোদিত এসক্রো সেবা ব্যতীত)। কাস্টম সফটওয়্যার ও সেবার অগ্রিম কোটেশন বা চুক্তির ধাপ অনুযায়ী হয়। অগ্রিম ফেরতের নিয়ম রিফান্ড নীতিতে আছে।"
            : "Full advance payment may be taken for in-stock, ready-to-ship items. For out-of-stock, pre-order or special-order items we take at most a 10% advance (unless an authorised escrow service is used). Advances for custom software and services follow the quotation or agreement milestones. Refunds of advances are covered by the Refund Policy."}
        </p>
      ),
    },
    {
      id: "complaints",
      title: isBn ? "অভিযোগ ও বিরোধ নিষ্পত্তি" : "Complaints & Dispute Resolution",
      content: (
        <p>
          {isBn
            ? "যেকোনো সমস্যায় প্রথমে নিচের অভিযোগ ও কমপ্লায়েন্স ডেস্কে জানান — আমরা ৭২ ঘণ্টার মধ্যে সাড়া দিই এবং সৌহার্দ্যপূর্ণভাবে সমাধানের চেষ্টা করি। সমাধান না হলে আপনি জাতীয় ভোক্তা-অধিকার সংরক্ষণ অধিদপ্তরে (হটলাইন ১৬১২১) অভিযোগ করতে পারেন বা আইনানুগ প্রতিকার চাইতে পারেন। এই শর্তাবলী আপনার আইনগত ভোক্তা-অধিকার ক্ষুণ্ণ করে না।"
            : "For any problem, first contact the Complaints & Compliance Desk below — we respond within 72 hours and try to resolve it amicably. If it is not resolved, you may complain to the Directorate of National Consumer Rights Protection (hotline 16121) or seek legal remedies. These terms do not limit your statutory consumer rights."}
        </p>
      ),
    },
    {
      id: "electronic",
      title: isBn ? "ইলেকট্রনিক যোগাযোগ ও সম্মতি" : "Electronic Communications & Consent",
      content: (
        <p>
          {isBn
            ? "ওয়েবসাইট ব্যবহার, অর্ডার বা বুকিং দেওয়ার মাধ্যমে আপনি এই শর্তাবলীতে সম্মত হন এবং অর্ডার/বুকিং সংক্রান্ত বার্তা এসএমএস, ইমেইল বা হোয়াটসঅ্যাপে পেতে সম্মতি দেন। আপনার সম্মতির তারিখ ও তথ্যের রেকর্ড আমরা সংরক্ষণ করি। তথ্য ব্যবহারের বিস্তারিত আমাদের গোপনীয়তা নীতিতে আছে।"
            : "By using the website or placing an order or booking you accept these terms and agree to receive order/booking messages by SMS, email or WhatsApp. We keep a record of when and what you consented to. How we use your data is described in our Privacy Policy."}
        </p>
      ),
    },
    {
      id: "changes",
      title: isBn ? "পরিবর্তন ও যোগাযোগ" : "Changes & Contact",
      content: (
        <div className="space-y-3">
          <p>
            {isBn
              ? "আমরা যেকোনো সময় এই শর্তাবলী হালনাগাদ করতে পারি; উল্লেখযোগ্য পরিবর্তন এই পেজে প্রকাশ করা হবে এবং শেষ হালনাগাদের তারিখ বদলে যাবে।"
              : "We may update these terms at any time; significant changes will be posted on this page and the last-updated date will change."}
          </p>
          <ComplianceOfficerBlock />
        </div>
      ),
    },
  ];

  return (
    <main>
      <PageHero
        pageKey="terms"
        variant="light"
        title={pageTitle}
        breadcrumbs={[{ label: isBn ? "শর্তাবলী" : "Terms" }]}
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
