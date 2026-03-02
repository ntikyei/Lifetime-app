import { Infinity, Heart, MessageCircle, User } from 'lucide-react';
import { Tab } from '../types';

interface Props {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  unreadCount?: number;
}

export default function Navigation({ currentTab, onTabChange, unreadCount = 0 }: Props) {
  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'discovery', icon: <Infinity size={22} strokeWidth={1.5} />, label: 'Discover' },
    { id: 'likes', icon: <Heart size={22} strokeWidth={1.5} />, label: 'Likes' },
    { id: 'matches', icon: <MessageCircle size={22} strokeWidth={1.5} />, label: 'Matches' },
    { id: 'profile', icon: <User size={22} strokeWidth={1.5} />, label: 'Profile' },
  ];

  return (
    <nav className="bg-[#0a0a0a] border-t border-[#171717] pb-safe">
      <div className="flex justify-around items-center h-16 px-4">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const showBadge = tab.id === 'matches' && unreadCount > 0;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-[#f5f5f5]' : 'text-[#525252] hover:text-[#a3a3a3]'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {showBadge && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 flex items-center justify-center bg-[#f5f5f5] text-[#0a0a0a] text-[9px] font-bold rounded-full px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}


