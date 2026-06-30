import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Send, CheckCircle, XCircle, RefreshCw, AlertCircle, Image as ImageIcon, Trash2 } from 'lucide-react';

type ChatMessage = { id: string; sender: 'user' | 'agent'; text: string; imageUrl?: string; timestamp: string; };
type ChatSession = { id: string; name?: string; surname?: string; containerNo?: string; isBanned: boolean; messages: ChatMessage[]; lastActive: string; };

export function AdminChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const fetchSessions = async () => {
    try {
      const data = await api.get(`/chat/sessions`);
      setSessions(data);
    } catch (e) {
      // Ignore polling errors
    }
  };

  useEffect(() => {
    fetchSessions();
    const int = setInterval(fetchSessions, 5000); // 5 seconds polling
    
    return () => {
      clearInterval(int);
    };
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.messages?.length, activeSessionId]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      shouldAutoScroll.current = isAtBottom;
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !activeSessionId) return;
    try {
      await api.post(`/chat/message`, { id: activeSessionId, text, sender: 'agent' });
      setText('');
      shouldAutoScroll.current = true;
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnban = async (id: string) => {
    try {
      await api.post(`/chat/unban`, { id });
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await api.delete(`/chat/session/${id}`);
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAllSessions = async () => {
    try {
      await api.delete(`/chat/sessions`);
      setActiveSessionId(null);
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-[600px] bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 dark:text-white">Aktif Sohbetler</h3>
          <div className="flex items-center gap-1">
            <button onClick={fetchSessions} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center justify-center" title="Yenile"><RefreshCw className="w-5 h-5" /></button>
            {sessions.length > 0 && (
              <button onClick={handleDeleteAllSessions} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg font-semibold text-xs transition-colors" title="Tümünü Sil"><Trash2 className="w-4 h-4" /> Tümünü Sil</button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {sessions.map(s => (
            <div
              key={s.id}
              className={`w-full text-left p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between ${activeSessionId === s.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600' : ''}`}
            >
              <div 
                className="flex-1 cursor-pointer" 
                onClick={() => setActiveSessionId(s.id)}
              >
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  {s.name ? `${s.name} ${s.surname} (${s.containerNo || '?'})` : `Kullanıcı: ${s.id.substring(0,6)}`}
                </p>
                <p className="text-xs text-slate-500 truncate max-w-[150px]">
                  {s.messages.length > 0 ? s.messages[s.messages.length - 1].text || 'Fotoğraf' : 'Mesaj yok'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {s.isBanned && <AlertCircle className="w-4 h-4 text-red-500" title="Yasaklı" />}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }} 
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Sohbeti Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-500">Aktif sohbet bulunmuyor.</div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800">
        {activeSession ? (
          <>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-800 dark:text-white">
                {activeSession.name ? `${activeSession.name} ${activeSession.surname} - Konteyner: ${activeSession.containerNo}` : `Kullanıcı: ${activeSession.id.substring(0,6)}`}
              </h3>
              <div className="flex items-center gap-2">
                {activeSession.isBanned && (
                  <button
                    onClick={() => handleUnban(activeSession.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Yasaklı (Aç)
                  </button>
                )}
                <button
                  onClick={() => handleDeleteSession(activeSession.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Sohbeti Sil"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div 
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar"
            >
              {activeSession.messages.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl ${
                    m.sender === 'agent' 
                      ? 'bg-blue-600 text-white rounded-br-sm' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                  }`}>
                    {m.imageUrl && (
                        <img src={m.imageUrl} alt="Attachment" className="max-w-full rounded-lg mb-2 max-h-[400px] object-contain" />
                    )}
                    {m.text && <p className="text-sm">{m.text}</p>}
                    <span className="text-[10px] opacity-70 mt-1 block text-right">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Yanıtınızı yazın..."
                className="flex-1 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={!text.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Gönder
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Sohbet etmek için soldan bir kullanıcı seçin.
          </div>
        )}
      </div>
    </div>
  );
}
