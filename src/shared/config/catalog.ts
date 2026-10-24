export type AppStatus = "in-progress" | "coming-soon" | "available";

export const statusMeta: Record<AppStatus, { abbr: string; label: string }> = {
  "in-progress": { abbr: "InP", label: "In Progress" },
  "coming-soon": { abbr: "CS", label: "Coming Soon" },
  available: { abbr: "Available", label: "Available" },
};

export type CategoryId =
  | "website"
  | "sales"
  | "finance"
  | "supply-chain"
  | "human-resources"
  | "marketing"
  | "services"
  | "ai"
  | "iot";

export type Category = { id: CategoryId; label: string; description: string };

export const categories: Category[] = [
  { id: "website", label: "Website", description: "Publish pages and content that stay connected to your business data." },
  { id: "sales", label: "Sales", description: "Manage customer relationships, quotations and orders." },
  { id: "finance", label: "Finance", description: "Accounting, invoicing and expenses on the same records." },
  { id: "supply-chain", label: "Supply Chain", description: "Stock, production and purchasing that work from one view." },
  { id: "human-resources", label: "Human Resources", description: "People, pay, leave and attendance in one place." },
  { id: "marketing", label: "Marketing", description: "Automation, campaigns and channel planning." },
  { id: "services", label: "Services & Productivity", description: "Projects, tasks, documents and approval workflows." },
  { id: "ai", label: "AI", description: "Assistants that suggest and draft. People review and approve." },
  { id: "iot", label: "IoT", description: "Equipment and sensor data for operational visibility." },
];

export type App = {
  slug: string;
  name: string;
  category: CategoryId;
  status: AppStatus;
  summary: string;
  highlights: string[];
  connectsWith: string[];
};

