import type { Metadata } from "next";

import {
  generatePublicShowcaseMetadata,
  PublicShowcasePageContent,
} from "../_showcase-page";

type PublicLivePageProps = {
  params: Promise<{ handle: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: PublicLivePageProps): Promise<Metadata> {
  return generatePublicShowcaseMetadata(await params);
}

export default async function PublicLivePage({ params }: PublicLivePageProps) {
  return <PublicShowcasePageContent {...(await params)} />;
}
