export const RAIL_KEY = "gentelella:sidebar-rail";

export function readSidebarRail(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSidebarRail(collapsed: boolean) {
  try {
    localStorage.setItem(RAIL_KEY, collapsed ? "1" : "0");
  } catch {
    /* private mode */
  }
}
