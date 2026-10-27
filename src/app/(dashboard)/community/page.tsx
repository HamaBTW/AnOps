import type { Metadata } from "next";
import { getPageWorkspace } from "@/server/tenancy/workspace";
import { getActiveTenant } from "@/server/tenant/context";
import { getCurrentAuthUser } from "@/server/auth/rbac";
import {
  seedCommunityDefaultsForCompany,
  getBlogPosts,
  getCategories,
  getForumTopics,
  getChatConversations,
  getCommunityDashboardStats,
} from "@/server/services/community.service";
import { CommunityDashboardClient } from "@/features/community/components/community-dashboard-client";

export const metadata: Metadata = {
  title: "Blogs, Forum & Live Chat | AnOps ERP",
  description:
    "Knowledge Base Blog Publishing, Community Forum, Real-Time Live Support Chat & AI Summarizer Bot.",
};

export default async function CommunityPage() {
  // 1. Resolve active company workspace (redirects to login or onboarding if needed)
  const workspace = await getPageWorkspace();
  const activeCompanyId = workspace.companyId.toHexString();

  // 2. Ensure initial seed defaults exist for this company
  await seedCommunityDefaultsForCompany(activeCompanyId);

  // 3. Resolve user identity and role within company
  const authUser = await getCurrentAuthUser();
  const userRole = authUser?.isAdmin ? "hr_admin" : (authUser?.role ?? "employee");
  const authorName = authUser?.employee?.fullName || authUser?.email || "Fatma";

  // 4. Fetch all community domain entities in parallel (strictly scoped to active company)
  const [posts, categories, topics, conversations, stats] =
    await Promise.all([
      getBlogPosts(activeCompanyId),
      getCategories(activeCompanyId),
      getForumTopics(activeCompanyId),
      getChatConversations(activeCompanyId),
      getCommunityDashboardStats(activeCompanyId),
    ]);

  const tenant = await getActiveTenant();
  const companyName = tenant?.company?.name || "AnOps";

  return (
    <CommunityDashboardClient
      initialPosts={posts}
      initialCategories={categories}
      initialTopics={topics}
      initialConversations={conversations}
      initialStats={stats}
      currentUserId={authUser?.userId}
      currentUserName={authorName}
      userRole={userRole}
      companyName={companyName}
    />
  );
}
