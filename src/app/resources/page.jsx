"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookMarked } from "lucide-react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { listResources } from "@/lib/db/resources";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import ResourceCard from "@/components/resources/ResourceCard";

export default function ResourcesPage() {
  const router = useRouter();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadResources() {
      setLoading(true);
      setLoadError("");

      const { data, error } = await listResources();

      if (!alive) return;

      if (error) {
        setLoadError(error.message || "Could not load resources.");
        setResources([]);
      } else {
        setResources(data || []);
      }

      setLoading(false);
    }

    loadResources();

    return () => {
      alive = false;
    };
  }, []);

  const groupedResources = useMemo(() => {
    return resources.reduce((groups, resource) => {
      const section = resource.section || "General";

      if (!groups[section]) {
        groups[section] = [];
      }

      groups[section].push(resource);

      return groups;
    }, {});
  }, [resources]);

  return (
    <AppShell hideNav>
      <main
        className="min-h-screen pb-24 md:pb-12"
        style={{ backgroundColor: T.bg }}
      >
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => router.push("/")}
          >
            Back to feed
          </Button>

          <div className="mt-6 mb-7">
            <div className="flex items-center gap-2 mb-1">
              <BookMarked size={16} style={{ color: T.gold }} />
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: T.gold }}
              >
                Fort Bliss
              </span>
            </div>

            <h1
              className="text-3xl md:text-4xl leading-tight font-serif"
              style={{ color: T.navy }}
            >
              Resources
            </h1>

            <p
              className="text-[15px] mt-3 leading-relaxed max-w-2xl"
              style={{ color: T.textMuted }}
            >
              Useful links for Fort Bliss soldiers and families. Resources are
              reviewed and managed by SoldierHub admins.
            </p>
          </div>

          {loading ? (
            <div
              className="rounded-2xl border p-6 text-sm"
              style={{
                backgroundColor: T.card,
                borderColor: T.border,
                color: T.textMuted,
              }}
            >
              Loading resources...
            </div>
          ) : loadError ? (
            <div
              className="rounded-2xl border p-6 text-sm"
              style={{
                backgroundColor: T.card,
                borderColor: T.border,
                color: T.textMuted,
              }}
            >
              {loadError}
            </div>
          ) : resources.length === 0 ? (
            <div
              className="rounded-2xl border p-6 text-sm"
              style={{
                backgroundColor: T.card,
                borderColor: T.border,
                color: T.textMuted,
              }}
            >
              No resources have been added yet.
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {Object.entries(groupedResources).map(([section, items]) => (
                <section key={section}>
                  <h2
                    className="text-[11px] font-semibold uppercase tracking-wider mb-3 px-1"
                    style={{ color: T.textSubtle }}
                  >
                    {section}
                  </h2>

                  <div className="grid gap-3 md:grid-cols-2">
                    {items.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        title={resource.title}
                        description={resource.description}
                        url={resource.link}
                        link={resource.link}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <div
            className="rounded-2xl border p-5 mt-8"
            style={{ backgroundColor: T.surface, borderColor: T.borderSoft }}
          >
            <div
              className="text-sm font-semibold mb-1"
              style={{ color: T.text }}
            >
              Have a resource we missed?
            </div>

            <p
              className="text-sm leading-relaxed"
              style={{ color: T.textMuted }}
            >
              Post your suggestion in the feed with the tag{" "}
              <span style={{ color: T.text, fontWeight: 600 }}>
                General Q&amp;A
              </span>{" "}
              and admins can review it for inclusion.
            </p>
          </div>

          <Footer />
        </div>
      </main>
    </AppShell>
  );
}