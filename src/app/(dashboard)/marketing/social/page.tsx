import type { Metadata } from "next";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listSocialPosts } from "@/server/services/social.service";
import { SocialPlanner } from "@/features/marketing/components/social-planner";
import { SocialAccountActions } from "@/features/marketing/components/social-account-actions";

export const metadata: Metadata = { title: "Social Planner | Marketing & Socials | AnOps ERP" };

export default async function SocialPage() {
  const ctx = await resolveWorkspace();
  const posts = await listSocialPosts(ctx);
  return (
    <>
      <SocialAccountActions />
      <SocialPlanner initialPosts={posts} />
    </>
  );
}
