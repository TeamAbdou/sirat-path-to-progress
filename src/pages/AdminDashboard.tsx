import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { useAdmin } from '@/hooks/useAdmin';
import { motion } from 'framer-motion';
import { Users, TrendingUp, ShieldCheck, Activity, ArrowLeft, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { challenges } from '@/lib/challenges';
import { TranslationKey } from '@/lib/i18n';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Stats {
  totalUsers: number;
  totalProgress: number;
  challengeStats: { id: string; count: number }[];
}

interface ContactMsg {
  id: string;
  name: string;
  email: string;
  message: string;
  ai_validated: boolean;
  ai_reason: string | null;
  created_at: string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--destructive))',
  'hsl(var(--accent))',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(262 83% 58%)',
];

const AdminDashboard = () => {
  const { t, lang } = useApp();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalProgress: 0, challengeStats: [] });
  const [contactMsgs, setContactMsgs] = useState<ContactMsg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchStats = async () => {
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: progressCount } = await supabase
        .from('user_progress')
        .select('*', { count: 'exact', head: true });

      const { data: progressData } = await supabase
        .from('user_progress')
        .select('challenge_id');

      const challengeCounts: Record<string, number> = {};
      progressData?.forEach(p => {
        challengeCounts[p.challenge_id] = (challengeCounts[p.challenge_id] || 0) + 1;
      });

      const challengeStats = challenges.map(c => ({
        id: c.id,
        count: challengeCounts[c.id] || 0,
      }));

      // Fetch contact messages
      const { data: contacts } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      setContactMsgs((contacts as ContactMsg[]) || []);
      setStats({
        totalUsers: userCount || 0,
        totalProgress: progressCount || 0,
        challengeStats,
      });
      setLoading(false);
    };
    fetchStats();
  }, [isAdmin]);

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

  const statCards = [
    { label: lang === 'ar' ? 'عدد المستخدمين' : 'Total Users', value: stats.totalUsers, icon: Users, color: 'from-primary/20 to-primary/5' },
    { label: lang === 'ar' ? 'الحالات النشطة' : 'Active Cases', value: stats.totalProgress, icon: Activity, color: 'from-accent/20 to-accent/5' },
    { label: lang === 'ar' ? 'التحديات المتابعة' : 'Tracked Challenges', value: stats.challengeStats.filter(c => c.count > 0).length, icon: TrendingUp, color: 'from-primary/25 to-primary/10' },
    { label: lang === 'ar' ? 'الحالات المعالجة' : 'Treated Cases', value: stats.totalProgress, icon: ShieldCheck, color: 'from-destructive/20 to-destructive/5' },
  ];

  const barChartData = stats.challengeStats.map(cs => ({
    name: (t[cs.id as TranslationKey] as string) || cs.id,
    count: cs.count,
  }));

  const pieChartData = stats.challengeStats
    .filter(cs => cs.count > 0)
    .map(cs => ({
      name: (t[cs.id as TranslationKey] as string) || cs.id,
      value: cs.count,
    }));

  return (
    <div className="container mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-secondary/80 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-foreground">
          {lang === 'ar' ? 'لوحة التحكم' : 'Admin Dashboard'}
        </h2>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
              <s.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Bar Chart - Challenge Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-2xl p-4 mb-6"
      >
        <h3 className="font-semibold text-foreground mb-4">
          {lang === 'ar' ? 'انتشار المعاصي' : 'Challenge Distribution'}
        </h3>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {barChartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Pie Chart - Proportional View */}
      {pieChartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-2xl p-4 mb-6"
        >
          <h3 className="font-semibold text-foreground mb-4">
            {lang === 'ar' ? 'نسبة كل تحدي' : 'Challenge Proportions'}
          </h3>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieChartData.map((_, index) => (
                    <Cell key={`pie-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Progress Bars */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card border border-border rounded-2xl p-4 mb-6"
      >
        <h3 className="font-semibold text-foreground mb-3">
          {lang === 'ar' ? 'تفاصيل الحالات' : 'Case Details'}
        </h3>
        <div className="space-y-3">
          {stats.challengeStats.map((cs, i) => {
            const challenge = challenges.find(c => c.id === cs.id);
            const maxCount = Math.max(...stats.challengeStats.map(s => s.count), 1);
            const percentage = (cs.count / maxCount) * 100;
            return (
              <div key={cs.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground flex items-center gap-2">
                    {challenge && <challenge.icon className="w-4 h-4 text-primary" />}
                    {t[cs.id as TranslationKey] as string}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{cs.count}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Contact Messages */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-card border border-border rounded-2xl p-4 mb-6"
      >
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          {lang === 'ar' ? 'رسائل التواصل' : 'Contact Messages'} ({contactMsgs.length})
        </h3>
        {contactMsgs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {lang === 'ar' ? 'لا توجد رسائل بعد' : 'No messages yet'}
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {contactMsgs.map(msg => (
              <div key={msg.id} className="p-3 rounded-xl bg-secondary/30 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{msg.name}</span>
                  {msg.ai_validated ? (
                    <CheckCircle className="w-4 h-4 text-primary" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-1">{msg.email}</p>
                <p className="text-sm text-foreground">{msg.message}</p>
                {msg.ai_reason && (
                  <p className="text-xs text-muted-foreground mt-1 italic">AI: {msg.ai_reason}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(msg.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Navigation buttons */}
      <div className="space-y-2 mt-2">
        <button
          onClick={() => navigate('/admin/donations')}
          className="w-full py-3 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm"
        >
          {lang === 'ar' ? 'إدارة التبرعات ومفاتيح الدفع' : 'Manage Donations & Payment Keys'}
        </button>
        <button
          onClick={() => navigate('/admin/security-logs')}
          className="w-full py-3 rounded-2xl bg-secondary border border-border text-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors"
        >
          {lang === 'ar' ? '🛡️ سجلات الأمان' : '🛡️ Security Logs'}
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
