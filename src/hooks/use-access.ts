import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { ALWAYS_ALLOWED, type ModuleKey } from "@/lib/access";

export type AccessInfo = {
  userId: string | null;
  role: "master" | "staff";
  modules: ModuleKey[];
};

export function useAccess() {
  const query = useQuery({
    queryKey: ["access"],
    staleTime: 60_000,
    queryFn: async (): Promise<AccessInfo> => {
      const { data, error } = await supabase.rpc("bootstrap_current_user");
      if (error) throw error;
      const raw = (data ?? {}) as {
        user_id?: string;
        role?: "master" | "staff";
        modules?: string[];
      };
      return {
        userId: raw.user_id ?? null,
        role: raw.role === "master" ? "master" : "staff",
        modules: (raw.modules ?? []) as ModuleKey[],
      };
    },
  });

  const access = query.data;
  const isMaster = access?.role === "master";

  function can(module: ModuleKey) {
    if (!access) return false;
    if (isMaster) return true;
    if (ALWAYS_ALLOWED.includes(module)) return true;
    return access.modules.includes(module);
  }

  return { ...query, access, isMaster, can };
}
