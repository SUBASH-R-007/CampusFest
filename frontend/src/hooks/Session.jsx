import { createContext, useContext, useState, useEffect } from "react";
import { api, post } from "../services/api";
const SessionContext = createContext(null);
export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  async function reload() {
    try {
      const next = await api("/session");
      setSession(next);
      setError(null);
      return next;
    } catch (e) {
      setError(e);
    }
  }
  useEffect(() => {
    reload();
  }, []);
  async function login(email, password) {
    await post("/session/login", { email, password });
    return reload();
  }
  async function logout() {
    await post("/session/logout");
    await reload();
  }
  return (
    <SessionContext.Provider value={{ session, error, reload, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}
export const useSession = () => useContext(SessionContext);
