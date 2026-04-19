import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { useAdmin } from '@/hooks/useAdmin';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, AlertTriangle, LogIn, KeyRound, UserX, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SecurityLog {
  id: string;
  user_id: string | null;
  event_type: string;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const EVENT_ICONS: Record<string, typeof Shield> = {
  login_success: LogIn,
  login_failed: UserX,
  rate_limit_exceeded: AlertTriangle,
  admin_settings_changed: KeyRound,
  password_changed: KeyRound,
  default: Shield,
};

const EVENT_COLORS: Record<string, string> = {
  login_success: 'text-primary',
  login_failed: 'text-destructive',
  rate_limit_exceeded: 'text-destructive',
  suspicious_activity: 'text-destructive',
  admin_settings_changed: 'text-accent',
  large_donation: 'text-accent',
  default: 'text-muted-foreground',
};

const AdminSecurityLogs = () => {
  const { lang } = useApp();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const eventTypes = [
    'all',
    'login_success',
    'login_failed',
    'signup',
    'logout',
    'rate_limit_exceeded',
    'admin_settings_changed',
    'password_changed',
    'large_donation',
    'paypal_webhook',
    'suspicious_activity',
  ];

  useEffect(() => {
    if (!isAdmin) return;
    const fetchLogs = async () => {
      let query = supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('event_type', filter);
      }

      const { data } = await query;
      setLogs((data as SecurityLog[]) || []);
      setLoading(false);
    };
    fetchLogs();
  }, [isAdmin, filter]);

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive font-semibold">⛔ Access Denied</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 rounded-xl hover:bg-secondary/80 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-foreground">
          {lang === 'ar' ? 'سجلات الأمان' : 'Security Logs'}
        </h2>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        {eventTypes.map(type => (
          <button
            key={type}
            onClick={() => { setFilter(type); setLoading(true); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
              filter === type
                ? 'gradient-primary text-primary-foreground border-transparent'
                : 'bg-secondary text-muted-foreground border-border hover:border-primary/30'
            }`}
          >
            {type === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : type.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: lang === 'ar' ? 'إجمالي' : 'Total', value: logs.length },
          { label: lang === 'ar' ? 'فشل تسجيل' : 'Failed', value: logs.filter(l => l.event_type === 'login_failed').length },
          { label: lang === 'ar' ? 'تقييد' : 'Rate Limited', value: logs.filter(l => l.event_type === 'rate_limit_exceeded').length },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Logs List */}
      {logs.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {lang === 'ar' ? 'لا توجد سجلات أمنية' : 'No security logs found'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => {
            const Icon = EVENT_ICONS[log.event_type] || EVENT_ICONS.default;
            const color = EVENT_COLORS[log.event_type] || EVENT_COLORS.default;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="bg-card border border-border rounded-xl p-3"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-medium text-foreground">
                        {log.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{log.description}</p>
                    )}
                    {log.user_agent && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5 truncate font-mono">
                        {log.user_agent.substring(0, 80)}...
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSecurityLogs;
