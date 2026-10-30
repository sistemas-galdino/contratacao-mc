import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}

/** Ensures the signed-in user is linked to a company and returns it. */
export function useCompany(enabled: boolean) {
  return useQuery({
    queryKey: ["company"],
    enabled,
    queryFn: async () => {
      const { data: companyId, error } = await supabase.rpc("bootstrap_current_user", {});
      if (error) throw error;
      const { data, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId as string)
        .single();
      if (companyError) throw companyError;
      return data;
    },
  });
}
