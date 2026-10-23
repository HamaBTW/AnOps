import styles from "./sidebar.module.css";
import { Sidebar as SidebarComponent } from "./sidebar";

export function Sidebar() {
  return (
    <div className={styles.sidebarRoot}>
      <SidebarComponent />
    </div>
  );
}
