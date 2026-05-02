// Local prototype moderation. Replace with a call to /api/moderate for production.
export function moderateContent(text) {
  const t = String(text || "").toLowerCase();
  const blocked = [
    "kill yourself",
    "terrorist attack",
    "bomb threat",
    "explicit threat",
    "doxx",
    "ssn",
    "social security number",
    "credit card number",
    "hate speech",
  ];
  const hit = blocked.find((p) => t.includes(p));
  if (hit) {
    return { allowed: false, reason: `Blocked phrase detected: "${hit}". Please rewrite your post.` };
  }
  if (text && text.trim().length < 2) {
    return { allowed: false, reason: "Content is too short." };
  }
  return { allowed: true };
}
