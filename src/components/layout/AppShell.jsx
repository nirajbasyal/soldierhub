"use client";
import { useApp } from "@/store/AppContext";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import MobileMenu from "./MobileMenu";
import ScrollToTop from "./ScrollToTop";
import AuthModal from "@/components/auth/AuthModalV2";
import ToastHost from "@/components/ui/ToastHost";
import MediaViewerProvider from "@/components/media/MediaViewerProvider";

/**
 * AppShell renders the persistent chrome around page content.
 * Pass `hideNav` for focused full-screen flows such as Board Prep, compose,
 * profile, notifications, and tool pages. The drawer, toasts, auth modal,
 * and scroll helper still stay available.
 */
export default function AppShell({ children, hideNav = false }) {
  const { authModal } = useApp();

  return (
    <MediaViewerProvider>
      {!hideNav && <TopNav />}
      {children}
      {!hideNav && <BottomNav />}
      <MobileMenu />
      <ScrollToTop />
      <ToastHost />
      {authModal && <AuthModal />}
    </MediaViewerProvider>
  );
}
