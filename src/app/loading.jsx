export default function Loading() {
  return (
    <main className="min-h-screen bg-[#EAF0F8] px-4 py-6">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-[2rem] border border-[#E2E9F3] bg-[#FDFEFF] p-6 shadow-[0_24px_70px_rgba(7,27,51,0.10)] sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071B33] text-sm font-black tracking-tight text-white">
              SH
            </div>
            <div>
              <p className="text-base font-black leading-tight text-[#071B33]">Soldier Hub</p>
              <p className="text-xs font-semibold text-[#7B8797]">Fort Bliss community</p>
            </div>
          </div>

          <div className="mb-6 h-14 w-14 animate-pulse rounded-3xl border border-[#E2E9F3] bg-[#F3F6FB]" />
          <div className="mb-3 h-3 w-36 animate-pulse rounded-full bg-[#DCE8F7]" />
          <div className="mb-4 h-9 w-4/5 animate-pulse rounded-2xl bg-[#DCE8F7]" />
          <div className="h-4 w-full animate-pulse rounded-full bg-[#E2E9F3]" />
          <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-[#E2E9F3]" />
        </div>
      </section>
    </main>
  );
}
