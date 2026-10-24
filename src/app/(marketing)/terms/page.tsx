import type { Metadata } from "next";
import { container, eyebrow, headingXl, lead, sectionY } from "@/shared/components/marketing/styles";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for the AnOps public website and platform.",
};

export default function TermsPage() {
  return (
    <div className={`${container} ${sectionY} scroll-reveal`}>
      <p className={eyebrow}>Legal</p>
      <h1 className={`${headingXl} mt-3`}>Terms of use</h1>
      <p className={`${lead} mt-5 max-w-2xl`}>
        The terms of use are being finalized. The complete text will be published here before launch.
      </p>
    </div>
  );
}
