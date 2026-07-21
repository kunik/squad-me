/** sessionStorage helpers for post-OTP proofs (register / password_reset). */

export type StoredOtpProof = {
  proofToken: string;
  expiresAt: string;
  phone: string;
};

type ProofPurpose = "register" | "password_reset";

const STORAGE_KEY: Record<ProofPurpose, string> = {
  register: "squad.register.proof",
  password_reset: "squad.password_reset.proof",
};

export function saveOtpProof(purpose: ProofPurpose, proof: StoredOtpProof): void {
  try {
    sessionStorage.setItem(STORAGE_KEY[purpose], JSON.stringify(proof));
  } catch {
    // Private mode / quota — flow still works without refresh survival.
  }
}

/** Returns a still-valid proof, or null (and clears) if missing / malformed / expired. */
export function loadOtpProof(purpose: ProofPurpose): StoredOtpProof | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY[purpose]);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredOtpProof>;
    if (
      typeof parsed.proofToken !== "string" ||
      typeof parsed.expiresAt !== "string" ||
      typeof parsed.phone !== "string"
    ) {
      clearOtpProof(purpose);
      return null;
    }
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      clearOtpProof(purpose);
      return null;
    }
    return {
      proofToken: parsed.proofToken,
      expiresAt: parsed.expiresAt,
      phone: parsed.phone,
    };
  } catch {
    clearOtpProof(purpose);
    return null;
  }
}

export function clearOtpProof(purpose: ProofPurpose): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY[purpose]);
  } catch {
    // ignore
  }
}
