export const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function timeAgo(ts) {
  // Accept both numeric timestamps and ISO strings (Supabase returns strings)
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(t).toLocaleDateString();
}

export function getInitials(name) {
  if (!name) return "U";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function colorFromString(str) {
  const palette = ["#0B1C2C", "#314A66", "#2E7D5B", "#5B3F8C", "#9C2A55", "#9C6A1F", "#1F5A87", "#1F6E66"];
  const code = String(str || "U").split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return palette[code % palette.length];
}

export function shareOrCopy(post, onToast) {
  if (typeof window === "undefined") return;
  const url = `${window.location.origin}/post/${post.id}`;
  const data = { title: post.title, text: post.body?.slice(0, 100), url };
  if (navigator.share) {
    navigator.share(data)
      .then(() => onToast("Post shared successfully", "success"))
      .catch(() => onToast("Share canceled", "info"));
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url)
      .then(() => onToast("Post link copied", "success"))
      .catch(() => onToast("Could not copy link", "error"));
  } else {
    onToast("Sharing not supported in this browser", "error");
  }
}
