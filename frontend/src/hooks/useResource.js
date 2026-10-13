import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
export function useResource(path) {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: true,
  });
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, error: null, loading: true }));
    api(path, { signal: controller.signal })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState((s) => ({ ...s, error, loading: false }));
      });
    return () => controller.abort();
  }, [path, version]);
  return {
    ...state,
    refresh,
    setData: (data) => setState({ data, error: null, loading: false }),
  };
}
