import Breadcrumb from "@/components/ui/Breadcrumb";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeroProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  variant?: "brand" | "light";
  children?: React.ReactNode;
}

export default function PageHero({
  title,
  subtitle,
  breadcrumbs,
  variant = "brand",
  children,
}: PageHeroProps) {
  const isBrand = variant === "brand";

  return (
    <section
      className={
        isBrand
          ? "gradient-brand text-white py-14 md:py-20 px-4 relative overflow-hidden -mt-[var(--navbar-offset)] pt-[calc(var(--navbar-offset)+3.5rem)]"
          : "page-surface border-b border-gray-100 dark:border-white/10 py-12 md:py-16 px-4 -mt-[var(--navbar-offset)] pt-[calc(var(--navbar-offset)+3rem)]"
      }
    >
      {isBrand && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-accent-500/10 rounded-full blur-3xl" />
        </div>
      )}
      <div className="container mx-auto max-w-5xl relative z-10">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb
            items={breadcrumbs}
            className={isBrand ? "text-white/70 [&_a]:text-white/80 [&_a:hover]:text-white" : undefined}
          />
        )}
        <h1 className={cn("text-3xl sm:text-4xl md:text-5xl font-bold mb-3 text-balance", !isBrand && "text-heading")}>
          {title}
        </h1>
        {subtitle && (
          <p className={cn("text-base md:text-lg max-w-2xl leading-relaxed", isBrand ? "text-white/80" : "text-muted")}>
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
