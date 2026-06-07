"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle,
  ChevronRight,
  Flame,
  Home,
  Music,
  RotateCcw,
  ScrollText,
  Send,
  Shield,
  Trophy,
  XCircle,
} from "lucide-react";
import { T } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/layout/AppShell";
import ToolPage from "@/components/ui/ToolPage";

const OPTION_KEYS = ["a", "b", "c", "d"];
const OPTION_LABELS = { a: "A", b: "B", c: "C", d: "D" };
const TOTAL = 5;

const SCORE_MESSAGE = {
  5: "Perfect score. You are board-ready.",
  4: "Strong performance. Keep it up.",
  3: "Solid effort. Review what you missed.",
  2: "Keep studying — you will get there.",
  1: "Every expert was once a beginner.",
  0: "Use the explanations to guide your study.",
};

const REFERENCE_CARDS = [
  {
    title: "Soldier's Creed",
    icon: Shield,
    note: "Practice this aloud. Boards often look for confidence, military bearing, and understanding of the Warrior Ethos.",
    lines: [
      "I am an American Soldier.",
      "I am a warrior and a member of a team.",
      "I serve the people of the United States and live the Army Values.",
      "I will always place the mission first.",
      "I will