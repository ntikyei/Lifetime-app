import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Send, Reply, Smile, Check, CheckCheck, X, MoreHorizontal, Loader2 } from 'lucide-react';
import { Match, Message, AppSettings } from '../types';
import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/** Format a date for time-separator labels */
function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Format a timestamp for inline display */
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  match: Match;
  onBack: () => void;
  settings: AppSettings;
  currentUserId: string;
}

interface MessageRow {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export default function Chat({ match, onBack, settings, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Convert a DB row into a Message object
  const rowToMessage = (row: MessageRow): Message => ({
    id: row.id,
    senderId: row.sender_id,
    type: 'text',
    content: row.body,
    reactions: [],
    status: 'delivered',
    createdAt: row.created_at,
  });

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', match.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages((data as MessageRow[]).map(rowToMessage));
      }
      setLoading(false);
    };

    fetchMessages();
  }, [match.id]);

  // Subscribe to real-time messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          const newRow = payload.new as MessageRow;
          setMessages((prev) => {
            // Avoid duplicates (we may have already optimistically added it)
            if (prev.some((m) => m.id === newRow.id)) return prev;
            return [...prev, rowToMessage(newRow)];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [match.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    
    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();
    const body = inputText.trim();

    // Optimistic insert
    const optimisticMsg: Message = {
      id: tempId,
      senderId: currentUserId,
      type: 'text',
      content: body,
      reactions: [],
      status: 'sending',
      createdAt: now,
      replyTo: replyingTo ? { id: replyingTo.id, content: replyingTo.content, type: replyingTo.type } : undefined,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setReplyingTo(null);

    // Insert into Supabase
    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id: match.id,
        sender_id: currentUserId,
        body,
      })
      .select()
      .single();

    if (error) {
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' as const } : m))
      );
    } else if (data) {
      // Replace temp message with real one
      const realRow = data as MessageRow;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...rowToMessage(realRow), replyTo: optimisticMsg.replyTo } : m
        )
      );
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const hasReacted = m.reactions.some(r => r.userId === currentUserId && r.emoji === emoji);
        if (hasReacted) {
          return { ...m, reactions: m.reactions.filter(r => !(r.userId === currentUserId && r.emoji === emoji)) };
        } else {
          return { ...m, reactions: [...m.reactions, { emoji, userId: currentUserId }] };
        }
      }
      return m;
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="absolute inset-0 z-50 bg-[#0a0a0a] flex flex-col font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#171717] bg-[#0a0a0a]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
            <ChevronLeft size={24} strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-3">
            <img 
              src={match.user.photos[0]?.url ?? ''} 
              alt={match.user.name} 
              className="w-10 h-10 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="text-[#f5f5f5] font-medium">{match.user.name}</h2>
              <p className="text-xs text-[#737373] font-light">{match.user.location || ''}</p>
            </div>
          </div>
        </div>
        <button className="p-2 -mr-2 text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
          <MoreHorizontal size={24} strokeWidth={1.5} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-[#737373]" />
          </div>
        ) : (
          <>
            <div className="text-center py-6">
              <p className="text-xs text-[#737373] font-light uppercase tracking-widest">Start of conversation</p>
            </div>

            {messages.map((msg, idx) => {
              const isMe = msg.senderId === currentUserId;
              const showReadReceipt = isMe && idx === messages.length - 1;

              // Show date separator when the day changes
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const currentDay = new Date(msg.createdAt).toDateString();
              const prevDay = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;
              const showDateSep = currentDay !== prevDay;

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="text-center py-3">
                      <span className="text-[10px] text-[#525252] font-medium uppercase tracking-widest bg-[#0a0a0a] px-3">
                        {formatDateLabel(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg`}>
                  
                  {/* Interaction Context (First Message) */}
                  {msg.context && (
                    <div className={`mb-2 max-w-[85%] bg-[#171717] border border-[#262626] rounded-xl p-3 ${isMe ? 'mr-2' : 'ml-2'}`}>
                      <p className="text-[10px] font-medium text-[#737373] uppercase tracking-widest mb-1.5">
                        Liked {msg.context.type}
                      </p>
                      {msg.context.type === 'photo' && msg.context.contentUrl && (
                        <img src={msg.context.contentUrl} alt="Liked content" className="w-16 h-16 rounded-lg object-cover mb-2" />
                      )}
                      {msg.context.text && (
                        <p className="text-sm text-[#d4d4d4] font-serif italic">"{msg.context.text}"</p>
                      )}
                    </div>
                  )}

                  {/* Reply Context */}
                  {msg.replyTo && (
                    <div className={`flex items-center gap-2 mb-1 opacity-70 text-xs ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Reply size={12} className="text-[#737373]" />
                      <span className="text-[#a3a3a3] truncate max-w-[200px]">
                        {msg.replyTo.content}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div 
                    className={`relative group max-w-[75%] rounded-2xl px-4 py-3 ${
                      isMe 
                        ? 'bg-[#262626] text-[#f5f5f5] rounded-tr-sm' 
                        : 'bg-[#171717] text-[#e5e5e5] border border-[#262626] rounded-tl-sm'
                    }`}
                    onDoubleClick={() => setReplyingTo(msg)}
                  >
                    <p className="font-light leading-relaxed">{msg.content}</p>

                    {/* Reactions */}
                    {msg.reactions.length > 0 && (
                      <div className={`absolute -bottom-3 ${isMe ? '-left-2' : '-right-2'} bg-[#171717] border border-[#262626] rounded-full px-2 py-0.5 text-sm shadow-lg`}>
                        {msg.reactions.map((r, i) => <span key={i}>{r.emoji}</span>)}
                      </div>
                    )}

                    {/* Quick Actions (Hover/Focus) */}
                    <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-16' : '-right-16'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-2`}>
                      <button onClick={() => handleReaction(msg.id, '❤️')} className="p-1.5 bg-[#171717] rounded-full text-[#a3a3a3] hover:text-[#f5f5f5]">
                        <Smile size={14} />
                      </button>
                      <button onClick={() => setReplyingTo(msg)} className="p-1.5 bg-[#171717] rounded-full text-[#a3a3a3] hover:text-[#f5f5f5]">
                        <Reply size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Read Receipt */}
                  {showReadReceipt && (
                    <div className="mt-1 flex items-center gap-1 text-[#737373]">
                      {msg.status === 'read' && settings.readReceipts ? (
                        <CheckCheck size={14} className="text-[#a3a3a3]" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck size={14} />
                      ) : msg.status === 'sent' ? (
                        <Check size={14} />
                      ) : msg.status === 'sending' ? (
                        <div className="w-3 h-3 rounded-full border border-[#737373] border-t-transparent animate-spin" />
                      ) : null}
                    </div>
                  )}

                  {/* Inline timestamp (on hover) */}
                  <span className="text-[10px] text-[#525252] font-light mt-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity select-none">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#0a0a0a] border-t border-[#171717]">
        <AnimatePresence>
          {replyingTo && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 px-4 py-2 bg-[#171717] rounded-xl border border-[#262626] flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="text-xs text-[#a3a3a3] font-medium mb-1">Replying to {replyingTo.senderId === currentUserId ? 'yourself' : match.user.name}</span>
                <span className="text-sm text-[#737373] truncate max-w-[250px]">
                  {replyingTo.content}
                </span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-[#737373] hover:text-[#f5f5f5]">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          <div className="flex-1 bg-[#171717] border border-[#262626] rounded-3xl flex items-center px-4 py-1 min-h-[48px]">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              placeholder="Message..."
              className="flex-1 bg-transparent border-none outline-none text-[#f5f5f5] font-light placeholder:text-[#737373] py-2"
            />
          </div>
          
          <button 
            onClick={handleSendText}
            disabled={!inputText.trim()}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform shrink-0 ${
              inputText.trim() ? 'bg-[#f5f5f5] text-[#0a0a0a] hover:scale-105' : 'bg-[#262626] text-[#737373]'
            }`}
          >
            <Send size={20} className={inputText.trim() ? 'ml-1' : ''} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
