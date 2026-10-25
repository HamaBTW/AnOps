import type { Metadata } from "next";
import { requireActive } from "@/features/auth/actions/auth.action";
import { listContacts, marketingScopeForUser } from "@/server/services/marketing.service";
import { ContactsWorkspace } from "@/features/marketing/components/contacts-workspace";

export const metadata: Metadata = { title: "Contacts | Marketing & Socials | AnOps ERP" };

export default async function ContactsPage() {
  const session = await requireActive();
  const contacts = await listContacts(await marketingScopeForUser(session.user.email ?? ""), {});
  return <ContactsWorkspace initialData={contacts} />;
}
