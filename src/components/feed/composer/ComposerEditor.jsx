"use client";

import dynamic from "next/dynamic";

const TipTapComposerEditor = dynamic(() => import("./TipTapComposerEditor"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[160px] w-full rounded-2xl border border-[#D9E2EC] bg-[#F7FAFD] p-4 text-sm font-semibold text-[#7B8794]">
      Loading editor...
    </div>
  ),
});

export default function ComposerEditor(props) {
  return <TipTapComposerEditor {...props} />;
}
