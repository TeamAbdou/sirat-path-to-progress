import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { useAdmin } from '@/hooks/useAdmin';
import { motion } from 'framer-motion';
import {
  ArrowLeft, DollarSign, TrendingUp, Clock, Download, Search,
  Filter, Eye, ChevronDown, CheckCircle, XCircle, Loader2, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Donation {
  id: string;
  user_id: string;
  amount: number;
  currency: string | null;
  status: string | null;
  paypal_order_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  metadata: any;
}

type StatusFilter = 'all' | 'completed' | 'pending' | 'failed';
type SortField = 'created_at' | 'amount';
type SortDir = 'asc' | 'desc';

const AdminDonations = () => {
  const { lang } = useApp();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  // Profiles cache for displaying emails
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const fetchDonations = async (reset = false) => {
    if (!isAdmin) return;
    const currentPage = reset ? 0 : page;

    let query = supabase
      .from('donations')
      .select('*')
      .order(sortField, { ascending: sortDir === 'asc' })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error(error.message);
      return;
    }

    const newDonations = data || [];
    setHasMore(newDonations.length === PAGE_SIZE);

    if (reset || currentPage === 0) {
      setDonations(newDonations);
      setPage(0);
    } else {
      setDonations(prev => [...prev, ...newDonations]);
    }

    // Fetch profile emails for user_ids
    const userIds = [...new Set(newDonations.map(d => d.user_id))];
    const missingIds = userIds.filter(id => !profiles[id]);
    if (missingIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', missingIds);
      if (profileData) {
        const newProfiles: Record<string, string> = {};
        profileData.forEach(p => {
          newProfiles[p.id] = p.display_name || p.id.slice(0, 8);
        });
        setProfiles(prev => ({ ...prev, ...newProfiles }));
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      fetchDonations(true);
    }
  }, [isAdmin, statusFilter, sortField, sortDir]);

  // Realtime updates
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel('admin-donations-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => {
        fetchDonations(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  // Stats
  const stats = useMemo(() => {
    const completed = donations.filter(d => d.status === 'completed');
    const total = completed.reduce((sum, d) => sum + d.amount, 0);
    const avg = completed.length > 0 ? total / completed.length : 0;
    const last = donations[0];
    return {
      totalAmount: total,
      totalCount: completed.length,
      avgAmount: avg,
      pendingCount: donations.filter(d => d.status === 'pending').length,
      lastDonation: last,
    };
  }, [donations]);

  // Filtered by search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return donations;
    const q = searchQuery.toLowerCase();
    return donations.filter(d =>
      d.paypal_order_id?.toLowerCase().includes(q) ||
      d.user_id.toLowerCase().includes(q) ||
      profiles[d.user_id]?.toLowerCase().includes(q) ||
      String(d.amount).includes(q)
    );
  }, [donations, searchQuery, profiles]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('donations').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(lang === 'ar' ? 'تم التحديث' : 'Updated');
      setSelectedDonation(null);
      fetchDonations(true);
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'User', 'Amount', 'Currency', 'Status', 'PayPal Order', 'Date'];
    const rows = filtered.map(d => [
      d.id,
      profiles[d.user_id] || d.user_id.slice(0, 8),
      d.amount,
      d.currency || 'USD',
      d.status || 'pending',
      d.paypal_order_id || '',
      d.created_at ? new Date(d.created_at).toLocaleString() : '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusIcon = (status: string | null) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" />;
      case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-[hsl(var(--warning))]" />;
    }
  };

  const statusLabel = (status: string | null) => {
    const s = status || 'pending';
    if (lang === 'ar') {
      return { completed: 'مكتمل', pending: 'قيد الانتظار', failed: 'فشل' }[s] || s;
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

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
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 rounded-xl hover:bg-secondary/80 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-foreground flex-1">
          {lang === 'ar' ? 'لوحة تحكم التبرعات' : 'Donations Dashboard'}
        </h2>
        <button onClick={exportCSV} className="p-2 rounded-xl hover:bg-secondary/80 text-muted-foreground" title="Export CSV">
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          {
            label: lang === 'ar' ? 'إجمالي التبرعات' : 'Total Donations',
            value: `$${stats.totalAmount.toFixed(2)}`,
            icon: DollarSign,
            color: 'from-primary/20 to-primary/5',
          },
          {
            label: lang === 'ar' ? 'عدد التبرعات' : 'Completed',
            value: stats.totalCount,
            icon: CheckCircle,
            color: 'from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5',
          },
          {
            label: lang === 'ar' ? 'المتوسط' : 'Average',
            value: `$${stats.avgAmount.toFixed(2)}`,
            icon: TrendingUp,
            color: 'from-accent/20 to-accent/5',
          },
          {
            label: lang === 'ar' ? 'قيد الانتظار' : 'Pending',
            value: stats.pendingCount,
            icon: Clock,
            color: 'from-[hsl(var(--warning))]/20 to-[hsl(var(--warning))]/5',
          },
        ].map((s, i) => (
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

      {/* Last donation */}
      {stats.lastDonation && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-6">
          <p className="text-xs text-muted-foreground mb-1">
            {lang === 'ar' ? 'آخر تبرع' : 'Latest Donation'}
          </p>
          <p className="text-foreground font-semibold">
            ${stats.lastDonation.amount} — {statusLabel(stats.lastDonation.status)}
            <span className="text-xs text-muted-foreground ms-2">
              {stats.lastDonation.created_at && new Date(stats.lastDonation.created_at).toLocaleString()}
            </span>
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
            className="w-full ps-9 pe-3 py-2.5 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2.5 bg-secondary border border-border rounded-xl text-foreground text-sm outline-none"
        >
          <option value="all">{lang === 'ar' ? 'الكل' : 'All'}</option>
          <option value="completed">{lang === 'ar' ? 'مكتمل' : 'Completed'}</option>
          <option value="pending">{lang === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
          <option value="failed">{lang === 'ar' ? 'فشل' : 'Failed'}</option>
        </select>
        <select
          value={`${sortField}-${sortDir}`}
          onChange={e => {
            const [f, d] = e.target.value.split('-') as [SortField, SortDir];
            setSortField(f);
            setSortDir(d);
          }}
          className="px-3 py-2.5 bg-secondary border border-border rounded-xl text-foreground text-sm outline-none"
        >
          <option value="created_at-desc">{lang === 'ar' ? 'الأحدث' : 'Newest'}</option>
          <option value="created_at-asc">{lang === 'ar' ? 'الأقدم' : 'Oldest'}</option>
          <option value="amount-desc">{lang === 'ar' ? 'الأعلى' : 'Highest'}</option>
          <option value="amount-asc">{lang === 'ar' ? 'الأقل' : 'Lowest'}</option>
        </select>
      </div>

      {/* Donations list */}
      <div className="space-y-2 mb-6">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">{lang === 'ar' ? 'لا توجد تبرعات' : 'No donations found'}</p>
          </div>
        ) : (
          filtered.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedDonation(d)}
              className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {statusIcon(d.status)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {profiles[d.user_id] || d.user_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.created_at && new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-end flex-shrink-0">
                  <p className="font-bold text-foreground">${d.amount}</p>
                  <p className="text-xs text-muted-foreground">{statusLabel(d.status)}</p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Load more */}
      {hasMore && filtered.length > 0 && (
        <button
          onClick={() => { setPage(p => p + 1); setTimeout(() => fetchDonations(), 0); }}
          className="w-full py-3 rounded-2xl bg-secondary border border-border text-foreground font-medium text-sm hover:bg-secondary/80 transition-colors"
        >
          {lang === 'ar' ? 'تحميل المزيد' : 'Load More'}
        </button>
      )}

      {/* Detail Modal */}
      {selectedDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setSelectedDonation(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-lg"
          >
            <h3 className="font-bold text-foreground text-lg mb-4">
              {lang === 'ar' ? 'تفاصيل التبرع' : 'Donation Details'}
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{lang === 'ar' ? 'المستخدم' : 'User'}</span>
                <span className="text-foreground font-medium">{profiles[selectedDonation.user_id] || selectedDonation.user_id.slice(0, 12)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{lang === 'ar' ? 'المبلغ' : 'Amount'}</span>
                <span className="text-foreground font-bold">${selectedDonation.amount} {selectedDonation.currency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{lang === 'ar' ? 'الحالة' : 'Status'}</span>
                <span className="flex items-center gap-1 text-foreground">
                  {statusIcon(selectedDonation.status)}
                  {statusLabel(selectedDonation.status)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PayPal ID</span>
                <span className="text-foreground text-xs font-mono" dir="ltr">{selectedDonation.paypal_order_id || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                <span className="text-foreground">{selectedDonation.created_at && new Date(selectedDonation.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-2">
              {selectedDonation.status !== 'completed' && (
                <button
                  onClick={() => handleUpdateStatus(selectedDonation.id, 'completed')}
                  className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium"
                >
                  {lang === 'ar' ? '✅ تعيين كمكتمل' : '✅ Mark Completed'}
                </button>
              )}
              {selectedDonation.status === 'failed' && (
                <button
                  onClick={() => handleUpdateStatus(selectedDonation.id, 'pending')}
                  className="w-full py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4 inline me-1" />
                  {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                </button>
              )}
              <button
                onClick={() => setSelectedDonation(null)}
                className="w-full py-2.5 rounded-xl bg-secondary border border-border text-muted-foreground text-sm"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDonations;
