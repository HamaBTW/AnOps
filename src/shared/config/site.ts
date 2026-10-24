export const siteName = "AnOps";
export const siteTagline = "One platform. Every operation.";
export const siteDescription =
  "An AI-native, modular business platform that connects sales, finance, supply chain, people and marketing in one workspace.";

export const primaryNav = [
  { label: "Apps", href: "/apps" },
  { label: "Industries", href: "/industries" },
  { label: "Pricing", href: "/pricing" },
  { label: "Community", href: "/community" },
  { label: "Help", href: "/help" },
] as const;

export const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Apps", href: "/apps" },
      { label: "Industries", href: "/industries" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Community", href: "/community" },
      { label: "Help center", href: "/help" },
      { label: "Getting started", href: "/help#getting-started" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
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

export const industries = [
  {
    slug: "manufacturing",
    name: "Manufacturing",
    summary: "Keep production, stock and purchasing aligned so orders are not delayed by missing parts.",
    challenges: [
      "Stock shortages delay production orders",
      "Purchase and production plans drift apart",
      "Production costs are hard to trace back to orders",
    ],
    apps: ["manufacturing", "inventory", "purchase", "stock-forecast-reorder"],
  },
  {
    slug: "distribution-retail",
    name: "Distribution & Retail",
    summary: "Give every location one view of stock, orders and invoices.",
    challenges: [
      "Stock levels differ between locations",
      "Orders and invoices are entered twice",
      "Reorders happen after shelves are already empty",
    ],
    apps: ["sales", "inventory", "invoicing", "stock-forecast-reorder"],
  },
  {
    slug: "professional-services",
    name: "Professional Services",
    summary: "Connect project time, client work and billing so nothing is lost between teams.",
    challenges: [
      "Project time and billing are disconnected",
      "Client requests get lost between teams",
      "Expense reimbursement takes weeks",
    ],
    apps: ["projects", "tasks", "invoicing", "expenses"],
  },
  {
    slug: "marketing-agencies",
    name: "Marketing & Agencies",
    summary: "Run campaigns, approvals and lead follow-up from one connected workspace.",
    challenges: [
      "Campaigns run across separate tools",
      "Copy and approvals slow down launches",
      "Lead follow-up is inconsistent",
    ],
    apps: ["campaign-management", "email-marketing", "marketing-copywriter", "crm"],
  },
] as const;

export const plans = [
  {
    name: "One App",
    price: "Free",
    priceNote: "No cost to start",
    description: "Start with one eligible application and see how AnOps fits your work.",
    features: ["Access to one eligible application", "Upgrade to Standard at any time"],
    cta: { label: "Contact us", href: "/contact" },
    highlight: false,
  },
  {
    name: "Standard",
    price: "Pricing to be announced",
    priceNote: "All applications",
    description: "The integrated application ecosystem, with every app in one workspace.",
    features: ["Access to all applications", "Integrated application ecosystem", "Shared records across apps"],
    cta: { label: "Contact us", href: "/contact" },
    highlight: true,
  },
  {
    name: "Custom",
    price: "Contact us",
    priceNote: "Quoted after a conversation",
    description: "For organizations that need multi-company setups and advanced AI features.",
    features: ["All applications", "Multi-company capabilities", "Advanced AI features (planned)"],
    cta: { label: "Contact us", href: "/contact" },
    highlight: false,
  },
] as const;

export const comparisonRows = [
  { label: "Applications", values: ["One eligible app", "All apps", "All apps"] },
  { label: "Integrated ecosystem", values: ["—", "Included", "Included"] },
  { label: "Multi-company", values: ["—", "—", "Included"] },
  { label: "AI features", values: ["—", "Details to be announced", "Advanced AI (planned)"] },
  { label: "Pricing", values: ["Free", "To be announced", "Quoted on request"] },
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
      "No. Choose the apps you need. The Free plan includes one eligible application, and Standard gives access to all apps.",
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
      "Contact us. Standard pricing is to be announced, and Custom plans are quoted after a conversation about your needs.",
  },
] as const;

export const gettingStarted = [
  { step: "Explore the apps", detail: "Browse the directory and check the status of each application.", href: "/apps" },
  { step: "Compare plans", detail: "See what the One App, Standard and Custom plans include.", href: "/pricing" },
  { step: "Talk to us", detail: "Tell us about your operations and we will discuss the right setup.", href: "/contact" },
] as const;
