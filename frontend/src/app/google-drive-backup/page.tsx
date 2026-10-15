import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import { SITE_URL } from "@/lib/tokens";

/**
 * Public page describing the "ABO ENTERPRISE" Google OAuth app (Drive backup) —
 * used as the "Application home page" in Google Auth Platform → Branding.
 * Google requires: describes the app, why it asks for Google data, public (no login),
 * on our verified domain, links the same privacy policy as the consent screen.
 */
export const metadata: Metadata = {
  title: "Google Drive Backup — ABO Enterprise",
  description:
    "How ABO Enterprise's admin panel uses Google Drive to store encrypted backups of its own database, what Google data it accesses and why.",
  alternates: { canonical: `${SITE_URL}/google-drive-backup` },
};

export default function GoogleDriveBackupPage() {
  return (
    <main>
      <PageHero variant="light" title="Google Drive Backup" breadcrumbs={[{ label: "Google Drive Backup" }]} />
      <article className="mx-auto max-w-3xl px-4 py-10 space-y-6 text-gray-800 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">About the app</h2>
          <p>
            <b>ABO ENTERPRISE</b> is the website and online shop of ABO Enterprise, Bangladesh (aboenterprise.com) —
            products, IT and digital services, bookings and orders. The website&apos;s private admin panel includes a
            <b> database backup</b> feature. The site owner can connect their own Google Drive so that a copy of the
            shop&apos;s database (orders, customers, bookings, products) is saved there automatically every day.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">What it does</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Creates a daily (or on-demand) backup of the website&apos;s own database.</li>
            <li>Encrypts the backup before it leaves our server; only the owner&apos;s backup password can open it.</li>
            <li>Uploads it to a folder named <b>&ldquo;ABO Backups&rdquo;</b> in the owner&apos;s Google Drive, reads it back to confirm it is intact, and removes old backups the app created.</li>
            <li>Lets the owner check a backup and restore it to a separate test database when needed.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">Why it asks for Google access</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <b>See, edit, create and delete only the specific Google Drive files you use with this app</b> (scope
              <code className="mx-1">drive.file</code>) — needed to save, verify and clean up the backup files it creates.
              The app cannot see any other file in the Drive.
            </li>
            <li><b>Your email address</b> — only to show the owner which Google account is connected.</li>
          </ul>
          <p>
            Only the website administrator connects a Google account. Customers of the shop are never asked to sign in
            with Google. Google user data is not sold, not shared with third parties, not used for advertising and not
            used to train AI models. The connection can be removed at any time in the admin panel or at{" "}
            <a className="text-brand-600 underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a>.
          </p>
        </section>

        <section className="space-y-2 rounded-xl bg-brand-50 p-4">
          <h2 className="text-lg font-semibold text-gray-900">সংক্ষেপে (বাংলা)</h2>
          <p>
            ABO Enterprise-এর অ্যাডমিন প্যানেল থেকে ওয়েবসাইটের মালিক নিজের Google Drive যুক্ত করলে প্রতিদিন ওয়েবসাইটের ডাটাবেসের
            একটি তালাবদ্ধ (এনক্রিপ্ট করা) কপি সেখানে জমা হয়। অ্যাপটি শুধু নিজের তৈরি backup ফাইল দেখতে পারে — Drive-এর অন্য কোনো
            ফাইল নয়। এই তথ্য কারও কাছে বিক্রি বা শেয়ার করা হয় না।
          </p>
        </section>

        <p className="text-sm">
          Details: <Link href="/legal/privacy" className="text-brand-600 underline">Privacy Policy</Link> ·{" "}
          <Link href="/legal/terms" className="text-brand-600 underline">Terms of Service</Link> ·{" "}
          <Link href="/contact" className="text-brand-600 underline">Contact</Link>
        </p>
      </article>
    </main>
  );
}
