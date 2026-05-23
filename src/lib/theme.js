// Single source of truth for colors. Change values here to reskin the app.
// SoldierHub front-end theme: independent, unofficial, light, premium, and readable.
export const T = {
  // Production design tokens
  brandNavy: "#071B33",
  brandNavySoft: "#102E52",
  brandBlue: "#1E4E8C",
  brandBlueSoft: "#DCE8F7",
  brandRed: "#B31942",
  brandRedSoft: "#FDECF0",

  background: "#EAF0F8",
  backgroundSoft: "#F7FAFE",
  card: "#FDFEFF",
  surface: "#F3F6FB",
  surfaceSoft: "#F8FAFD",

  textPrimary: "#081827",
  textSecondary: "#43556B",
  textMuted: "#7B8797",

  border: "#CFDAE8",
  borderSoft: "#E2E9F3",

  danger: "#B31942",
  dangerBg: "#FDECF0",
  success: "#247151",
  successBg: "#E4F3EC",
  warning: "#B86A00",
  warningBg: "#FFF1D7",

  // Backward-compatible aliases. Keep these so older components do not break.
  bg: "#EAF0F8",
  navy: "#071B33",
  navy90: "#102E52",
  navy70: "#31577E",
  blue: "#1E4E8C",
  blueSoft: "#DCE8F7",
  gold: "#B31942",       // Legacy alias: primary SoldierHub red, not yellow/gold.
  goldSoft: "#F7D6DE",
  goldBg: "#FDECF0",
  green: "#247151",
  greenBg: "#E4F3EC",
  red: "#B31942",
  redBg: "#FDECF0",
  amber: "#B86A00",
  amberBg: "#FFF1D7",
  text: "#081827",
  textMuted: "#43556B",
  textSubtle: "#7B8797",
};

export const TONE_STYLES = {
  navy:   { bg: "#E3EAF5", text: "#071B33", border: "#C6D4E6" },
  indigo: { bg: "#E8EDFA", text: "#284B8F", border: "#CCD8F3" },
  amber:  { bg: "#FFF1D7", text: "#8A4D00", border: "#F2D29A" },
  green:  { bg: "#E4F3EC", text: "#247151", border: "#C7E3D4" },
  blue:   { bg: "#DCE8F7", text: "#1E4E8C", border: "#BCD0EA" },
  violet: { bg: "#EEE9FA", text: "#57408E", border: "#DAD0F0" },
  rose:   { bg: "#FDECF0", text: "#B31942", border: "#F2C5D0" },
  teal:   { bg: "#DFF2F1", text: "#1E6B68", border: "#C0E2E0" },
  red:    { bg: "#FDECF0", text: "#B31942", border: "#F2C5D0" },
};
