import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectDetailClient from "./ProjectDetailClient";
import { fetchPublicSettings } from "@/lib/serverSettings";
import { getShowcaseProject } from "@/lib/showcaseContent";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/tokens";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const settings = await fetchPublicSettings();
  const project = getShowcaseProject(settings, params.slug);
  if (!project) {
    return { title: "Project Not Found | ABO Enterprise" };
  }

  const title = `${project.title.en} | ABO Enterprise Portfolio`;
  const description = project.result.en || project.solution.en || project.problem.en;
  const url = `${SITE_URL}/projects/${project.slug}`;
  const ogImg = project.image || DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: ogImg ? [{ url: ogImg, alt: project.title.en, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImg ? [ogImg] : [],
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const settings = await fetchPublicSettings();
  const project = getShowcaseProject(settings, params.slug);

  if (!project) {
    notFound();
  }

  return <ProjectDetailClient project={project} />;
}
