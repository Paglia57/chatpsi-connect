import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

type TrialTable = "evolutions" | "marketing_texts" | "plano_chat_history" | "artigos_chat_history";

export function useTrialLimit(table: TrialTable, limit: number) {
  const { user, profile } = useAuth();
  const [usageCount, setUsageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const isSubscribed = profile?.subscription_active === true;

  const fetchCount = useCallback(async () => {
    if (!user || isSubscribed) {
      setIsLoading(false);
      return;
    }

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth);

      if (error) throw error;
      setUsageCount(count || 0);
    } catch (err) {
      console.error(`Error fetching trial count for ${table}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [user, table, isSubscribed]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return {
    usageCount,
    limit,
    hasReachedLimit: !isSubscribed && usageCount >= limit,
    isLoading,
    isSubscribed,
    refetch: fetchCount,
  };
}
