# Оцінка відповідності Squad Me redesign → Gentelella v4

**Дата:** 2026-07-23  
**Гілка:** `experiment/gentelella-redesign`  
**Reference:** `.agents/tmp/gentelella-ref` (Gentelella v4 production HTML)  
**План redesign:** [gentelella-redesign-plan.md](./gentelella-redesign-plan.md)

---

## Як користуватись цим документом

Повний аналіз нижче — для контексту. Для покрокової реакції використовуйте **§9 «Чеклист наступних кроків»**: відмічайте `- [x]` після кожного прийнятого рішення або виконаного фіксу.

---

## Загальна оцінка

**7 / 10** — технічно це вже Gentelella «знизу вгору» (імпортований `gentelella.css`, правильні класи shell/cards/forms); shell unify-хвиля закрила teal ghost, semantic topbar, GuestChrome, sidebar footer ближче до template. **Profile IA й custom widgets лишаються продуктовими**, не 1:1 reference HTML.

---

## 1. Загальний вердикт

Redesign успішно переносить **дизайн-систему Gentelella v4** (токени, sidebar/topbar, `.card`, `.table`, `.btn`, `.modal`, `.auth-card`). Це не reskin старих `profile-page__*` класів — старий `PublicChrome` / `PublicAtmosphere` прибрані, `styles.css` лише бренд-шар поверх шаблону.

Але ціль «layout leads, not old component tree» з `gentelella-redesign-plan.md` виконана **частково**: shell і примітиви — так; **Profile, auth-контент, Home — гібрид** між Gentelella markup і попередньою Squad Me IA.

---

## 2. Оцінка по областях

