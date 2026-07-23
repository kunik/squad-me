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

**6.5 / 10** — технічно це вже Gentelella «знизу вгору» (імпортований `gentelella.css`, правильні класи shell/cards/forms), але **сторінкова композиція й IA залишилися продуктовими**, а не копією конкретних reference-HTML.

---

## 1. Загальний вердикт

Redesign успішно переносить **дизайн-систему Gentelella v4** (токени, sidebar/topbar, `.card`, `.table`, `.btn`, `.modal`, `.auth-card`). Це не reskin старих `profile-page__*` класів — старий `PublicChrome` / `PublicAtmosphere` прибрані, `styles.css` лише бренд-шар поверх шаблону.

Але ціль «layout leads, not old component tree» з `gentelella-redesign-plan.md` виконана **частково**: shell і примітиви — так; **Profile, auth-контент, Home — гібрид** між Gentelella markup і попередньою Squad Me IA.

---

## 2. Оцінка по областях

| Область | Бали | Коротка нота |
|--------|------|--------------|
| **Shell (sidebar / topbar / main)** | **7/10** | DOM і розміри (252px sidebar, 56px topbar, `.main` / `.page-wrapper`) збігаються з `_layout.scss` + `shell-render.js`. Topbar сильно спрощений; theme/lang/logout перенесені в sidebar footer. |
| **Rail / collapse** | **7.5/10** | `body.sidebar-rail`, 64px, mobile drawer — як у шаблону. Squad Me вимикає CSS `::after` tooltips (`styles.css`) на користь `title` — менш «Gentelella-native». |
| **Footer tools vs template** | **5/10** | У Gentelella: `sidebar-user` + `more-btn`, utilities в topbar-right. У Squad Me: `.sidebar-footer-tools` (lang, theme, logout) — **продуктове винаходження**, не з reference. |
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
| **Light / dark theme** | **7.5/10** | `html[data-theme]` як у Gentelella; toggle перенесений з topbar у sidebar/auth utilities. |
| **Home / guest chrome** | **3/10** | Власний `.home` hero, не `landing.html` і не Gentelella auth chrome. |

---

## 3. Top divergences (ранжовано)

1. **Profile IA: `ProfileAside` + scroll-spy якірна навігація**
   - Reference: `production/profile.html` — `row col-4-8`: зліва summary (avatar + completion ring), справа одна форма; notifications — `.toggle.on` switches; security — окрема card з таблицею sessions.
   - Squad Me: `row col-8-4 profile-page-layout` — зліва **вертикальний стек** секцій (`ProfileContentSection`), справа sticky aside з anchor nav + security actions (`ProfileAside.tsx`, `styles.css` `.profile-aside-*`).
   - **Це продуктове рішення**, не з Gentelella profile page (хоча `.agents/tmp/gentelella-template-map.md` помилково каже «stacked cards»).

2. **Topbar без «другої половини» Gentelella**
   - Reference `renderTopbar()`: search-box (⌘K), docs, theme, notifications, messages, avatar.
   - `AccountShell.tsx`: лише toggle + один `.breadcrumb .current` — без `topbar-right`, без `page-header` на profile.

3. **Sidebar footer utilities замість topbar user menu**
   - `SidebarFooter.tsx` + `.sidebar-footer-tools` — lang/theme/logout у sidebar.
   - Gentelella тримає theme/notifications/avatar у topbar; profile link у footer без lang/logout row.

4. **Auth content vs `login.html`**
   - Немає `.input-group` + SVG icons, `.auth-actions` (remember me), `.auth-divider`, social login grid.
   - Замість цього: phone-based форма, `HintPanel` всередині card, `.auth-utilities` з lang/theme (`AuthLayout.tsx`, `LoginPage.tsx`).

5. **Membership / disciplines collapsible blocks**
   - `.profile-form__toggle-block`, chevrons, custom checkbox styling (`styles.css` ~636–730) — **не** Gentelella `.toggle` switch nor wizard pattern from `form_wizards.html`.

6. **`DateField` calendar popover**
   - Повністю custom (`.date-field`, `.date-pop` portal) — Gentelella advanced forms мають інші date patterns; zero template markup overlap.

7. **`NotificationChannelsForm`**
   - Частково `.toggle-row` + `.form-check`, але channel connect buttons, PNG icons, expand panels (`.channel-list`, `.channel-connect-btn`) — heavy hybrid.

8. **`ProfileSectionHeader` — PNG edit/cancel**
   - Використовує `.card-opt-btn`, але з `/icon-edit.png` / `/icon-cancel.png` замість inline SVG як у Gentelella card headers.

