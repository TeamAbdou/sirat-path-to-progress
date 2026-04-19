import { supabase } from '@/integrations/supabase/client';

export type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'signup'
  | 'password_reset_request'
  | 'password_changed'
  | 'oauth_login'
  | 'admin_settings_changed'
  | 'suspicious_activity'
  | 'rate_limit_exceeded';

interface LogSecurityEventParams {
  eventType: SecurityEventType;
  description?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
}

export const logSecurityEvent = async ({
  eventType,
  description,
  metadata = {},
}: LogSecurityEventParams) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; // Can't log without auth

    await supabase.functions.invoke('log-security-event', {
      body: {
        eventType,
        description: description || eventType,
        metadata,
        userAgent: navigator.userAgent,
      },
    });
  } catch (err) {
    console.error('Failed to log security event:', err);
  }
};
