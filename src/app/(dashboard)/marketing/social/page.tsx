import type { Metadata } from "next";
import { requireActive } from "@/features/auth/actions/auth.action";
import { listSocialPosts } from "@/server/services/social.service";
import { SocialPlanner } from "@/features/marketing/components/social-planner";
import { SocialAccountActions } from "@/features/marketing/components/social-account-actions";
export const metadata: Metadata = { title: "Social Planner | Marketing & Socials | AnOps ERP" };
export default async function SocialPage() { const session = await requireActive(); return <><SocialAccountActions /><SocialPlanner initialPosts={await listSocialPosts(session.user.email ?? "")} /></>; }
