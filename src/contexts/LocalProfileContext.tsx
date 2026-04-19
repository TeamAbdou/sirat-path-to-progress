import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getOrCreateProfileId } from '@/lib/localdb/repository';

interface LocalProfileCtx {
  profileId: string | null;
  ready: boolean;
}

const Ctx = createContext<LocalProfileCtx>({ profileId: null, ready: false });

export const LocalProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getOrCreateProfileId()
      .then(id => {
        setProfileId(id);
        setReady(true);
      })
      .catch(err => {
        console.error('Failed to init local profile', err);
        setReady(true); // unblock UI so user sees an error rather than spinner
      });
  }, []);

  return <Ctx.Provider value={{ profileId, ready }}>{children}</Ctx.Provider>;
};

export const useLocalProfile = () => useContext(Ctx);