export const apps: App[] = [
  {
    slug: "website",
    name: "Website",
    category: "website",
    status: "coming-soon",
    summary: "Publish pages and content that share data with your other apps.",
    highlights: ["Pages, menus and content editing", "Forms that feed the CRM", "One data model across site and back office"],
    connectsWith: ["crm", "sales", "content-summarizer-chatbot"],
  },
  {
    slug: "crm",
    name: "CRM",
    category: "sales",
    status: "in-progress",
    summary: "Track contacts, companies and opportunities from first conversation.",
    highlights: ["Contacts and companies", "Opportunity pipeline", "Activity history per customer"],
    connectsWith: ["sales", "website", "marketing-automation"],
  },
  {
    slug: "sales",
    name: "Sales",
    category: "sales",
    status: "in-progress",
    summary: "Turn quotations into confirmed orders and follow fulfillment.",
    highlights: ["Quotations", "Sales orders", "Order status across teams"],
    connectsWith: ["crm", "invoicing", "inventory"],
  },
  {
    slug: "accounting",
    name: "Accounting",
    category: "finance",
    status: "in-progress",
    summary: "Keep ledgers, reconciliations and financial reports in one place.",
    highlights: ["Chart of accounts", "Bank reconciliation", "Financial reports"],
    connectsWith: ["invoicing", "expenses", "purchase"],
  },
  {
    slug: "invoicing",
    name: "Invoicing",
    category: "finance",
    status: "in-progress",
    summary: "Issue invoices from confirmed orders and follow payments.",
    highlights: ["Customer invoices", "Payment tracking", "Recurring invoices"],
    connectsWith: ["sales", "accounting"],
  },
  {
    slug: "expenses",
    name: "Expenses",
    category: "finance",
    status: "in-progress",
    summary: "Capture, approve and reimburse employee expenses.",
    highlights: ["Expense reports", "Receipt capture", "Approval workflow"],
    connectsWith: ["accounting", "employees", "receipt-ocr"],
  },
  {
    slug: "inventory",
    name: "Inventory",
    category: "supply-chain",
    status: "in-progress",
    summary: "Track stock locations, movements and reorder points.",
    highlights: ["Stock by location", "Stock moves and adjustments", "Reorder rules"],
    connectsWith: ["sales", "purchase", "manufacturing", "stock-forecast-reorder"],
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    category: "supply-chain",
    status: "in-progress",
    summary: "Plan bills of materials, work orders and production runs.",
    highlights: ["Bills of materials", "Work orders", "Production planning"],
    connectsWith: ["inventory", "purchase", "iot"],
  },
  {
    slug: "purchase",
    name: "Purchase",
    category: "supply-chain",
    status: "in-progress",
    summary: "Request, approve and receive supplier orders.",
    highlights: ["Requests for quotation", "Purchase orders", "Goods receipts"],
    connectsWith: ["inventory", "accounting", "stock-forecast-reorder"],
  },
  {
    slug: "employees",
    name: "Employees",
    category: "human-resources",
    status: "in-progress",
    summary: "Maintain employee records, contracts, departments and roles.",
    highlights: ["Employee profiles", "Contracts", "Departments and roles"],
    connectsWith: ["payroll", "time-off", "attendance", "hr-policy-assistant"],
  },
  {
    slug: "payroll",
    name: "Payroll",
    category: "human-resources",
    status: "in-progress",
    summary: "Prepare payslips from attendance, leave and contract rules.",
    highlights: ["Payslips", "Pay runs", "Contract-based rules"],
    connectsWith: ["employees", "attendance", "time-off", "accounting"],
  },
  {
    slug: "time-off",
    name: "Time Off",
    category: "human-resources",
    status: "in-progress",
    summary: "Request, approve and balance leave across teams.",
    highlights: ["Leave requests", "Approvals", "Leave balances"],
    connectsWith: ["employees", "payroll", "hr-policy-assistant"],
  },
  {
    slug: "attendance",
    name: "Attendance",
    category: "human-resources",
    status: "in-progress",
    summary: "Record working hours, check-ins and schedules.",
    highlights: ["Check-in and check-out", "Work schedules", "Attendance reports"],
    connectsWith: ["employees", "payroll"],
  },
  {
    slug: "marketing-automation",
    name: "Marketing Automation",
    category: "marketing",
    status: "in-progress",
    summary: "Design customer journeys triggered by behavior and data.",
    highlights: ["Journey builder", "Triggers and conditions", "Lead nurturing"],
    connectsWith: ["crm", "email-marketing", "sms-marketing"],
  },
  {
    slug: "email-marketing",
    name: "Email Marketing",
    category: "marketing",
    status: "in-progress",
    summary: "Plan, send and measure email campaigns.",
    highlights: ["Email templates", "Audience segments", "Campaign reports"],
    connectsWith: ["marketing-automation", "campaign-management", "marketing-copywriter"],
  },
  {
    slug: "sms-marketing",
    name: "SMS Marketing",
    category: "marketing",
    status: "in-progress",
    summary: "Reach customers with text message campaigns.",
    highlights: ["SMS campaigns", "Opt-out management", "Delivery reports"],
    connectsWith: ["marketing-automation", "campaign-management"],
  },
  {
    slug: "campaign-management",
    name: "Campaign Management",
    category: "marketing",
    status: "in-progress",
    summary: "Coordinate campaigns across channels and teams.",
    highlights: ["Campaign calendar", "Channel planning", "Performance overview"],
    connectsWith: ["email-marketing", "sms-marketing", "social-planning"],
  },
  {
    slug: "social-planning",
    name: "Social Planning",
    category: "marketing",
    status: "in-progress",
    summary: "Plan and schedule social posts alongside other campaigns.",
    highlights: ["Post calendar", "Approval steps", "Channel overview"],
    connectsWith: ["campaign-management", "marketing-copywriter"],
  },
  {
    slug: "projects",
    name: "Projects",
    category: "services",
    status: "in-progress",
    summary: "Organize work into projects with milestones and owners.",
    highlights: ["Project boards", "Milestones", "Owners and status"],
    connectsWith: ["tasks", "documents", "workflows"],
  },
  {
    slug: "tasks",
    name: "Tasks",
    category: "services",
    status: "in-progress",
    summary: "Assign and track tasks linked to projects and records.",
    highlights: ["Task lists", "Due dates", "Reminders"],
    connectsWith: ["projects", "workflows"],
  },
  {
    slug: "documents",
    name: "Documents",
    category: "services",
    status: "in-progress",
    summary: "Store and share files linked to records and projects.",
    highlights: ["Shared folders", "Version history", "Links to records"],
    connectsWith: ["projects", "hr-policy-assistant", "expenses"],
  },
  {
    slug: "workflows",
    name: "Workflows",
    category: "services",
    status: "in-progress",
    summary: "Automate approvals and handoffs between apps.",
    highlights: ["Approval steps", "Stage handoffs", "Notifications"],
    connectsWith: ["tasks", "projects", "purchase", "expenses"],
  },
  {
    slug: "business-assistant",
    name: "Business Assistant",
    category: "ai",
    status: "in-progress",
    summary: "Ask questions about your operations and review suggested next steps.",
    highlights: ["Natural-language questions", "Suggested actions for review", "Role-aware data access"],
    connectsWith: ["inventory", "sales", "crm"],
  },
  {
    slug: "stock-forecast-reorder",
    name: "Stock Forecast & Reorder",
    category: "ai",
    status: "in-progress",
    summary: "Analyze stock levels, forecast shortages and draft recommended purchase orders.",
    highlights: ["Shortage forecasts", "Draft purchase orders", "Review before approval"],
    connectsWith: ["inventory", "purchase"],
  },
  {
    slug: "receipt-ocr",
    name: "Receipt OCR",
    category: "ai",
    status: "in-progress",
    summary: "Extract vendor, date and total from uploaded receipts to help populate expense records.",
    highlights: ["Vendor, date and total extraction", "Draft expense records", "Review before saving"],
    connectsWith: ["expenses", "accounting"],
  },
  {
    slug: "hr-policy-assistant",
    name: "HR Policy Assistant",
    category: "ai",
    status: "in-progress",
    summary: "Answer employee questions using company policies and authorized employee information.",
    highlights: ["Policy answers with sources", "Role-based information access", "Escalation to HR"],
    connectsWith: ["employees", "time-off", "documents"],
  },
  {
    slug: "marketing-copywriter",
    name: "Marketing Copywriter",
    category: "ai",
    status: "in-progress",
    summary: "Generate marketing copy from product descriptions, audiences and channels.",
    highlights: ["Copy drafts per channel", "Audience-aware tone", "Editor review"],
    connectsWith: ["email-marketing", "social-planning"],
  },
  {
    slug: "content-summarizer-chatbot",
    name: "Content Summarizer & Chatbot",
    category: "ai",
    status: "in-progress",
    summary: "Summarize blog articles and suggest answers to common live-chat questions.",
    highlights: ["Article summaries", "Suggested chat replies", "Agent review before sending"],
    connectsWith: ["website", "crm"],
  },
  {
    slug: "iot",
    name: "IoT",
    category: "iot",
    status: "coming-soon",
    summary: "Connect equipment and sensor data to operational views.",
    highlights: ["Device connections", "Sensor dashboards", "Operational alerts"],
    connectsWith: ["manufacturing", "inventory"],
  },
];

