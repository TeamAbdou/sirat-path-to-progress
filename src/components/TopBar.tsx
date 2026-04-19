import { useApp } from '@/contexts/AppContext';
import { Moon, Sun, Bell, BellOff } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { motion } from 'framer-motion';
import appIcon from '@/assets/hero-illustration.png';

const TopBar = () => {
  const { theme, toggleTheme, t } = useApp();
  const { isEnabled, toggleNotifications } = useNotifications();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/85 border-b border-border/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl overflow-hidden ring-1 ring-border/40">
            <img src={appIcon} alt="Sirat" className="w-full h-full object-cover" />
          </div>
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg font-bold text-gradient"
          >
            {t.appName}
          </motion.h1>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleNotifications}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
            title={isEnabled ? t.notificationsOn : t.notificationsOff}
          >
            {isEnabled ? <Bell className="w-[18px] h-[18px]" /> : <BellOff className="w-[18px] h-[18px]" />}
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
          >
            {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
