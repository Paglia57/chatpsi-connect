import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const POLL_INTERVAL = 30000; // 30 seconds

const ReferralNotificationPoller = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, message')
        .eq('user_id', user.id)
        .eq('type', 'referral_reward')
        .eq('seen', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !data || data.length === 0) return;

      for (const notification of data) {
        toast({
          title: '🎉 Prêmio de Indicação!',
          description: notification.message,
          duration: 8000,
        });

        // Mark as seen
        await supabase
          .from('notifications')
          .update({ seen: true })
          .eq('id', notification.id);
      }
    } catch (err) {
      // Silent fail for polling
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;

    // Initial check
    checkNotifications();

    intervalRef.current = setInterval(checkNotifications, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, checkNotifications]);

  return null; // Renderless component
};

export default ReferralNotificationPoller;
