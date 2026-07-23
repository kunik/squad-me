import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useLocale } from "../locale";
import { logout as logoutRequest } from "../lib/authApi";

/** Shared logout flow for sidebar footer (and any future sign-out control). */
export function useLogout() {
  const { t } = useLocale();
  const { refresh, setAccount } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await logoutRequest();
      if (!result.ok) {
        setError(t.authErrorNetwork);
        return false;
      }
      setAccount(null);
      await refresh();
      navigate("/");
      return true;
    } catch {
      setError(t.authErrorNetwork);
      return false;
    } finally {
      setBusy(false);
    }
  }, [navigate, refresh, setAccount, t.authErrorNetwork]);

  return { logout, busy, error };
}
