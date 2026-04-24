import { useApp } from '@/contexts/AppContext';
import { Home, MessageCircle, TrendingUp, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const BottomNav = () => {
  const { t } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/', label: t.home, icon: Home },
    { path: '/chat', label: t.chat, icon: MessageCircle },
    { path: '/progress', label: t.progress, icon: TrendingUp },
    { path: '/settings', label: t.settings, icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/90 border-t border-border/60">
      <div className="container mx-auto px-2 flex items-center justify-around h-16">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path ||
            (tab.path === '/chat' && location.pathname.startsWith('/chat'));
          return (
            <motion.button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="relative flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-2xl transition-all"
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -top-1 w-8 h-1 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon className={`w-5 h-5 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <span className={`text-[10px] font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
