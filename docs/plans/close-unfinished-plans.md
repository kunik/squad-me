# Закриття незавершених планів — результат

**Рішення (2026-07-24):**
- Gentelella fidelity + redesign плани **видалено** (не архівувати як Done).
- Profile IA `col-4-8` rebuild = **won't do** — лишається shipped `col-8-4`.
- Залишковий план у `docs/plans/`: лише **Auth / registration**.

Джерела правди: [`auth-registration-STATUS.md`](./auth-registration-STATUS.md), [`../README.md`](../README.md).

| Item | Status |
|------|--------|
| Gentelella fidelity plan | **Cancelled / deleted** |
| Gentelella redesign plan | **Cancelled / deleted** |
| Profile `col-4-8` rebuild | **Won't do** (keep shipped `col-8-4`) |
| Auth Phase 0 | **Pending (owner)** |
| Auth Phases 1–4 | **Done** |
| Auth Phase 5 | **Done as designed (stub scope v1)** |
| Scrypt Workers CPU bench | **Won't do until traffic ramp** (local `bench:scrypt` Done) |

---

## 1. Gentelella fidelity — **cancelled / deleted**

Файл `docs/plans/gentelella-fidelity-audit.md` **видалено**.
Profile `col-4-8` = **won't do**. Роутер у `docs/README.md` → `src/client/` + KB app-shell.

---

## 2. Gentelella redesign — **cancelled / deleted**

Файл `docs/plans/gentelella-redesign-plan.md` **видалено**.
Shipped shell/pages лишаються; окремий redesign plan більше не ведеться.

---

## 3. Auth / registration — єдиний відкритий план

Файли: STATUS + `auth-registration-plan.md`; gate у `docs/deployment.md` /
`docs/provision.md` / `.agents/notes.md`.

| Phase | Status |
|-------|--------|
| 0 Secrets & alerts | **Pending (owner)** |
| 1–4 | **Done** (scrypt Workers bench = won't do until traffic ramp) |
| 5 Notify hooks | **Done as designed (stub scope v1)**; email-OTP / Telegram / preference / push = **won't do v1** |

### Open: Phase 0 only

Чеклісти ще `[ ]`:
1. **Turnstile** — widget + `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`
2. **Twilio Verify** — SID / Auth Token / Verify Service SID
3. **Budget alerts** — Gateway + Twilio

Owner виконує `docs/provision.md` § Identity / auth secrets; агент не вигадує secrets.

### Closed in docs

- Phase 5 stub scope + won't-do v1 — STATUS/plan оновлено.
- Scrypt: local Done; Workers CPU = won't do until traffic ramp.

---

## Поза цим проходом

- Profile IA `col-4-8` — won't do (продукт підтвердив shipped layout).
- Повний notifications епік — окремий майбутній план / KB.
