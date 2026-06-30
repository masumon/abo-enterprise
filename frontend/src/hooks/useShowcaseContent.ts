import { usePublicSettings } from "@/hooks/usePublicSettings";
import {
  getShowcaseProjects,
  getShowcaseProject,
  getSoftwareServiceCards,
  SHOWCASE_PROJECTS_KEY,
  SOFTWARE_SERVICE_CARDS_KEY,
} from "@/lib/showcaseContent";

export function useShowcaseContent() {
  const { settings, loading } = usePublicSettings([SHOWCASE_PROJECTS_KEY, SOFTWARE_SERVICE_CARDS_KEY]);
  return {
    projects: getShowcaseProjects(settings),
    serviceCards: getSoftwareServiceCards(settings),
    loading,
    settings,
  };
}

export function useShowcaseProject(slug: string) {
  const { settings, loading } = usePublicSettings([SHOWCASE_PROJECTS_KEY]);
  return {
    project: getShowcaseProject(settings, slug),
    loading,
  };
}