9. **`SectionHeader` vs Gentelella `page-header`**
   - `SectionHeader.tsx`: title перед pretitle/description; Gentelella — `page-pretitle` **над** `page-title`. Profile взагалі без `page-header`.

10. **Home page**
    - `HomePage.tsx` — custom `.home-topbar` + hero; не `landing.html` spirit з plan, не Gentelella public chrome.

11. **Auth background gradient still teal-tinted**
    - `_auth.scss` / `gentelella.css`: `rgba(26,187,156,0.06)` radial — при orange brand виглядає як залишок Gentelella teal, не Squad Me.

12. **Rail tooltips disabled**
    - `styles.css` рядки ~199–201: `content: none !important` для `::after` labels — свідомий відхід від Gentelella hover tooltips.

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
| **Icons** | Mix SVG (nav) + PNG (edit/cancel, channel status) |

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

**Розміщення controls — відхилення.** Gentelella: `.tb-btn.theme-toggle` у topbar. Squad Me: `ThemeSwitch` у `SidebarFooter` / `AuthLayout.auth-utilities` / `HomePage`.

**Default:** `index.html` стартує з `data-theme="dark"`; `initTheme()` може override через localStorage / `prefers-color-scheme` — ок, але не ідентично demo Gentelella (який частіше показує light admin).

**Brand in dark mode:** orange primary коректно пробивається через `--primary-lt` overrides; sidebar teal active tints замінені в `styles.css`.

---

## 8. Підсумок для product vs template goal

| Якщо мета… | Висновок |
|------------|----------|
| **«Виглядати як сучасний admin на Gentelella tokens»** | **Досягнуто ~75%** — shell, cards, tables, theme працюють. |
| **«Сторінки 1:1 як reference HTML»** | **~40%** — profile IA, topbar, auth detail, home суттєво інші. |
| **«Rebuild, not reskin» з plan** | **Phase 1 ~done**, Phase 2 profile **partial**, auth/home **partial**. |

Найбільший ризик hybrid drift — **profile widgets** (membership, notifications, date, hints): вони вже на Gentelella CSS variables, але при наступних фіча-ітераціях легко повернутися до «Squad Me panel» aesthetic, якщо не тримати reference HTML поруч при кожній зміні.

---

## 9. Чеклист наступних кроків

Якщо ціль — **вища template fidelity**, а не лише «виглядає сучасно». Відмічайте після кожного рішення або фіксу.

### Високий пріоритет

- [ ] **Profile page layout** — перебудувати під `profile.html`: `col-4-8` identity+form, notifications як `.toggle` rows, security/sessions як окремі cards; aside anchor nav або прибрати, або перенести в лівий summary card як inline links (ближче до ring-box / nav у template).

- [ ] **Topbar parity** — повернути хоча б skeleton `topbar-right`: theme toggle, optional notifications placeholder, user avatar menu; search-box можна залишити disabled/«coming soon», але DOM має збігатися з reference.

- [ ] **Page headers** — на Matches, Linked, Profile додати `.page-header` з `page-pretitle` + `page-title` + `page-actions` (зараз profile покладається лише на topbar breadcrumb).

### Середній пріоритет

- [ ] **Auth pages** — додати `input-group` icons, `.auth-actions` row, структуру footer/divider як у `login.html`; OAuth блок — stub disabled buttons для visual parity.

- [ ] **Прибрати teal ghost** — оновити auth radial-gradient у brand layer (`styles.css`) на orange/azure mix замість `rgba(26,187,156,...)`.

- [ ] **Membership UX** — замінити `.profile-form__toggle-block` на Gentelella `.toggle` / `toggle-row` де можливо, або `form_advanced.html` patterns.

- [ ] **DateField** — стилізувати popover ближче до Gentelella dropdown/calendar (border-radius, shadow tokens уже близькі — потрібен markup alignment).

### Нижчий пріоритет / polish

- [ ] **ProfileSectionHeader** — SVG icons in `.card-opt-btn` замість PNG; card subtitle rows як у template.

- [ ] **Badge API** — або мапити `Badge` tone → `.badge-teal/red/blue`, або документувати semantic layer як свідоме відхилення.

- [ ] **Home** — або Gentelella `landing.html` layout, або явно зафіксувати як intentional non-Gentelella screen (щоб не тягнути fidelity score).

- [ ] **Rail tooltips** — повернути Gentelella `::after` tooltips (прибрати `content: none`) якщо overflow clip вирішено інакше.

- [ ] **Template map** — виправити `.agents/tmp/gentelella-template-map.md`: profile reference — не «stacked cards», а `col-4-8` + lower `col-2` rows.
