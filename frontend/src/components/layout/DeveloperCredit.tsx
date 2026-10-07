"use client";

import { usePublicSettings } from "@/hooks/usePublicSettings";
import { useLanguageStore } from "@/store/language";
import FacebookIcon from "@/components/icons/FacebookIcon";
import { ABOUT_TEAM_KEY, getAboutTeam, getCreditMembers, normalizeExternalUrl, type CmsTeamMember } from "@/lib/cmsContent";
import { cn } from "@/lib/utils";

const LABEL = {
  developer: { en: "Developed by", bn: "ডেভেলপমেন্ট" },
  design: { en: "Design & creative", bn: "ডিজাইন ও ক্রিয়েটিভ" },
} as const;

/** Keeps the long-standing developer portfolio link working until an admin sets a website on the team member. */
const LEGACY_DEVELOPER_SITE = "https://mumainsumon.netlify.app";

/**
 * Footer developer credit. Names, roles and profile links come from the admin
 * team list (`about_team_json`): members whose role mentions developer /
 * designer / creative are credited, each with a Facebook icon link when the
 * admin has added one. Renders nothing until the team data is available.
 */
export default function DeveloperCredit({ className }: { className?: string }) {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const { settings } = usePublicSettings([ABOUT_TEAM_KEY]);
  const team: CmsTeamMember[] = getAboutTeam(settings, []);
  const credits = getCreditMembers(team);
  if (credits.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 sm:flex-row sm:items-start sm:gap-10 pt-1",
        className,
      )}
      aria-label={bn ? "ডেভেলপার ক্রেডিট" : "Developer credits"}
    >
      {credits.map(({ member, kind }) => {
        const facebook = normalizeExternalUrl(member.facebook);
        const site = normalizeExternalUrl(member.website) || (kind === "developer" ? LEGACY_DEVELOPER_SITE : "");
        const role = bn ? member.role?.bn || member.role?.en : member.role?.en || member.role?.bn;
        return (
          <div key={member.id ?? member.name} className="flex flex-col items-center text-center sm:items-start sm:text-left max-w-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
              {bn ? LABEL[kind].bn : LABEL[kind].en}
            </span>
            <span className="mt-0.5 flex items-center gap-2">
              {site ? (
                <a href={site} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-white hover:text-accent-400 transition-colors">
                  {member.name}
                </a>
              ) : (
                <span className="text-sm font-semibold text-white">{member.name}</span>
              )}
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${member.name} — Facebook`}
                  title={`${member.name} on Facebook`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1877f2] text-white shadow-sm transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <FacebookIcon className="h-3.5 w-3.5" />
                </a>
              )}
            </span>
            {role && <span className="text-[11px] leading-snug text-white/70">{role}</span>}
          </div>
        );
      })}
    </div>
  );
}
