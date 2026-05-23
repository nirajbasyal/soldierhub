export default function ProfileInfoPill({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-[#D5E2F2] bg-[#F4F8FD] px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#DCE8F7] text-[#1E4E8C]">
        <Icon size={15} />
      </div>
      <div className="min-w-0 text-left">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </div>
        <div className="truncate text-xs font-bold text-[#0B1C2C] sm:text-sm">
          {value}
        </div>
      </div>
    </div>
  );
}
