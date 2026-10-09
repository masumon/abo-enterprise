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
  "inline-flex h-9 w-9 items-center justify-center rounded-full text-white ring-1 ring-white/15 shadow-sm transition hover:scale-110 hover:ring-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400";

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
      <div className="mx-auto flex max-w-3xl flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        {credits.map(({ member, kind }) => {
          const facebook = normalizeExternalUrl(member.facebook);
          const site = normalizeExternalUrl(member.website) || (kind === "developer" ? LEGACY_DEVELOPER_SITE : "");
          const role = bn ? member.role?.bn || member.role?.en : member.role?.en || member.role?.bn;
          return (
            <div
              key={member.id ?? member.name}
              className="flex flex-1 items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 ring-1 ring-white/10 text-left min-w-0"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent-300">{bn ? LABEL[kind].bn : LABEL[kind].en}</p>
                <p className="mt-0.5 truncate text-sm font-bold text-white">{member.name}</p>
                {role && <p className="truncate text-[11px] leading-snug text-white/70">{role}</p>}
              </div>
              {(facebook || site) && (
                <div className="flex flex-shrink-0 items-center gap-2">
                  {facebook && (
                    <IconLink href={facebook} label={`${member.name} — Facebook`} className="bg-[#1877f2]">
                      <FacebookIcon className="h-4 w-4" />
                    </IconLink>
                  )}
                  {site && (
                    <IconLink href={site} label={`${member.name} — ${bn ? "ওয়েবসাইট" : "Website"}`} className="bg-white/10 hover:bg-white/20">
                      <Globe className="h-4 w-4" aria-hidden />
                    </IconLink>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-white/70">
        {bn ? "পরিচালনায়" : "Powered by"} <span className="font-bold uppercase tracking-wide text-white/90">{brandName}</span>
      </p>
    </div>
  );
}
