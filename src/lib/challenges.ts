import { ShieldOff, Hand, Cigarette, Pill, AlertTriangle, Heart } from 'lucide-react';

export type ChallengeId = 'pornography' | 'masturbation' | 'smoking' | 'drugs' | 'harassment' | 'notPraying';

export const challenges: { id: ChallengeId; icon: typeof ShieldOff; color: string }[] = [
  { id: 'pornography', icon: ShieldOff, color: 'from-destructive/20 to-destructive/5' },
  { id: 'masturbation', icon: Hand, color: 'from-accent/20 to-accent/5' },
  { id: 'smoking', icon: Cigarette, color: 'from-accent/25 to-accent/10' },
  { id: 'drugs', icon: Pill, color: 'from-primary/20 to-primary/5' },
  { id: 'harassment', icon: AlertTriangle, color: 'from-destructive/15 to-destructive/5' },
  { id: 'notPraying', icon: Heart, color: 'from-primary/25 to-primary/10' },
];