export type AiUseCase = { area: string; appSlug: string; description: string; benefit: string };

export const aiUseCases: AiUseCase[] = [
  {
    area: "Inventory",
    appSlug: "stock-forecast-reorder",
    description: "Analyze stock levels, forecast shortages, and draft recommended purchase orders.",
    benefit: "Spot shortages earlier and start purchasing from numbers, not memory.",
  },
  {
    area: "Finance",
    appSlug: "receipt-ocr",
    description: "Extract vendor, date, and total from uploaded receipts to help populate expense records.",
    benefit: "Less manual typing when expense records are created.",
  },
  {
    area: "HR",
    appSlug: "hr-policy-assistant",
    description: "Answer employee questions using company policies and authorized employee information.",
    benefit: "Employees get consistent policy answers, and HR handles fewer repeat questions.",
  },
  {
    area: "Marketing",
    appSlug: "marketing-copywriter",
    description: "Generate marketing copy based on product descriptions, audiences, and communication channels.",
    benefit: "Faster first drafts for each channel, reviewed by your team before publishing.",
  },
  {
    area: "Community",
    appSlug: "content-summarizer-chatbot",
    description: "Summarize blog articles and/or suggest answers to common live-chat questions.",
    benefit: "Faster support replies and quicker access to article content.",
  },
];

export function getApp(slug: string): App | undefined {
  return apps.find((app) => app.slug === slug);
}

export function getCategory(id: CategoryId): Category {
  return categories.find((category) => category.id === id) as Category;
}

export function appsInCategory(id: CategoryId): App[] {
  return apps.filter((app) => app.category === id);
}
