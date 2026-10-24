import {
  IconFactory,
  IconMessage,
  IconMonitor,
  IconPackage,
  IconSliders,
  IconSparkles,
  IconTrend,
  IconUsers,
  IconWallet,
} from "@/shared/components/ui/brand-icons";
import type { CategoryId } from "@/shared/config/catalog";

const icons: Record<CategoryId, React.ComponentType<{ size?: number; className?: string }>> = {
  website: IconMonitor,
  sales: IconTrend,
  finance: IconWallet,
  "supply-chain": IconPackage,
  "human-resources": IconUsers,
  marketing: IconMessage,
  services: IconSliders,
  ai: IconSparkles,
  iot: IconFactory,
};

export function CategoryIcon({ id, size = 18, className }: { id: CategoryId; size?: number; className?: string }) {
  const Icon = icons[id];
  return <Icon size={size} className={className} />;
}
