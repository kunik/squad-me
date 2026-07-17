import { useEffect, useState } from "react";

type Health = {
  ok: boolean;
  environment: string;
  commitSha: string | null;
};

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`health ${response.status}`);
        }
        return (await response.json()) as Health;
      })
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "health failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>Squad Me</h1>
      <p>Local inner loop on workerd. Cloud Dev parity at dev.squadme.app.</p>
      {error ? <p role="alert">{error}</p> : null}
      {health ? (
        <p>
          API ok · env={health.environment} · sha={health.commitSha ?? "local"}
        </p>
      ) : null}
    </main>
  );
}
