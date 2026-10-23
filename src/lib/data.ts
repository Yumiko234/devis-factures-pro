import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { LineItem } from "./invoice";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Settings = Database["public"]["Tables"]["company_settings"]["Row"];
export type DocumentRow = Omit<Database["public"]["Tables"]["documents"]["Row"], "items"> & {
  items: LineItem[];
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const useClients = () =>
  useQuery({
    queryKey: ["clients"],
    queryFn: async () => unwrap(await supabase.from("clients").select("*").order("name")),
  });

export const useProducts = () =>
  useQuery({
    queryKey: ["products"],
    queryFn: async () => unwrap(await supabase.from("products").select("*").order("name")),
  });

export const useSettings = () =>
  useQuery({
    queryKey: ["settings"],
    queryFn: async () => unwrap(await supabase.from("company_settings").select("*").maybeSingle()),
  });

export const useDocuments = () =>
  useQuery({
    queryKey: ["documents"],
    queryFn: async () =>
      unwrap(
        await supabase.from("documents").select("*").order("created_at", { ascending: false }),
      ) as unknown as DocumentRow[],
  });

export const useDocument = (id: string) =>
  useQuery({
    queryKey: ["documents", id],
    queryFn: async () =>
      unwrap(await supabase.from("documents").select("*").eq("id", id).single()) as unknown as DocumentRow,
  });
