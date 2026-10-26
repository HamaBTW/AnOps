import type { Metadata } from "next";
import { resolveWorkspace } from "@/server/tenancy/workspace";
import { listContacts } from "@/server/services/marketing.service";
import { ContactsWorkspace } from "@/features/marketing/components/contacts-workspace";

export const metadata: Metadata = { title: "Contacts | Marketing & Socials | AnOps ERP" };

export default async function ContactsPage() {
  const ctx = await resolveWorkspace();
  const contacts = await listContacts(ctx, {});
  return <ContactsWorkspace initialData={contacts} />;
}
