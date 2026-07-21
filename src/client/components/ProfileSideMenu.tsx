import { useLocale } from "../locale";
import { useLocation, useNavigate } from "react-router-dom";
import {
  defaultAnchorForMenuGroup,
  isProfileMenuGroupExpanded,
  pathForProfileSection,
  PROFILE_MENU_GROUPS,
  PROFILE_PATH,
  profileSectionFromPath,
} from "../lib/profileMenu";

type ProfileSideMenuProps = {
  activeAnchor: string;
  /** When on `/profile`, scroll to an in-page anchor; otherwise unused. */
  onScrollToAnchor?: (id: string) => void;
};

/**
 * Accordion left nav for the account area: top-level items are routes;
 * profile children stay hash anchors on `/profile`.
 */
export function ProfileSideMenu({
  activeAnchor,
  onScrollToAnchor,
}: ProfileSideMenuProps) {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const section = profileSectionFromPath(pathname);

  function openProfileAnchor(id: string) {
    if (profileSectionFromPath(pathname) === "profile" && onScrollToAnchor) {
      onScrollToAnchor(id);
      return;
    }
    navigate(`${PROFILE_PATH}#${id}`);
  }

  return (
    <nav className="profile-page__menu" aria-label={t.profileMenuLabel}>
      {PROFILE_MENU_GROUPS.map((group) => {
        const expanded = isProfileMenuGroupExpanded(group.section, section);
        const hasChildren = group.children.length > 0;
        const label = t[group.labelKey] as string;
        const subId = `profile-menu-sub-${group.section}`;
        const parentActive = expanded && !hasChildren;
        const groupActive = expanded && hasChildren;

        return (
          <div
            key={group.section}
            className={`profile-page__menu-group${expanded ? " is-expanded" : ""}`}
          >
            <button
              type="button"
              className={`profile-page__menu-item profile-page__menu-item--parent${
                parentActive ? " is-active" : ""
              }${groupActive ? " is-group-active" : ""}`}
              aria-expanded={hasChildren ? expanded : undefined}
              aria-controls={hasChildren ? subId : undefined}
              aria-current={parentActive ? "page" : undefined}
              onClick={() => {
                if (group.section === "profile") {
                  const anchor = defaultAnchorForMenuGroup(group);
                  if (anchor) openProfileAnchor(anchor);
                  else navigate(pathForProfileSection("profile"));
                  return;
                }
                navigate(pathForProfileSection(group.section));
              }}
            >
              {label}
            </button>
            {hasChildren ? (
              <div
                id={subId}
                className="profile-page__menu-sub"
                role="group"
                aria-label={label}
                aria-hidden={!expanded}
              >
                <div className="profile-page__menu-sub-inner">
                  {group.children.map((child) => {
                    const childActive = expanded && activeAnchor === child.id;
                    return (
                      <button
                        key={child.id}
                        type="button"
                        className={`profile-page__menu-item profile-page__menu-item--sub${
                          childActive ? " is-active" : ""
                        }`}
                        aria-current={childActive ? "location" : undefined}
                        tabIndex={expanded ? undefined : -1}
                        onClick={() => openProfileAnchor(child.id)}
                      >
                        {t[child.labelKey] as string}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
