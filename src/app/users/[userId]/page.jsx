import { createClient } from "@/lib/supabase/server";
import VisitorProfileView from "./VisitorProfileView";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soldierhub.com";

function clean(value, max = 200) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

async function fetchPublicProfile(userId) {
  if (!userId) return null;

  try {
    const supabase = await createClient();
    if (!supabase) return null;

    const { data } = await supabase.rpc("get_public_profile", {
      p_user_id: userId,
    });

    return data?.[0] || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { userId } = await params;
  const profile = await fetchPublicProfile(userId);
  const canonical = `${SITE_URL}/users/${userId}`;

  if (!profile) {
    // Unverified, private, anonymous, or missing — keep these out of the index.
    return {
      title: "Member profile",
      robots: { index: false, follow: false },
      alternates: { canonical },
    };
  }

  const name = clean(profile.full_name, 70) || "SoldierHub member";
  const title = `${name} — Member profile`;
  const description = profile.bio
    ? clean(profile.bio, 160)
    : `${name} is a verified member of the SoldierHub Fort Bliss and El Paso military community.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "profile",
      url: canonical,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function VisitorProfilePage() {
  return <VisitorProfileView />;
}
