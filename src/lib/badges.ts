export interface Badge {
  id: string;
  title: { ar: string; en: string };
  shortLabel: { ar: string; en: string };
  criteria: { ar: string; en: string };
  reward: { ar: string; en: string };
  icon: string;
  points: number;
}

export const BADGES: Badge[] = [
  {
    id: 'badge_day1',
    title: { ar: 'بداية قوية', en: 'Strong Start' },
    shortLabel: { ar: 'يوم واحد', en: '1 Day' },
    criteria: { ar: 'أول يوم بدون انتكاسة', en: 'First day without relapse' },
    reward: { ar: '10 نقاط', en: '10 points' },
    icon: '🌟',
    points: 10,
  },
  {
    id: 'badge_5steps',
    title: { ar: 'خمس خطوات', en: 'Five Steps' },
    shortLabel: { ar: '5 خطوات', en: '5 Steps' },
    criteria: { ar: 'تطبيق قاعدة الخمس دقائق خمس مرات', en: 'Apply the 5-minute rule 5 times' },
    reward: { ar: '15 نقاط', en: '15 points' },
    icon: '🏅',
    points: 15,
  },
  {
    id: 'badge_week_stable',
    title: { ar: 'أسبوع ثابت', en: 'Stable Week' },
    shortLabel: { ar: 'أسبوع', en: 'Week' },
    criteria: { ar: 'أسبوع كامل من الالتزام', en: 'Full week of commitment' },
    reward: { ar: '30 نقاط', en: '30 points' },
    icon: '📅',
    points: 30,
  },
  {
    id: 'badge_7days_purity',
    title: { ar: 'سبعة أيام نقاء', en: 'Seven Days of Purity' },
    shortLabel: { ar: '7 أيام', en: '7 Days' },
    criteria: { ar: '7 أيام متتالية بدون انتكاسة', en: '7 consecutive days without relapse' },
    reward: { ar: '50 نقاط', en: '50 points' },
    icon: '✨',
    points: 50,
  },
  {
    id: 'badge_boundary_guard',
    title: { ar: 'حارس الحدود', en: 'Boundary Guard' },
    shortLabel: { ar: 'رفض ناجح', en: 'Successful Refusal' },
    criteria: { ar: 'رفض عرض ضاغط أمام الأصدقاء بنجاح', en: 'Successfully refused peer pressure' },
    reward: { ar: '35 نقاط', en: '35 points' },
    icon: '🛡️',
    points: 35,
  },
  {
    id: 'badge_return_spiritual',
    title: { ar: 'عودة روحية', en: 'Spiritual Return' },
    shortLabel: { ar: 'عودة', en: 'Return' },
    criteria: { ar: 'أسبوع من الالتزام بالصلاة', en: 'A week of consistent prayer' },
    reward: { ar: '30 نقاط', en: '30 points' },
    icon: '🕌',
    points: 30,
  },
  {
    id: 'badge_month_purity',
    title: { ar: 'شهر من النقاء', en: 'Month of Purity' },
    shortLabel: { ar: '30 يوم', en: '30 Days' },
    criteria: { ar: '30 يوماً متتالية بدون انتكاسة كبيرة', en: '30 consecutive days without major relapse' },
    reward: { ar: '200 نقاط', en: '200 points' },
    icon: '🏆',
    points: 200,
  },
];
