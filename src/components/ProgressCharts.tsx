import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { listEntries, todayKey, type DailyEntryView } from '@/lib/localdb/repository';
import { useApp } from '@/contexts/AppContext';

interface Props {
  challengeId: string;
}

const addDays = (key: string, delta: number): string => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const ProgressCharts = ({ challengeId }: Props) => {
  const { lang } = useApp();
  const isAr = lang === 'ar';
  const [entries, setEntries] = useState<DailyEntryView[]>([]);

  useEffect(() => {
    const today = todayKey();
    const from = addDays(today, -30);
    listEntries(challengeId, from, today).then(setEntries);
  }, [challengeId]);

  const today = todayKey();
  const byDate = new Map(entries.map(e => [e.date, e]));

  // Last 7 days bar data
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, -(6 - i));
    const e = byDate.get(d);
    const label = d.slice(5); // MM-DD
    return {
      date: label,
      value: e ? 1 : 0,
      status: e?.status ?? 'none',
    };
  });

  // 30-day cumulative streak (running streak per day)
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(today, -(29 - i)));
  let running = 0;
  const streakSeries = last30.map(d => {
    const e = byDate.get(d);
    if (e?.status === 'clean') running += 1;
    else if (e?.status === 'relapse') running = 0;
    // missing day breaks streak
    else running = 0;
    return { date: d.slice(5), streak: running };
  });

  // Donut: clean % over last 30 recorded days
  const recorded30 = last30.map(d => byDate.get(d)).filter(Boolean) as DailyEntryView[];
  const cleanCount = recorded30.filter(e => e.status === 'clean').length;
  const relapseCount = recorded30.length - cleanCount;
  const donutData = [
    { name: isAr ? 'نظيف' : 'Clean', value: cleanCount, color: 'hsl(var(--primary))' },
    { name: isAr ? 'انتكاسة' : 'Relapse', value: relapseCount, color: 'hsl(var(--destructive))' },
  ];
  const purityPct = recorded30.length ? Math.round((cleanCount / recorded30.length) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto mt-6 space-y-4"
    >
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {isAr ? 'آخر 7 أيام' : 'Last 7 days'}
        </h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis hide domain={[0, 1]} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(_v, _n, p) => [p.payload.status, isAr ? 'الحالة' : 'Status']}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {last7.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.status === 'clean'
                        ? 'hsl(var(--primary))'
                        : d.status === 'relapse'
                          ? 'hsl(var(--destructive))'
                          : 'hsl(var(--muted))'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {isAr ? 'تطور السلسلة (30 يوم)' : 'Streak trend (30 days)'}
        </h3>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={streakSeries}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="streak"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {isAr ? 'نسبة النقاء (30 يوم)' : 'Purity rate (30 days)'}
        </h3>
        <div className="h-36 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData.every(d => d.value === 0) ? [{ name: '_', value: 1, color: 'hsl(var(--muted))' }] : donutData}
                innerRadius={40}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {(donutData.every(d => d.value === 0) ? [{ color: 'hsl(var(--muted))' }] : donutData).map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-foreground">{purityPct}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProgressCharts;
