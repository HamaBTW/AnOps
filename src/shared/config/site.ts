export const siteName = "AnOps";
export const siteTagline = "One platform. Every operation.";
export const siteDescription =
  "An AI-native, modular business platform that connects sales, finance, supply chain, people and marketing in one workspace.";

export const primaryNav = [
  { label: "Apps", href: "/apps" },
  { label: "Industries", href: "/industries" },
  { label: "Pricing", href: "/pricing" },
  { label: "Community", href: "/community-hub" },
  { label: "Help", href: "/help" },
] as const;

export const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Apps", href: "/apps" },
      { label: "AnOps AI", href: "/apps/ai" },
      { label: "Industries", href: "/industries" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "Guides", href: "/docs#guides" },
      { label: "Community", href: "/community-hub" },
      { label: "Help center", href: "/help" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Sign in", href: "/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
] as const;

export type Plan = {
  id: "free" | "standard" | "pro" | "ultra" | "custom";
  name: string;
  price: string;
  priceNote: string;
  audience: string;
  description: string;
  companies: string;
  applications: string;
  features: string[];
  cta: { label: string; href: string };
  highlight?: string;
};

/** Prices are not published yet: never put a number here until billing is defined. */
export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "Free",
    priceNote: "No card required",
    audience: "Try AnOps on one area of your business",
    description: "One company and one application of your choice.",
    companies: "1 company",
    applications: "1 application",
    features: ["One company workspace", "Choose one available application", "Members and roles", "Upgrade at any time"],
    cta: { label: "Create a free account", href: "/register" },
  },
  {
    id: "standard",
    name: "Standard",
    price: "To be announced",
    priceNote: "Pricing published before launch",
    audience: "A single business running on connected apps",
    description: "One company with every application, sharing one set of records.",
    companies: "1 company",
    applications: "All applications",
    features: ["Everything in Free", "All available applications", "AnOps AI Command Center", "Records shared across apps"],
    cta: { label: "Talk to us", href: "/contact" },
    highlight: "Most teams start here",
  },
  {
    id: "pro",
    name: "Pro",
    price: "To be announced",
    priceNote: "Pricing published before launch",
    audience: "Groups and businesses with several entities",
    description: "Several companies with every application and one login.",
    companies: "Multiple companies",
    applications: "All applications",
    features: ["Everything in Standard", "Multiple companies", "Company switcher with isolated data", "Per-company roles"],
    cta: { label: "Talk to us", href: "/contact" },
  },
  {
    id: "ultra",
    name: "Ultra",
    price: "To be announced",
    priceNote: "Pricing published before launch",
    audience: "Teams that want the most from AI",
    description: "Everything in Pro, plus advanced AI capabilities and early access to new AI features.",
    companies: "Multiple companies",
    applications: "All applications",
    features: ["Everything in Pro", "Advanced AI capabilities", "Early access to new AI features"],
    cta: { label: "Talk to us", href: "/contact" },
  },
  {
    id: "custom",
    name: "Custom",
    price: "Custom quote",
    priceNote: "After a conversation",
    audience: "Larger organizations with specific needs",
    description: "A tailored setup for enterprise requirements.",
    companies: "Tailored",
    applications: "Tailored",
    features: ["Tailored companies and applications", "Requirements discussed with our team", "Quoted for your organization"],
    cta: { label: "Contact us", href: "/contact" },
  },
];

export const comparisonRows: { label: string; values: [string, string, string, string, string] }[] = [
  { label: "Companies", values: ["1", "1", "Multiple", "Multiple", "Tailored"] },
  { label: "Applications", values: ["1 of your choice", "All", "All", "All", "Tailored"] },
  { label: "Members and roles", values: ["Included", "Included", "Included", "Included", "Included"] },
  { label: "Records shared across apps", values: ["—", "Included", "Included", "Included", "Included"] },
  { label: "AnOps AI Command Center", values: ["If chosen as your app", "Included", "Included", "Included", "Tailored"] },
  { label: "Advanced AI capabilities", values: ["—", "—", "—", "Included", "Tailored"] },
  { label: "Early access to AI features", values: ["—", "—", "—", "Included", "Tailored"] },
  { label: "Price", values: ["Free", "To be announced", "To be announced", "To be announced", "Quoted"] },
];

export const pricingFaq = [
  {
    question: "Which applications can I choose on the Free plan?",
    answer: "Any application marked Available. CRM and Sales are coming soon and can be chosen once they are released.",
  },
  {
    question: "Why are prices not shown yet?",
    answer: "Paid plan prices and billing terms are still being defined. They will be published on this page before paid plans open. We will not charge you without clear terms.",
  },
  {
    question: "Can I move between plans?",
    answer: "Yes. You can start on Free and move to Standard, Pro or Ultra when you need more applications or companies.",
  },
  {
    question: "What is the difference between Pro and Ultra?",
    answer: "Both include multiple companies and all applications. Ultra adds advanced AI capabilities and early access to new AI features.",
  },
  {
    question: "Is my data separated between companies?",
    answer: "Yes. Each company is an isolated workspace. People only see the companies they are members of, with the role they have there.",
  },
] as const;

export const faqItems = [
  {
    question: "Who is AnOps designed for?",
    answer:
      "Small and medium-sized businesses that need one operational foundation across customers, sales, finance, stock and team workflows.",
  },
  {
    question: "Do we need every app?",
    answer:
      "No. Choose the apps you need. The Free plan includes one company and one application; Standard and above include every application.",
  },
  {
    question: "Can AI change records or send orders on its own?",
    answer:
      "No. AI features are designed to suggest and draft. An authorized person reviews and confirms each action before it takes effect.",
  },
  {
    question: "What happens when an AI feature is unavailable?",
    answer:
      "The workspace is designed to remain usable. You can open the underlying records and continue the work manually.",
  },
  {
    question: "How do we discuss pricing?",
    answer:
      "Prices for Standard, Pro and Ultra will be published before paid plans open. Custom plans are quoted after a conversation about your needs.",
  },
] as const;

export const gettingStarted = [
  { step: "Explore the apps", detail: "Browse the directory and check the status of each application.", href: "/apps" },
  { step: "Compare plans", detail: "See what Free, Standard, Pro, Ultra and Custom include.", href: "/pricing" },
  { step: "Talk to us", detail: "Tell us about your operations and we will discuss the right setup.", href: "/contact" },
] as const;
