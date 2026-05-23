import { Bold, Italic, List, ListOrdered, Quote } from "lucide-react";

export const COMPOSER_DRAFT_KEY = "soldierhub_post_composer_draft_v2";
export const AUTO_SAVE_DELAY_MS = 1200;
export const FORMAT_BOUNDARY = "\u200B";

export const COMPOSER_CATEGORY_LABELS = {
  "General Q&A": "Q&A",
  "Resources & Support": "Resources",
  "New Soldier Help": "New Soldier",
  "Things To Do": "Things To Do",
};

export const FORMAT_ACTIONS = [
  { key: "bold", command: "bold", label: "Bold", shortLabel: "B", icon: Bold },
  { key: "italic", command: "italic", label: "Italic", shortLabel: "I", icon: Italic },
  { key: "bullet", command: "insertUnorderedList", label: "Bullet list", shortLabel: "• List", icon: List },
  { key: "number", command: "insertOrderedList", label: "Numbered list", shortLabel: "1. List", icon: ListOrdered },
  { key: "quote", command: "formatBlock", label: "Quote", shortLabel: "Quote", icon: Quote },
];

export const EDITOR_CLASSNAME =
  "w-full appearance-none border-0 bg-transparent pr-10 text-[18px] leading-8 shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 md:text-[17px] md:leading-7 [&_blockquote]:relative [&_blockquote]:my-3 [&_blockquote]:rounded-[18px] [&_blockquote]:border-0 [&_blockquote]:bg-[#DDE8F3] [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:font-normal [&_blockquote]:text-[#102033] [&_blockquote]:before:absolute [&_blockquote]:before:left-2 [&_blockquote]:before:top-1 [&_blockquote]:before:text-2xl [&_blockquote]:before:font-black [&_blockquote]:before:text-[#3F5F7D] [&_blockquote]:before:content-['“'] [&_blockquote]:after:ml-1 [&_blockquote]:after:text-2xl [&_blockquote]:after:font-black [&_blockquote]:after:text-[#3F5F7D] [&_blockquote]:after:content-['”'] [&_div]:min-h-[1.65em] [&_div]:whitespace-pre-wrap [&_em]:italic [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:min-h-[1.65em] [&_p]:whitespace-pre-wrap [&_strong]:font-extrabold [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1";
