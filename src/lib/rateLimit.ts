import { supabase } from '@/integrations/supabase/client';

/**
 * Rate limiter utility for client-side rate limit checks.
 * Communicates with the check-rate-limit edge function.
 */

export const checkRateLimit = async (
  identifier: string,
  attemptType: 'login' | 'otp' | 'password_reset'
): Promise<{ allowed: boolean; remainingMinutes: number }> => {
  try {
    const { data, error } = await supabase.functions.invoke('check-rate-limit', {
      body: { identifier, attemptType, action: 'check' },
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: true, remainingMinutes: 0 }; // Fail open to not block users
    }

    return data;
  } catch {
    return { allowed: true, remainingMinutes: 0 };
  }
};

export const recordFailedAttempt = async (
  identifier: string,
  attemptType: 'login' | 'otp' | 'password_reset'
): Promise<void> => {
  try {
    await supabase.functions.invoke('check-rate-limit', {
      body: { identifier, attemptType, action: 'record' },
    });
  } catch {
    console.error('Failed to record rate limit attempt');
  }
};
