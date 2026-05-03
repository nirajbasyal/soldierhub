"use client";

import { createClient } from "@/lib/supabase/client";

export async function listResources() {
  const supabase = createClient();
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .order("section", { ascending: true })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

export async function adminCreateResource({
  section,
  title,
  description,
  link,
}) {
  const supabase = createClient();
  if (!supabase) {
    return {
      data: null,
      error: { message: "Supabase is not configured." },
    };
  }

  const { data, error } = await supabase
    .from("resources")
    .insert([
      {
        section: section.trim(),
        title: title.trim(),
        description: description.trim(),
        link: link.trim(),
      },
    ])
    .select()
    .single();

  return { data, error };
}

export async function adminUpdateResource(
  id,
  { section, title, description, link }
) {
  const supabase = createClient();
  if (!supabase) {
    return {
      data: null,
      error: { message: "Supabase is not configured." },
    };
  }

  const { data, error } = await supabase
    .from("resources")
    .update({
      section: section.trim(),
      title: title.trim(),
      description: description.trim(),
      link: link.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  return { data, error };
}

export async function adminDeleteResource(id) {
  const supabase = createClient();
  if (!supabase) {
    return {
      error: { message: "Supabase is not configured." },
    };
  }

  const { error } = await supabase.from("resources").delete().eq("id", id);

  return { error };
}