"use client";
import { AppProvider } from "@/store/AppContext";

export default function Providers({ children }) {
  return <AppProvider>{children}</AppProvider>;
}
