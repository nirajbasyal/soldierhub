"use client";
import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { T } from "@/lib/theme";

export default function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      title="Back to top"
      className="fixed bottom-24 md:bottom-6 right-4 md:right-6 w-11 h-11 rounded-full shadow-lg border z-40 flex items-center justify-center transition-transform hover:scale-105"
      style={{
        backgroundColor: T.navy,
        borderColor: T.navy,
        color: "#fff",
        animation: "fadeIn 200ms ease-out",
      }}
    >
      <ChevronUp size={20} strokeWidth={2.5} />
    </button>
  );
}
