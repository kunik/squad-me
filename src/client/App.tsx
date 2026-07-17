export function App() {
  return (
    <main className="coming-soon">
      <div className="coming-soon__grid" aria-hidden="true" />
      <div className="coming-soon__content">
        <img
          className="coming-soon__logo"
          src="/logo-full.svg"
          alt="Squad Me"
          width={794}
          height={177}
        />
        <p className="coming-soon__support">
          Платформа для організації матчів з практичної стрільби
        </p>
        <div className="coming-soon__accent" aria-hidden="true" />
      </div>
    </main>
  );
}
