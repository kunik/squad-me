export type Locale = "ua" | "en";

export const messages = {
  ua: {
    login: "Увійти",
    support:
      "Платформа для реєстрації, скваддінгу та новин на матчах практичної стрільби",
    inviteHint: "Доступ до матчу — за запрошенням",
    loginTitle: "Вхід",
    loginPending:
      "Авторизація ще не підключена. Незабаром тут з’явиться вхід через обраний провайдер.",
    backHome: "На головну",
    langUa: "UA",
    langEn: "EN",
  },
  en: {
    login: "Log in",
    support:
      "Registration, squadding, and news for practical shooting matches",
    inviteHint: "Match access is by invitation only",
    loginTitle: "Log in",
    loginPending:
      "Authentication is not wired yet. Sign-in via the chosen identity provider will appear here soon.",
    backHome: "Back to home",
    langUa: "UA",
    langEn: "EN",
  },
} as const;

export type Messages = (typeof messages)[Locale];
