import type { Metadata } from "next";
import { requireActive } from "@/features/auth/actions/auth.action";
import { listAIGenerations } from "@/server/services/ai-copy.service";
import { AICopywriter } from "@/features/marketing/components/ai-copywriter";
export const metadata: Metadata = { title: "AI Copywriter | Marketing & Socials | AnOps ERP" };
export default async function AICopywriterPage() { const session = await requireActive(); return <AICopywriter history={await listAIGenerations(session.user.email ?? "") as Array<{ _id: string; status: string; safeError?: string }>} />; }
