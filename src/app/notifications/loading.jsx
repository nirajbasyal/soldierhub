import { Bell } from "lucide-react";

export default function NotificationsLoading() {
  return (
    <main className="min-h-screen bg-[#F3F6FA] px-4 pb-28 pt-5 md:pb-12 md:pt-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8EEF5]">
              <Bell className="h-6 w-6 text-[#3F5F7D]" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="h-5 w-40 animate-pulse rounded-full bg-[#DDE6EF]" />
              <div className="mt-2 h-3 w-56 max-w-full animate-pulse rounded-full bg-[#E8EEF5]" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="rounded-[26px] border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur"
            >
              <div className="flex gap-3">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-[#E8EEF5]" />

                <div className="min-w-0 flex-1">
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-[#DDE6EF]" />
                  <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-[#E8EEF5]" />
                  <div className="mt-2 h-3 w-2/3 animate-pulse rounded-full bg-[#E8EEF5]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
