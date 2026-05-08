import { useCallback, useState } from "react";
import { uid } from "@/lib/helpers";

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((text, tone = "info") => {
    const id = uid();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const dismissToast = useCallback(
    (id) => setToasts((t) => t.filter((x) => x.id !== id)),
    []
  );

  return { toasts, pushToast, dismissToast };
}
