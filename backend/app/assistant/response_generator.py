"""Bilingual response generation from structured data — no external AI."""

from typing import Any

from app.assistant.constants import Intent


class ResponseGenerator:
    def greeting(self, language: str, name: str | None = None, custom_welcome: str | None = None) -> str:
        if custom_welcome:
            return custom_welcome
        if language == "bn":
            return "আমি ABO Enterprise সহকারী। অর্ডার দিন, সেবা বুক করুন, অর্ডার/বুকিং/লিড ট্র্যাক করুন — সব কিছু এখান থেকেই।"
        return (
            "I'm the ABO Enterprise assistant. Place orders, book services, track orders/bookings/leads — all from here."
        )

    def web_enriched(self, language: str, summary: str) -> str:
        if language == "bn":
            return f"আমি আমাদের ডাটাবেস ও ওয়েব থেকে পেলাম:\n\n{summary}"
        return f"From our catalog and web search:\n\n{summary}"

    def unknown(self, language: str) -> str:
        if language == "bn":
            return (
                "দুঃখিত, আমি ঠিক বুঝতে পারিনি। "
                "পণ্য, সেবা, অর্ডার ট্র্যাক, ডেলিভারি চার্জ, কুপন বা যোগাযোগ সম্পর্কে জিজ্ঞাসা করুন।"
            )
        return (
            "I'm sorry, I didn't quite understand. "
            "Try asking about products, services, order tracking, delivery charges, coupons, or contact info."
        )

    def need_more_info(self, language: str, fields: list[str]) -> str:
        if language == "bn":
            return f"এই কাজের জন্য আরও তথ্য দরকার: {', '.join(fields)}। অনুগ্রহ করে জানান।"
        return f"I need more information: {', '.join(fields)}. Please provide these details."

    def permission_denied(self, language: str, reason: str | None = None) -> str:
        if language == "bn":
            return reason or "এই কাজের অনুমতি নেই।"
        return reason or "You don't have permission for this action."

    def business_blocked(self, language: str, message_en: str | None, message_bn: str | None) -> str:
        if language == "bn" and message_bn:
            return message_bn
        return message_en or "This request cannot be processed at the moment."

    def _product_link(self, slug: str) -> dict:
        return {"label": "View product", "label_bn": "পণ্য দেখুন", "url": f"/products/{slug}", "type": "product"}

    def _service_link(self, slug: str) -> dict:
        return {"label": "View service", "label_bn": "সেবা দেখুন", "url": f"/services/{slug}", "type": "service"}

    def _blog_link(self, slug: str, title: str) -> dict:
        return {"label": title, "label_bn": title, "url": f"/blog/{slug}", "type": "blog"}

    def product_list(self, language: str, products: list[dict]) -> str:
        if not products:
            return "কোনো পণ্য পাওয়া যায়নি।" if language == "bn" else "No products found."
        lines = []
        for p in products:
            name = p.get("name_bn") if language == "bn" else p.get("name_en")
            price = p.get("price", 0)
            stock = p.get("stock_quantity", 0)
            slug = p.get("slug", "")
            stock_label = "উপলব্ধ" if stock > 0 else "স্টক নেই"
            if language == "en":
                stock_label = "in stock" if stock > 0 else "out of stock"
            line = f"• **{name}** — ৳{price:,.0f} ({stock_label})"
            if slug:
                line += f"\n  → /products/{slug}"
            lines.append(line)
        header = "পাওয়া পণ্য:" if language == "bn" else "Products found:"
        return header + "\n" + "\n".join(lines)

    def product_links(self, products: list[dict]) -> list[dict]:
        links = []
        for p in products:
            slug = p.get("slug")
            if slug:
                name = p.get("name_en") or slug
                links.append({"label": name, "label_bn": p.get("name_bn") or name, "url": f"/products/{slug}", "type": "product"})
        return links

    def product_detail(self, language: str, product: dict) -> str:
        name = product.get("name_bn") if language == "bn" else product.get("name_en")
        desc = product.get("description_bn") if language == "bn" else product.get("description_en")
        price = product.get("price", 0)
        stock = product.get("stock_quantity", 0)
        slug = product.get("slug", "")
        avail = "উপলব্ধ" if stock > 0 else "স্টক নেই"
        if language == "en":
            avail = "available" if stock > 0 else "out of stock"
        link_line = f"\n🔗 /products/{slug}" if slug else ""
        if language == "bn":
            return (
                f"**{name}**\nদাম: ৳{price:,.0f}\nস্টক: {stock} ({avail})\n"
                f"{desc or 'বিস্তারিত পণ্য পেজে দেখুন।'}{link_line}"
            )
        return (
            f"**{name}**\nPrice: ৳{price:,.0f}\nStock: {stock} ({avail})\n"
            f"{desc or 'See product page for details.'}{link_line}"
        )

    def service_list(self, language: str, services: list[dict]) -> str:
        if not services:
            return "কোনো সেবা পাওয়া যায়নি।" if language == "bn" else "No services found."
        lines = []
        for s in services:
            name = s.get("name_bn") if language == "bn" else s.get("name_en")
            slug = s.get("slug", "")
            price_hint = self._service_price_hint(s, language)
            line = f"• **{name}**"
            if price_hint:
                line += f" — {price_hint}"
            if slug:
                line += f"\n  → /services/{slug}"
            lines.append(line)
        header = "আমাদের সেবা:" if language == "bn" else "Our services:"
        return header + "\n" + "\n".join(lines)

    def service_links(self, services: list[dict]) -> list[dict]:
        links = []
        for s in services:
            slug = s.get("slug")
            if slug:
                name = s.get("name_en") or slug
                links.append({"label": name, "label_bn": s.get("name_bn") or name, "url": f"/services/{slug}", "type": "service"})
        return links

    def service_detail(self, language: str, service: dict) -> str:
        name = service.get("name_bn") if language == "bn" else service.get("name_en")
        desc = service.get("description_bn") if language == "bn" else service.get("description_en")
        slug = service.get("slug", "")
        price_hint = self._service_price_hint(service, language)
        lines = [f"**{name}**"]
        if price_hint:
            lines.append(price_hint)
        if desc:
            lines.append(desc[:400] + ("…" if len(desc or "") > 400 else ""))
        tiers = service.get("tiers") or []
        if tiers:
            tier_header = "প্যাকেজ:" if language == "bn" else "Packages:"
            lines.append(tier_header)
            for t in tiers:
                dur = f" ({t['duration_days']} days)" if t.get("duration_days") else ""
                lines.append(f"  • {t['name']}: ৳{t['price']:,.0f}{dur}")
        if slug:
            lines.append(f"🔗 /services/{slug}")
        return "\n".join(lines)

    def _service_price_hint(self, service: dict, language: str) -> str:
        ptype = service.get("pricing_type", "")
        if ptype == "hourly" and service.get("hourly_rate"):
            label = "ঘণ্টায়" if language == "bn" else "from"
            return f"{label} ৳{service['hourly_rate']:,.0f}/hr"
        if service.get("base_price"):
            return f"৳{service['base_price']:,.0f}"
        if service.get("min_price") and service.get("max_price"):
            return f"৳{service['min_price']:,.0f} – ৳{service['max_price']:,.0f}"
        if ptype == "custom_quote":
            return "কাস্টম কোট" if language == "bn" else "Custom quote"
        return ""

    def order_status(self, language: str, order: dict) -> str:
        track_hint = f"\n🔗 /track?order={order['order_number']}" if order.get("order_number") else ""
        items_line = ""
        items = order.get("items") or []
        if items:
            item_str = ", ".join(f"{i['name']} x{i['quantity']}" for i in items[:3])
            items_line = f"\n📦 {item_str}"
        courier_line = ""
        if order.get("courier_tracking_id"):
            courier_line = f"\n🚚 {order.get('courier_provider', 'Courier')}: {order['courier_tracking_id']}"
        if language == "bn":
            return (
                f"অর্ডার **{order['order_number']}**\n"
                f"স্ট্যাটাস: **{order['order_status']}** | পেমেন্ট: {order.get('payment_status', 'N/A')}\n"
                f"মোট ৳{order['total']:,.0f} ({order.get('items_count', len(items))}টি আইটেম)"
                f"{items_line}{courier_line}{track_hint}"
            )
        return (
            f"Order **{order['order_number']}**\n"
            f"Status: **{order['order_status']}** | Payment: {order.get('payment_status', 'N/A')}\n"
            f"Total ৳{order['total']:,.0f} ({order.get('items_count', len(items))} item(s))"
            f"{items_line}{courier_line}{track_hint}"
        )

    def booking_status(self, language: str, booking: dict) -> str:
        if language == "bn":
            price = f"\nদাম: ৳{booking['quoted_price']:,.0f}" if booking.get("quoted_price") else ""
            return (
                f"বুকিং **{booking['booking_number']}**\n"
                f"সেবা: {booking.get('service_name', 'N/A')}\n"
                f"স্ট্যাটাস: **{booking.get('status', 'pending')}** | পেমেন্ট: {booking.get('payment_status', 'N/A')}"
                f"{price}"
            )
        price = f"\nQuoted: ৳{booking['quoted_price']:,.0f}" if booking.get("quoted_price") else ""
        return (
            f"Booking **{booking['booking_number']}**\n"
            f"Service: {booking.get('service_name', 'N/A')}\n"
            f"Status: **{booking.get('status', 'pending')}** | Payment: {booking.get('payment_status', 'N/A')}"
            f"{price}"
        )

    def lead_status(self, language: str, lead: dict) -> str:
        if language == "bn":
            return (
                f"লিড **{lead['lead_number']}**\n"
                f"ধরন: {lead.get('lead_type', 'general')} | স্ট্যাটাস: **{lead.get('status', 'new')}**"
            )
        return (
            f"Lead **{lead['lead_number']}**\n"
            f"Type: {lead.get('lead_type', 'general')} | Status: **{lead.get('status', 'new')}**"
        )

    def automation_success(self, language: str, action: str, reference: str) -> str:
        if language == "bn":
            return f"✅ {action} সফল হয়েছে। রেফারেন্স: {reference}"
        return f"✅ {action} completed successfully. Reference: {reference}"

    def contact(self, language: str, info: dict) -> str:
        hours = info.get("business_hours")
        hours_line = f"\n🕐 {hours}" if hours else ""
        if language == "bn":
            return (
                f"যোগাযোগ:\n📞 {info.get('phone', 'N/A')}\n"
                f"📧 {info.get('email', 'N/A')}\n"
                f"📍 {info.get('address') or 'ঠিকানা জানতে কল করুন'}{hours_line}"
            )
        return (
            f"Contact us:\n📞 {info.get('phone', 'N/A')}\n"
            f"📧 {info.get('email', 'N/A')}\n"
            f"📍 {info.get('address') or 'Call for address'}{hours_line}"
        )

    def delivery_info(self, language: str, info: dict) -> str:
        parts = [info.get("summary") or ""]
        charges = []
        if info.get("dhaka_charge"):
            label = "ঢাকা" if language == "bn" else "Dhaka"
            charges.append(f"{label}: ৳{info['dhaka_charge']}")
        if info.get("outside_charge"):
            label = "ঢাকার বাইরে" if language == "bn" else "Outside Dhaka"
            charges.append(f"{label}: ৳{info['outside_charge']}")
        if info.get("sylhet_charge"):
            label = "সিলেট" if language == "bn" else "Sylhet"
            charges.append(f"{label}: ৳{info['sylhet_charge']}")
        if charges:
            header = "ডেলিভারি চার্জ:" if language == "bn" else "Delivery charges:"
            parts.append(header + " " + " | ".join(charges))
        if info.get("delivery_time"):
            label = "সময়:" if language == "bn" else "Estimated time:"
            parts.append(f"{label} {info['delivery_time']}")
        if info.get("free_delivery_min"):
            label = "ফ্রি ডেলিভারি (ন্যূনতম):" if language == "bn" else "Free delivery (min order):"
            parts.append(f"{label} ৳{info['free_delivery_min']}")
        return "\n".join(p for p in parts if p)

    def coupon_info(self, language: str, coupon: dict) -> str:
        min_line = ""
        if coupon.get("min_subtotal"):
            min_line = f" (min ৳{coupon['min_subtotal']:,.0f})" if language == "en" else f" (ন্যূনতম ৳{coupon['min_subtotal']:,.0f})"
        if language == "bn":
            return (
                f"কুপন **{coupon['code']}**: {coupon['discount_percent']}% ছাড়{min_line}। "
                "চেকআউটে কোড ব্যবহার করুন।"
            )
        return (
            f"Coupon **{coupon['code']}**: {coupon['discount_percent']}% off{min_line}. "
            "Apply at checkout."
        )

    def coupon_list(self, language: str, coupons: list[dict]) -> str:
        if not coupons:
            return "কোনো সক্রিয় কুপন নেই।" if language == "bn" else "No active coupons available."
        header = "সক্রিয় কুপন:" if language == "bn" else "Active coupons:"
        lines = [
            f"• **{c['code']}** — {c['discount_percent']}%"
            + (f" (min ৳{c['min_subtotal']:,.0f})" if c.get("min_subtotal") else "")
            for c in coupons
        ]
        return header + "\n" + "\n".join(lines)

    def invoice_help(self, language: str, order_number: str | None = None) -> str:
        if order_number:
            if language == "bn":
                return (
                    f"অর্ডার **{order_number}**-এর ইনভয়েস ডাউনলোড করতে "
                    f"অর্ডার সফল পেজ বা /track?order={order_number} ব্যবহার করুন।"
                )
            return (
                f"To download the invoice for order **{order_number}**, "
                f"visit the order success page or /track?order={order_number}."
            )
        if language == "bn":
            return "ইনভয়েস পেতে অর্ডার নম্বর জানান। অর্ডার সফল হওয়ার পর PDF ডাউনলোড করা যায়।"
        return "Share your order number for invoice help. PDF download is available after a successful order."

    def faq_answer(self, language: str, text: str) -> str:
        return text

    def faq_search_results(self, language: str, results: list[dict]) -> str:
        if not results:
            return self.unknown(language)
        header = "সম্ভাব্য উত্তর:" if language == "bn" else "Possible answers:"
        lines = [f"• {r['answer']}" for r in results]
        return header + "\n" + "\n".join(lines)

    def blog_list(self, language: str, posts: list[dict]) -> str:
        if not posts:
            return "কোনো ব্লগ পোস্ট নেই।" if language == "bn" else "No blog posts available."
        header = "সাম্প্রতিক ব্লগ:" if language == "bn" else "Recent blog posts:"
        lines = []
        for p in posts:
            title = p.get("title_bn") if language == "bn" and p.get("title_bn") else p.get("title_en", "")
            slug = p.get("slug", "")
            line = f"• **{title}**"
            if slug:
                line += f"\n  → /blog/{slug}"
            lines.append(line)
        return header + "\n" + "\n".join(lines)

    def blog_links(self, posts: list[dict]) -> list[dict]:
        return [
            self._blog_link(p["slug"], p.get("title_en") or p["slug"])
            for p in posts if p.get("slug")
        ]

    def review_request(self, language: str) -> str:
        if language == "bn":
            return "আপনার মতামত আমাদের কাছে গুরুত্বপূর্ণ। Google/Facebook-এ রিভিউ দিন বা সাপোর্টে লিখুন — ধন্যবাদ!"
        return "Your feedback matters! Leave a review on Google/Facebook or message our support team — thank you!"

    def portfolio_info(self, language: str) -> str:
        if language == "bn":
            return "আমাদের কাজ ও প্রজেক্ট দেখতে /services পেজে যান অথবা কাস্টম কোটের জন্য জিজ্ঞাসা করুন।"
        return "See our work on the /services page, or ask for a custom quote for your project."

    # ── Workflow prompts ────────────────────────────────────────────

    def workflow_cancelled(self, language: str) -> str:
        return "অ্যাকশন বাতিল করা হয়েছে।" if language == "bn" else "Action cancelled."

    def workflow_confirm_prompt(self, language: str) -> str:
        return "নিশ্চিত করতে 'হ্যাঁ' লিখুন, বাতিল করতে 'না'।" if language == "bn" else "Type 'yes' to confirm or 'no' to cancel."

    def workflow_error(self, language: str, error: str) -> str:
        return f"❌ {error}" if language == "en" else f"❌ সমস্যা: {error}"

    def workflow_ask_product(self, language: str) -> str:
        return "কোন পণ্য অর্ডার করবেন? পণ্যের নাম লিখুন।" if language == "bn" else "Which product would you like to order? Type the product name."

    def workflow_ask_quantity(self, language: str, product_name: str) -> str:
        return f"**{product_name}** — কতটি চান?" if language == "bn" else f"**{product_name}** — how many would you like?"

    def workflow_ask_add_more(self, language: str, count: int) -> str:
        if language == "bn":
            return f"🛒 {count}টি পণ্য কার্টে। আরো পণ্য যোগ করবেন? (হ্যাঁ/না)"
        return f"🛒 {count} item(s) in cart. Add another product? (yes/no)"

    def workflow_ask_name(self, language: str) -> str:
        return "আপনার নাম জানান।" if language == "bn" else "Please share your name."

    def workflow_ask_phone(self, language: str) -> str:
        return "আপনার ফোন নম্বর দিন (01XXXXXXXXX)।" if language == "bn" else "Please share your phone number (01XXXXXXXXX)."

    def workflow_ask_address(self, language: str) -> str:
        return "ডেলিভারি ঠিকানা দিন (জেলা, এলাকা, বিস্তারিত)।" if language == "bn" else "Delivery address (district, area, details)."

    def workflow_ask_payment(self, language: str) -> str:
        return "পেমেন্ট পদ্ধতি: bKash / Nagad / COD — কোনটি?" if language == "bn" else "Payment method: bKash / Nagad / COD — which one?"

    def workflow_ask_payment_number(self, language: str, method: str) -> str:
        return f"{method} TrxID/নম্বর দিন।" if language == "bn" else f"Please share your {method} transaction ID/number."

    def workflow_ask_service(self, language: str) -> str:
        return "কোন সেবা বুক করবেন? সেবার নাম লিখুন।" if language == "bn" else "Which service to book? Type the service name."

    def workflow_ask_booking_details(self, language: str) -> str:
        return "প্রজেক্ট/সেবার বিস্তারিত জানান।" if language == "bn" else "Please describe your project or service requirements."

    def workflow_ask_lead_details(self, language: str) -> str:
        return "আপনার প্রয়োজনীয়তা/প্রজেক্ট সম্পর্কে বিস্তারিত লিখুন।" if language == "bn" else "Describe your project or requirements."

    def workflow_product_not_found(self, language: str) -> str:
        return "পণ্য পাওয়া যায়নি। আবার নাম লিখুন বা 'বাতিল'।" if language == "bn" else "Product not found. Try another name or type 'cancel'."

    def workflow_service_not_found(self, language: str) -> str:
        return "সেবা পাওয়া যায়নি। আবার নাম লিখুন বা 'বাতিল'।" if language == "bn" else "Service not found. Try another name or type 'cancel'."

    def workflow_out_of_stock(self, language: str) -> str:
        return "এই পণ্যের স্টক নেই। অন্য পণ্য চেষ্টা করুন।" if language == "bn" else "This product is out of stock. Try another product."

    def workflow_invalid_quantity(self, language: str) -> str:
        return "সঠিক সংখ্যা লিখুন (যেমন: 1, 2, 3)।" if language == "bn" else "Enter a valid quantity (e.g. 1, 2, 3)."

    def workflow_insufficient_stock(self, language: str, available: int) -> str:
        return f"স্টকে {available}টি আছে। কম সংখ্যা দিন।" if language == "bn" else f"Only {available} available. Enter a lower quantity."

    def workflow_order_summary(self, language: str, data: dict) -> str:
        cart = data.get("cart", [])
        lines = []
        subtotal = 0.0
        for item in cart:
            line = float(item["product_price"]) * int(item["quantity"])
            subtotal += line
            lines.append(f"• {item['product_name']} x{item['quantity']} = ৳{line:,.0f}")
        if language == "bn":
            header = "📋 অর্ডার সারাংশ:\n"
            footer = f"\n👤 {data.get('customer_name')} | 📞 {data.get('customer_phone')}\n📍 {data.get('delivery_address')}\n💳 {data.get('payment_method')}\n\nনিশ্চিত? (হ্যাঁ/না)"
        else:
            header = "📋 Order summary:\n"
            footer = f"\n👤 {data.get('customer_name')} | 📞 {data.get('customer_phone')}\n📍 {data.get('delivery_address')}\n💳 {data.get('payment_method')}\n\nConfirm? (yes/no)"
        return header + "\n".join(lines) + f"\nSubtotal: ৳{subtotal:,.0f}" + footer

    def workflow_booking_summary(self, language: str, data: dict) -> str:
        svc = data.get("service", {})
        name = svc.get("name_bn") if language == "bn" else svc.get("name_en", "")
        if language == "bn":
            return (
                f"📋 বুকিং সারাংশ:\nসেবা: **{name}**\n👤 {data.get('customer_name')} | 📞 {data.get('customer_phone')}\n"
                f"📝 {data.get('details', '')}\n\nনিশ্চিত? (হ্যাঁ/না)"
            )
        return (
            f"📋 Booking summary:\nService: **{name}**\n👤 {data.get('customer_name')} | 📞 {data.get('customer_phone')}\n"
            f"📝 {data.get('details', '')}\n\nConfirm? (yes/no)"
        )

    def workflow_lead_summary(self, language: str, data: dict) -> str:
        if language == "bn":
            return (
                f"📋 অনুরোধ সারাংশ:\n👤 {data.get('customer_name')} | 📞 {data.get('customer_phone')}\n"
                f"📝 {data.get('project_description', '')}\n\nজমা দিতে 'হ্যাঁ' লিখুন।"
            )
        return (
            f"📋 Request summary:\n👤 {data.get('customer_name')} | 📞 {data.get('customer_phone')}\n"
            f"📝 {data.get('project_description', '')}\n\nType 'yes' to submit."
        )

    def workflow_order_success(self, language: str, order: dict) -> str:
        if language == "bn":
            return (
                f"✅ অর্ডার সফল!\nঅর্ডার নম্বর: **{order['order_number']}**\n"
                f"মোট: ৳{order['total']:,.0f} | স্ট্যাটাস: {order['order_status']}\n"
                "নিচের লিংক থেকে ট্র্যাক ও ইনভয়েস ডাউনলোড করুন।"
            )
        return (
            f"✅ Order placed!\nOrder number: **{order['order_number']}**\n"
            f"Total: ৳{order['total']:,.0f} | Status: {order['order_status']}\n"
            "Use the links below to track and download your invoice."
        )

    def workflow_booking_success(self, language: str, ref: str, service_name: str) -> str:
        if language == "bn":
            return f"✅ বুকিং সফল!\nবুকিং নম্বর: **{ref}**\nসেবা: {service_name}\nশীঘ্রই যোগাযোগ করা হবে।"
        return f"✅ Booking confirmed!\nBooking number: **{ref}**\nService: {service_name}\nWe will contact you shortly."

    def workflow_lead_success(self, language: str, ref: str) -> str:
        if language == "bn":
            return f"✅ অনুরোধ জমা হয়েছে!\nরেফারেন্স: **{ref}**\nশীঘ্রই যোগাযোগ করা হবে।"
        return f"✅ Request submitted!\nReference: **{ref}**\nWe will contact you shortly."

    def feature_disabled(self, language: str, feature: str) -> str:
        if language == "bn":
            return f"এই মুহূর্তে **{feature}** সহকারীর মাধ্যমে unavailable। অনুগ্রহ করে সাপোর্টে যোগাযোগ করুন।"
        return f"**{feature}** is currently unavailable via the assistant. Please contact support."

    def format_response(
        self,
        language: str,
        intent: Intent,
        text: str,
        data: dict[str, Any] | None = None,
        suggestions: list[str] | None = None,
        links: list[dict] | None = None,
    ) -> dict:
        result: dict[str, Any] = {
            "message": text,
            "intent": intent.value,
            "language": language,
            "data": data,
        }
        if suggestions:
            result["suggestions"] = suggestions
        if links:
            result["links"] = links
            if result["data"] is None:
                result["data"] = {}
            result["data"]["links"] = links
        return result
