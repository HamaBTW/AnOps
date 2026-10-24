import type { Metadata } from "next";
import { container, eyebrow, headingXl, lead, sectionY } from "@/shared/components/marketing/styles";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How AnOps handles personal information on its public website and in its platform.",
};

export default function PrivacyPage() {
  return (
    <div className={`${container} ${sectionY} scroll-reveal`}>
      <p className={eyebrow}>Legal</p>
      <h1 className={`${headingXl} mt-3`}>Privacy policy</h1>
      <p className={`${lead} mt-5 max-w-2xl`}>
        The privacy policy is being finalized. The complete text, including what we collect, why, and how to exercise your
        rights, will be published here before launch.
      </p>
    </div>
  );
}
