"use client";
import { useApp } from "@/store/AppContext";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import MobileMenu from "./MobileMenu";
import ScrollToTop from "./ScrollToTop";
import AuthModal from "@/components/auth/AuthModal";
import ToastHost from "@/components/ui/ToastHost";

/**
 * AppShell renders the persistent chrome (top nav, bottom nav, drawer, modals)
 * around any page content. Pass `hideNav` for pages that render their own
 * back-button-style navigation (e.g. profile, notifications, tool pages).
 */
export default function AppShell({ children, hideNav = false }) {
  const { authModal } = useApp();

  return (
    <>
      {!hideNav && <TopNav />}
      {children}
      <BottomNav />
      <MobileMenu />
      <ScrollToTop />
      <ToastHost />
      {authModal && <AuthModal />}
    </>
  );
}
