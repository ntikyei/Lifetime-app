/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Tab, Match, AppSettings, DiscoveryPreferences } from './types';
import { supabase, supabaseConfigured } from './supabase';
import Auth from './components/Auth';
import ProfileSetup from './components/ProfileSetup';
import Navigation from './components/Navigation';
import Discovery from './components/Discovery';
import Matches from './components/Matches';
import Profile from './components/Profile';
import Chat from './components/Chat';
import SettingsView from './components/Settings';
import PreferencesView from './components/Preferences';
import Likes from './components/Likes';
import { AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

type AppState = 'loading' | 'auth' | 'profileSetup' | 'main';

const DEFAULT_SETTINGS: AppSettings = {
  discoveryPaused: false,
  hideDistance: false,
  readReceipts: true,
  typingIndicators: true,
  notifications: {
    matches: true,
    messages: true,
    likes: true,
  },
};

const DEFAULT_PREFERENCES: DiscoveryPreferences = {
  ageRange: [18, 65],
  genders: ['Everyone'],
  maxDistance: 50,
  race: [],
  religion: [],
  ethnicity: [],
};

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<Tab>('discovery');
  const [activeChat, setActiveChat] = useState<Match | null>(null);
  
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [preferences, setPreferences] = useState<DiscoveryPreferences>(DEFAULT_PREFERENCES);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check initial session on app load
  useEffect(() => {
    if (!supabaseConfigured) {
      setAppState('auth');
      return;
    }

    const resolveProfileState = async (id: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', id)
        .single();

      setAppState(profile ? 'main' : 'profileSetup');
    };

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setAppState('auth');
        return;
      }

      setUserId(session.user.id);
      await resolveProfileState(session.user.id);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUserId(null);
        setAppState('auth');
        return;
      }

      if (event === 'SIGNED_IN') {
        setUserId(session.user.id);
        await resolveProfileState(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = (authUserId: string, hasProfile: boolean) => {
    setUserId(authUserId);
    if (hasProfile) {
      setAppState('main');
    } else {
      setAppState('profileSetup');
    }
  };

  const handleProfileSetupComplete = () => {
    setAppState('main');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setAppState('auth');
  };

  const handleMatch = (match: Match) => {
    setActiveChat(match);
  };

  // Track currentTab in a ref for real-time callback
  const currentTabRef = useRef(currentTab);
  const activeChatRef = useRef(activeChat);
  useEffect(() => { currentTabRef.current = currentTab; }, [currentTab]);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // Real-time subscription for unread messages
  useEffect(() => {
    if (!supabaseConfigured || !userId || appState !== 'main') return;

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: { new: { sender_id: string } }) => {
          // Only count messages from others
          if (payload.new.sender_id === userId) return;
          // If user is currently on matches tab or in a chat, don't count
          if (currentTabRef.current === 'matches' || activeChatRef.current) return;
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, appState]);

  // Loading state
  if (appState === 'loading') {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#f5f5f5] animate-spin" />
      </div>
    );
  }

  // Auth screen
  if (appState === 'auth') {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // Profile setup
  if (appState === 'profileSetup' && userId) {
    return <ProfileSetup userId={userId} onComplete={handleProfileSetupComplete} />;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0a0a0a] text-[#f5f5f5] overflow-hidden font-sans relative">
      <main className="flex-1 overflow-y-auto relative">
        {currentTab === 'discovery' && (
          <Discovery 
            onOpenPreferences={() => setShowPreferences(true)} 
            preferences={preferences}
            isPaused={settings.discoveryPaused}
            currentUserId={userId ?? ''}
          />
        )}
        {currentTab === 'likes' && (
          <Likes onMatch={handleMatch} currentUserId={userId ?? ''} />
        )}
        {currentTab === 'matches' && <Matches onSelectMatch={setActiveChat} currentUserId={userId ?? ''} />}
        {currentTab === 'profile' && (
          <Profile 
            onOpenSettings={() => setShowSettings(true)} 
            preferences={preferences}
            currentUserId={userId ?? ''}
            onLogout={handleLogout}
          />
        )}
      </main>
      
      {!activeChat && !showSettings && !showPreferences && (
        <Navigation currentTab={currentTab} onTabChange={(tab) => { setCurrentTab(tab); if (tab === 'matches') setUnreadCount(0); }} unreadCount={unreadCount} />
      )}

      <AnimatePresence>
        {activeChat && (
          <Chat match={activeChat} onBack={() => setActiveChat(null)} settings={settings} currentUserId={userId ?? ''} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <SettingsView 
            onClose={() => setShowSettings(false)} 
            settings={settings}
            onUpdate={setSettings}
            onLogout={handleLogout}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreferences && (
          <PreferencesView 
            onClose={() => setShowPreferences(false)} 
            preferences={preferences}
            onUpdate={setPreferences}
            currentUserId={userId ?? ''}
          />
        )}
      </AnimatePresence>
    </div>
  );
}





