const DEFAULT_DEMO_ADMIN_EMAIL = "admin@soldierhub.local";

// Demo/local mode only. Live admin authorization is enforced server-side with
// SOLDIERHUB_ADMIN_EMAILS plus the profile role in protected API routes.
export const DEMO_ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_SOLDIERHUB_DEMO_ADMIN_EMAIL || DEFAULT_DEMO_ADMIN_EMAIL
).trim().toLowerCase();

// Backwards-compatible alias for older local-mode code paths. Prefer
// DEMO_ADMIN_EMAIL for new code so this is not confused with live admin auth.
export const ADMIN_EMAIL = DEMO_ADMIN_EMAIL;

// Add or rename categories here and mirror the same keys in the posts_category_allowed_check migration.
export const POST_CATEGORY_KEYS = [
  "General Q&A",
  "PCS / Moving",
  "On-Base Guide",
  "Housing",
  "Barracks",
  "Local Recommendations",
  "Things to Do",
  "Finance",
  "Education",
  "Family / Spouse",
  "Resources",
  "Events & Community",
];

export const CATEGORIES = [
  { key: "All", label: "All", tone: "navy" },
  ...POST_CATEGORY_KEYS.map((key) => ({
    key,
    label: key,
    tone: {
      "General Q&A": "indigo",
      "PCS / Moving": "blue",
      "On-Base Guide": "navy",
      Housing: "amber",
      Barracks: "violet",
      "Local Recommendations": "rose",
      "Things to Do": "teal",
      Finance: "amber",
      Education: "blue",
      "Family / Spouse": "violet",
      Resources: "rose",
      "Events & Community": "blue",
    }[key],
  })),
];

export const GATES = [
  { name: "Buffalo Soldier", hours: "24/7" },
  { name: "Cassidy", hours: "24/7" },
  { name: "Chaffee", hours: "Mon–Fri 5 a.m.–9 p.m. · Sat–Sun Closed" },
  { name: "CSM Barreras", hours: "24/7" },
  { name: "McGregor Front", hours: "24/7" },
  { name: "MSG Espinoza", hours: "24/7" },
  { name: "MSG Peña", hours: "24/7" },
  { name: "Old Ironsides", hours: "Mon–Fri 5 a.m.–9 p.m. · Sat–Sun Closed" },
  { name: "PFC Minue", hours: "Mon–Fri 5–10 a.m.; 4–8 p.m. · Outbound only · Sat–Sun Closed" },
  { name: "Ross School ECP", hours: "Mon–Fri 7–8 a.m.; 10:45 a.m.–noon; 2–5:30 p.m. · Sat–Sun Closed" },
  { name: "SGT Duran", hours: "Mon–Fri 5 a.m.–9 p.m. · Sat–Sun & Federal Holidays Closed" },
  { name: "Sheridan", hours: "Mon–Fri inbound 5–9 a.m.; 2–6 p.m. · Outbound 5 a.m.–7 p.m. · Sat–Sun Closed" },
  { name: "Silvestre Reyes", hours: "Closed" },
  { name: "VCC – Buffalo Soldier", hours: "24/7" },
  { name: "VCC – Chaffee", hours: "Mon–Fri 5 a.m.–9 p.m. · Sat–Sun Closed" },
];

// Fort Bliss BAH reference rates — replace with live API in production.
export const BAH_RATES = {
  E1: { with: 1416, without: 1062 }, E2: { with: 1416, without: 1062 },
  E3: { with: 1416, without: 1062 }, E4: { with: 1416, without: 1062 },
  E5: { with: 1602, without: 1281 }, E6: { with: 1761, without: 1437 },
  E7: { with: 1875, without: 1551 }, E8: { with: 1986, without: 1656 },
  E9: { with: 2103, without: 1755 },
  W1: { with: 1791, without: 1467 }, W2: { with: 1872, without: 1551 },
  W3: { with: 2010, without: 1647 }, W4: { with: 2127, without: 1740 },
  W5: { with: 2229, without: 1812 },
  O1: { with: 1734, without: 1389 }, O2: { with: 1845, without: 1503 },
  O3: { with: 2010, without: 1611 }, O4: { with: 2151, without: 1752 },
  O5: { with: 2274, without: 1857 }, O6: { with: 2310, without: 1881 },
  O7: { with: 2349, without: 1908 },
};