| Область | Бали | Коротка нота |
|--------|------|--------------|
| **Shell (sidebar / topbar / main)** | **7.5/10** | DOM і розміри (252px sidebar, 56px topbar, `.main` / `.page-wrapper`) збігаються з `_layout.scss` + `shell-render.js`. Topbar = semantic `h1` only (свідоме відхилення); theme/lang на Profile identity, не в topbar. |
| **Rail / collapse** | **7.5/10** | `body.sidebar-rail`, 64px, mobile drawer — як у шаблону. Squad Me вимикає CSS `::after` tooltips (`styles.css`) на користь `title` — менш «Gentelella-native». |
| **Footer tools vs template** | **7/10** | Sidebar footer ближче до Gentelella: `sidebar-user` + logout у одному рядку (без `.sidebar-footer-tools`). Lang/theme — у Profile aside identity (`profile-aside-prefs`), не в topbar. |
| **Typography / color / spacing** | **8/10** | Inter, `--font-size: 0.875rem`, spacing/radius/shadow — з `_tokens.scss`. Свідомий swap teal → orange у `styles.css`. |
| **Cards (x_panel → `.card`)** | **8/10** | `Card`, `ProfileContentSection`, profile cards — нативні `.card-header` / `.card-body`. Match cards — кастомні модифікатори поверх Gentelella card. |
| **Tables** | **8.5/10** | `DataTable` → `.table-responsive` + `.table` — близько до `tables.html` / `contacts.html`. |
| **Forms** | **6/10** | Базові `.form-group` / `.form-control` — так. Membership toggles, DateField, channel UI — власні патерни поверх Gentelella form primitives. |
| **Buttons** | **8/10** | `.btn-primary`, `.btn-outline`, `.btn-ghost`, `.btn-danger`, `.btn-block` — з шаблону. |
| **Badges** | **7/10** | Gentelella має `.badge-red/teal/blue`; Squad Me — семантичні `.badge-accent/neutral/...` у `styles.css` (логічно, але не 1:1). |
| **Modals** | **8/10** | `AppDialog` на `.modal-backdrop` / `.modal-dialog` + focus trap — відповідає Gentelella overlays. |
| **Auth vs `login.html`** | **6/10** | Оболонка `.auth-page` / `.auth-card` — так. Контент спрощений (немає `input-group`, remember me, OAuth, `auth-divider`). |
| **Profile layout (two-column aside)** | **4/10** | **Не template-native** — див. §6. |
| **Custom widgets (hybrid risk)** | **5/10** | Працюють на Gentelella tokens, але DOM/поведінка — Squad Me. |
| **Light / dark theme** | **8/10** | `html[data-theme]` як у Gentelella; preference light/dark/**system** (`ThemeSwitch` cycle). Controls: Profile aside + GuestChrome (не topbar). |
| **Home / guest chrome** | **3/10** | Власний `.home` hero, не `landing.html` і не Gentelella auth chrome. |

---

## 3. Top divergences (ранжовано)

1. **Profile IA: `ProfileAside` + scroll-spy якірна навігація**
   - Reference: `production/profile.html` — `row col-4-8`: зліва summary (avatar + completion ring), справа одна форма; notifications — `.toggle.on` switches; security — окрема card з таблицею sessions.
   - Squad Me: `row col-8-4 profile-page-layout` — зліва **вертикальний стек** секцій (`ProfileContentSection`), справа sticky aside з anchor nav + security actions (`ProfileAside.tsx`, `styles.css` `.profile-aside-*`).
   - **Це продуктове рішення**, не з Gentelella profile page (хоча `.agents/tmp/gentelella-template-map.md` помилково каже «stacked cards»).

2. **Topbar без «другої половини» Gentelella** *(свідоме відхилення — active wave)*
   - Reference `renderTopbar()`: search-box (⌘K), docs, theme, notifications, messages, avatar.
   - `AccountShell.tsx`: toggle + semantic `h1` у `.breadcrumb .current` — без `topbar-right`. Theme/lang → Profile identity prefs; logout → sidebar footer.

3. **Sidebar footer vs topbar user menu** *(частково закрито)*
   - Було: `.sidebar-footer-tools` (lang/theme/logout) — продуктове винаходження.
   - Зараз: `SidebarFooter` = profile link + logout (ближче до Gentelella); lang/theme у `ProfileAsideIdentity` / `GuestUtilities`.

4. **Auth content vs `login.html`**
   - Немає `.input-group` + SVG icons, `.auth-actions` (remember me), `.auth-divider`, social login grid.
   - Замість цього: phone-based форма, `HintPanel` всередині card, `.auth-utilities` з lang/theme (`AuthLayout.tsx`, `LoginPage.tsx`).

5. ~~**Membership / disciplines collapsible blocks**~~ **Fixed**
   - `CollapsibleToggleBlock`: Gentelella `.toggle-row` + `.toggle` switch; nested body when on.

6. ~~**`DateField` calendar popover**~~ **Fixed (markup polish)**
   - `.input-affix` + SVG calendar button; portal popover on `--shadow-card` / radius tokens (still custom grid, not a template widget).

7. ~~**`NotificationChannelsForm`**~~ **Icons fixed**
   - Channel status — chrome stroke SVG (`ChannelConnectedIcon` / `ChannelDisconnectedIcon`); connect buttons + expand panels still product hybrid.

8. **`ProfileSectionHeader` — PNG edit/cancel**
   - Використовує `.card-opt-btn`, але з `/icon-edit.png` / `/icon-cancel.png` замість inline SVG як у Gentelella card headers.

9. **`SectionHeader` vs Gentelella `page-header`**
   - `SectionHeader.tsx`: title перед pretitle/description; Gentelella — `page-pretitle` **над** `page-title`. Profile взагалі без `page-header`.

10. **Home page**
    - `HomePage.tsx` — custom `.home-topbar` + hero; не `landing.html` spirit з plan, не Gentelella public chrome.

11. ~~**Auth background gradient still teal-tinted**~~ **Fixed**
    - Brand layer `.auth-page` у `styles.css` — Pumpkin + Blue Energy radials; teal з `gentelella.css` перекритий.

12. **Rail tooltips disabled**
    - `styles.css`: `content: none !important` для `::after` labels у rail — свідомий відхід (overflow clip); native `title` замість.

---

## 4. Що genuinely близько до Gentelella

- **Повний CSS шаблону** — `styles.css` → `@import "./gentelella.css"` (≈4900 рядків, збіг з `.agents/tmp/gentelella-core.css`).
- **Shell geometry** — fixed sidebar, translucent topbar, `.main` offset, mobile backdrop, `sidebar-rail` at 769px+ (`AccountShell.tsx`, `gentelella.css`).
- **Класова номенклатура** — `.sidebar-brand`, `.nav-link`, `.sidebar-user`, `.card`, `.form-control`, `.banner`, `.modal-*` без старих BEM-панелей.
- **Matches / Linked Shooters** — `row col-3`, `.card`, `.table`, `SectionHeader` → найближчі до `index.html` / `tables.html` / `contacts.html`.
- **HintPanel** — мапиться на `.banner.onboarding-banner` (Gentelella banner pattern).
- **Theme mechanism** — `html[data-theme]`, `initTheme()` / `useTheme.ts`, dark tokens у `gentelella.css`.
- **Видалення legacy public shell** — `PublicChrome`, `PublicAtmosphere` deleted; немає старого hex-atmosphere в client.

---

## 5. Що залишилось old / hybrid

| Шар | Стан |
|-----|------|
| **CSS foundation** | Gentelella-native |
| **Shell structure** | Gentelella-native, спрощений topbar |
| **Profile IA** | **Old Squad Me** (scroll-spy, aside nav, security in sidebar column) у Gentelella cards |
| **Profile forms** | Hybrid — Gentelella inputs + custom membership/channel/date UX |
| **Auth flows** | Hybrid — Gentelella card + Squad Me OTP/Turnstile/wizard steps |
| **Home** | Old brand-first hero, не Gentelella |
| **Icons** | Chrome stroke SVG (nav, theme, edit/cancel, channel status); brand/PWA rasters in `public/` |

---

## 6. Profile two-column aside — template-native чи ні?

**Продуктове винаходження**, не з Gentelella `profile.html`.

Gentelella profile:

- Ліва колонка (4): identity card + completion ring.
- Права (8): editable form fields.
- Нижче: `col-2` notifications (toggle switches) + sessions table.

Squad Me:

- Ліва (8): stacked editable sections (details → divisions → notifications).
- Права (4): **anchor navigation** + окрема security card (change phone/password/delete).

Grid class `col-8-4` існує в Gentelella CSS, але **семантика колонок інвертована** відносно reference profile page (`col-4-8`). Aside nav стилізований як `.card` + `.profile-aside-link.active` з `primary-lt` — візуально «Gentelella-ish», але патерн навігації — з попереднього Squad Me profile UX.

---

## 7. Light / dark theme fidelity

**Механізм — високий.** `[data-theme=dark/light]` на `<html>`, повний набір dark surface tokens у `gentelella.css`, meta `theme-color` sync.

**Розміщення controls — відхилення.** Gentelella: `.tb-btn.theme-toggle` у topbar. Squad Me: `ThemeSwitch` у Profile aside prefs / `GuestUtilities` (auth + home).

**Default:** preference = system; `initTheme()` ставить `data-theme` light/dark з localStorage або `prefers-color-scheme`. Не ідентично demo Gentelella (часто light admin).

**Brand in dark mode:** orange primary коректно пробивається через `--primary-lt` overrides; sidebar teal active tints замінені в `styles.css`.

---

## 8. Підсумок для product vs template goal

| Якщо мета… | Висновок |
|------------|----------|
| **«Виглядати як сучасний admin на Gentelella tokens»** | **Досягнуто ~80%** — shell, cards, tables, theme, guest chrome працюють. |
| **«Сторінки 1:1 як reference HTML»** | **~40%** — свідомо: profile IA, semantic topbar, phone-auth, home. |
| **«Rebuild, not reskin» з plan** | **Phase 1 ~done**, unify-хвиля shell/guest **~done**; Profile widgets **open**; Profile IA **backlog**. |

Найбільший ризик hybrid drift — **profile widgets** (membership, notifications, date, hints): вони вже на Gentelella CSS variables, але при наступних фіча-ітераціях легко повернутися до «Squad Me panel» aesthetic, якщо не тримати reference HTML поруч при кожній зміні.

---

## 9. Чеклист наступних кроків

Якщо ціль — **вища template fidelity**, а не лише «виглядає сучасно». Відмічайте після кожного рішення або фіксу.

### Активна хвиля (styles/layout unify, 2026-07)

**Scope:** уніфікація примітивів/токенів + GuestChrome (Home/Auth); семантичний topbar як єдиний page title; actions у блоках на сторінці. **Profile IA (aside + scroll-spy + stacked sections) не змінюємо.**

**Правило CSS:** Gentelella class first; BEM / `profile-form__*` лише якщо немає слота шаблону.

**Backlog — Profile page unification (later):** поточна IA лишається (є продуктові зауваження до існуючого layout). Окрема хвиля: уніфікувати Profile на ті самі примітиви/патерни shell’а *і* переглянути IA (aside vs template `col-4-8`, membership/channels widgets). Не змішувати з unify-хвилею.

### Високий пріоритет

- [x] **Profile page layout** — **won't fix in this wave / backlog only.** Поточна IA (aside + scroll-spy + stacked sections) залишається продуктово; `col-4-8` rebuild — окрема хвиля після product remarks. Не змішувати з unify.

- [x] **Topbar parity** — **won't fix (свідоме відхилення).** Active wave: semantic topbar = єдиний page title; theme/lang у Profile identity / GuestChrome; logout у sidebar footer. Skeleton `topbar-right` суперечить прийнятому shell contract.

- [x] **Page headers** — свідоме відхилення від `.page-header` у контенті: єдиний page title в семантичному topbar `h1`; actions у page blocks (не в `SectionHeader`).

### Середній пріоритет

- [x] **Auth pages (visual login.html parity)** — **won't fix as 1:1.** Phone OTP + Turnstile + `HintPanel` — product flow; OAuth stubs / remember-me / `auth-divider` не плануються. GuestChrome shared з Home — done. Опційний polish (`input-group` icons на phone field) можна взяти окремо, якщо з’явиться потреба.

- [x] **Прибрати teal ghost** — done: `.auth-page` у `styles.css` — Pumpkin + Blue Energy radials поверх `gentelella.css`.

- [x] **Membership UX** — Gentelella `.toggle-row` + `.toggle` via `CollapsibleToggleBlock` (UPSF/IPSC + disciplines edit/view).

- [x] **DateField** — Gentelella `.input-affix` + SVG calendar; popover uses `--shadow-card` / radius tokens.

### Нижчий пріоритет / polish

- [x] **ProfileSectionHeader** — SVG icons in `.card-opt-btn` (currentColor) замість PNG.

- [x] **Badge API** — semantic `.badge-{tone}` is canonical for product chips; nav `.badge-red/teal/blue` aliased to the same tokens in `styles.css`.

- [x] **Home** — intentional non-Gentelella screen; shares `GuestBrand` / `GuestUtilities` with auth (not `landing.html`).

- [x] **Rail tooltips** — **won't fix for now.** `::after` labels лишаються вимкненими через overflow clip у rail; native `title` / `data-rail-label` достатньо. Повертати лише якщо з’явиться чистий clip-safe підхід.

- [x] **Template map** — `.agents/tmp/gentelella-template-map.md`: profile = `col-4-8` + lower `col-2` rows; Squad Me IA documented as intentional divergence.

### Закрито в working tree (shell polish, поза оригінальним fidelity-чеклистом)

- [x] **SHELL-001/002/003** — scrollbar gutter + lock compensation; shared `--overlay-scrim` (sidebar + modal + template cmdk/drawer); rail footer rules scoped to ≥769px.
- [x] **PROFILE-011/012** — mobile Profile order (identity → sections → actions) + full-width cards ≤1100px.
- [x] **Theme preference** — light / dark / system cycle; controls у Profile aside + GuestChrome.
- [x] **Sidebar footer** — прибрано `.sidebar-footer-tools`; profile + logout row (ближче до template).
