import { z } from 'zod';

/**
 * Strong password validation schema.
 * Requirements: 12+ chars, uppercase, lowercase, digit, special character.
 */
export const strongPasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

export const getPasswordStrength = (password: string): {
  score: number; // 0-4
  label: string;
  color: string;
} => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = [
    'hsl(var(--destructive))',
    'hsl(38 92% 50%)',
    'hsl(38 92% 50%)',
    'hsl(142 71% 45%)',
    'hsl(142 71% 45%)',
  ];

  return { score, label: labels[score], color: colors[score] };
};

export const getPasswordStrengthAr = (label: string): string => {
  const map: Record<string, string> = {
    'Very Weak': 'ضعيفة جداً',
    'Weak': 'ضعيفة',
    'Fair': 'متوسطة',
    'Strong': 'قوية',
    'Very Strong': 'قوية جداً',
  };
  return map[label] || label;
};
