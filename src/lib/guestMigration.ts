import { supabase } from '@/integrations/supabase/client';

const GUEST_MESSAGES_KEY = 'sirat-guest-messages';
const GUEST_COUNT_KEY = 'sirat-guest-msg-count';

interface GuestMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const migrateGuestMessages = async (userId: string) => {
  try {
    const raw = localStorage.getItem(GUEST_MESSAGES_KEY);
    if (!raw) return;

    const messages: GuestMessage[] = JSON.parse(raw);
    if (!messages.length) return;

    const rows = messages.map((m) => ({
      user_id: userId,
      challenge_id: 'general',
      role: m.role,
      content: m.content,
    }));

    await supabase.from('chat_messages').insert(rows);

    // Clean up
    localStorage.removeItem(GUEST_MESSAGES_KEY);
    sessionStorage.removeItem(GUEST_COUNT_KEY);
  } catch (e) {
    console.error('Guest migration failed:', e);
  }
};
