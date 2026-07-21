/**
 * Local wall-clock sample of identity scrypt params (N=2^15, r=8, p=1).
 * Does not replace a deployed Workers CPU-time check — Node times are a
 * lower bound / relative signal only. See docs/provision.md and
 * docs/plans/auth-registration-plan.md.
 *
 * Usage: npm run bench:scrypt
 */
import { hashPassword, verifyPassword } from "../src/worker/identity/password.ts";

const ITERATIONS = Number(process.env.SCRYPT_BENCH_ITERS ?? "5");
const PASSWORD = "bench-password-12";

async function meanMs(label: string, fn: () => Promise<void>): Promise<number> {
  const samples: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = performance.now();
    await fn();
    samples.push(performance.now() - t0);
  }
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  console.log(
    `${label}: mean=${mean.toFixed(1)}ms min=${min.toFixed(1)}ms max=${max.toFixed(1)}ms (n=${ITERATIONS})`,
  );
  return mean;
}

async function main() {
  console.log("scrypt params: N=32768 (2^15), r=8, p=1, dkLen=32 (~32 MiB peak)");
  console.log(
    "Guidance: local Node mean hash ideally <150ms; Workers interactive login should stay comfortably under the plan CPU budget (Paid default 30ms/request is tight — measure on Workers before raising N). Do not change N without measuring.",
  );

  let stored = "";
  const hashMean = await meanMs("hashPassword", async () => {
    stored = await hashPassword(PASSWORD);
  });
  await meanMs("verifyPassword (ok)", async () => {
    const ok = await verifyPassword(PASSWORD, stored);
    if (!ok) throw new Error("verify failed unexpectedly");
  });

  if (hashMean > 300) {
    console.warn(
      `WARN: local hash mean ${hashMean.toFixed(0)}ms is high — Workers may struggle; consider PBKDF2 fallback path in the plan before raising traffic.`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
