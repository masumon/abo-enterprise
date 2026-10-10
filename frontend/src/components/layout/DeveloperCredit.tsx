"use client";

import type { ReactNode } from "react";
import { Globe } from "lucide-react";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { useLanguageStore } from "@/store/language";
import FacebookIcon from "@/components/icons/FacebookIcon";
import { ABOUT_TEAM_KEY, getAboutTeam, getCreditMembers, normalizeExternalUrl, type CmsTeamMember } from "@/lib/cmsContent";
import { cn } from "@/lib/utils";

const LABEL = {
  developer: { en: "Developed by", bn: "ডেভেলপমেন্ট" },
  design: { en: "Lead Designer", bn: "লিড ডিজাইনার" },
} as const;

/** Keeps the long-standing developer portfolio link working until an admin sets a website on the team member. */
const LEGACY_DEVELOPER_SITE = "https://mumainsumon.netlify.app";

const ICON_BTN =
  "inline-flex h-6 w-6 items-center justify-center rounded-full text-white ring-1 ring-white/15 shadow-sm transition hover:scale-110 hover:ring-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400";

function IconLink({ href, label, className, children }: { href: string; label: string; className: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={cn(ICON_BTN, className)}>
      {children}
    </a>
  );
}

/**
 * Footer developer credit. Names, roles and profile links come from the admin
 * team list (`about_team_json`): members whose role mentions developer /
 * designer / creative are credited, each with icon links for whichever
 * profile links (Facebook, website) the admin has added. Renders nothing
 * until the team data is available.
 */
export default function DeveloperCredit({ className }: { className?: string }) {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const { settings } = usePublicSettings([ABOUT_TEAM_KEY, "site_name"]);
  const team: CmsTeamMember[] = getAboutTeam(settings, []);
  const credits = getCreditMembers(team);
  const brandName = getSettingValue(settings, "site_name", "ABO ENTERPRISE");
  if (credits.length === 0) return null;

  return (
    <div className={cn("w-full pt-1", className)} role="group" aria-label={bn ? "ডেভেলপার ক্রেডিট" : "Developer credits"}>
      <ul className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-white/65">
        {credits.map(({ member, kind }) => {
          const facebook = normalizeExternalUrl(member.facebook);
          const site = normalizeExternalUrl(member.website) || (kind === "developer" ? LEGACY_DEVELOPER_SITE : "");
          return (
            <li key={member.id ?? member.name} className="inline-flex items-center gap-1.5">
              <span>{bn ? LABEL[kind].bn : LABEL[kind].en}:</span>
              <span className="font-semibold text-white/90">{member.name}</span>
              {facebook && (
                <IconLink href={facebook} label={`${member.name} — Facebook`} className="bg-[#1877f2]">
                  <FacebookIcon className="h-3 w-3" />
                </IconLink>
              )}
              {site && (
                <IconLink href={site} label={`${member.name} — ${bn ? "ওয়েবসাইট" : "Website"}`} className="bg-white/10 hover:bg-white/20">
                  <Globe className="h-3 w-3" aria-hidden />
                </IconLink>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-white/60">
        {bn ? "পরিচালনায়" : "Powered by"} <span className="font-bold uppercase tracking-wide text-white/90">{brandName}</span>
      </p>
    </div>
  );
}
