import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Paperclip, AlertCircle, Headset, Trash2 } from 'lucide-react';
import { api } from '../api';

type ChatMessage = { id: string; sender: 'user' | 'agent'; text: string; imageUrl?: string; timestamp: string; };

export function LiveChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isBanned, setIsBanned] = useState(false);
  
  const [isRegistered, setIsRegistered] = useState(false);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [containerNo, setContainerNo] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const getSessionId = () => {
    let id = localStorage.getItem('chatSessionId');
    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('chatSessionId', id);
    }
    return id;
  };

  const sessionId = getSessionId();

  useEffect(() => {
    if (localStorage.getItem('chatRegistered')) {
      setIsRegistered(true);
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !surname.trim() || !containerNo.trim()) return;
    try {
      await api.post('/chat/session', { id: sessionId, name, surname, containerNo });
      localStorage.setItem('chatRegistered', 'true');
      setIsRegistered(true);
      fetchSession();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSession = async () => {
    if (!isOpen) return;
    try {
      const data = await api.get(`/chat/session/${sessionId}`);
      if (data && !data.error) {
        if (!data.name) {
          if (isRegistered) {
            setIsRegistered(false);
            localStorage.removeItem('chatRegistered');
          }
        } else if (!isRegistered) {
          setIsRegistered(true);
          localStorage.setItem('chatRegistered', 'true');
        }
        
        if (data.name) {
          setMessages(data.messages || []);
          setIsBanned(data.isBanned);
          if (!data.isBanned) setError('');
        }
      }
    } catch (err: any) {
      if (err.message === 'Session not found') {
        if (isRegistered) {
          setIsRegistered(false);
          localStorage.removeItem('chatRegistered');
        }
      }
    }
  };

  useEffect(() => {
    fetchSession();
    const interval = setInterval(fetchSession, 5000); // 5 seconds polling
    
    return () => {
      clearInterval(interval);
    };
  }, [isOpen]);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages?.length, isOpen]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      shouldAutoScroll.current = isAtBottom;
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && !fileInputRef.current?.files?.length) || isBanned) return;

    const file = fileInputRef.current?.files?.[0];
    if (file && file.size > 25 * 1024 * 1024) {
      setError("Dosya boyutu 25MB'den küçük olmalıdır.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      let data;
      if (file) {
        const formData = new FormData();
        formData.append('id', sessionId);
        formData.append('text', text);
        formData.append('sender', 'user');
        formData.append('file', file);
        // We need to use api.postForm if it's available, otherwise standard fetch
        data = await (api as any).postForm(`/chat/message`, formData);
      } else {
        data = await api.post(`/chat/message`, { id: sessionId, text, sender: 'user' });
      }

      setMessages(prev => [...prev, data]);
      setText('');
      shouldAutoScroll.current = true;
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('yasak') || err.message.toLowerCase().includes('küfür')) {
         setIsBanned(true);
         setError(err.message || "Yasaklandınız.");
      } else {
         setError("Bağlantı hatası: " + err.message);
      }
    }
  };

  const handleDeleteChat = async () => {
    try {
      await api.delete(`/chat/session/${sessionId}`);
    } catch (err) {
      console.error("Failed to delete session", err);
    } finally {
      localStorage.removeItem('chatSessionId');
      localStorage.removeItem('chatRegistered');
      setMessages([]);
      setIsRegistered(false);
      setIsBanned(false);
      setError('');
      // This will force a new session ID on reload, or we can just reload the window
      window.location.reload();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 px-3 py-2 sm:px-5 sm:py-3.5 bg-blue-600 text-white rounded-2xl sm:rounded-full shadow-lg hover:bg-blue-700 transition-all z-50 flex items-center justify-center gap-1.5 sm:gap-2 font-medium"
      >
        <Headset className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="text-[12px] sm:text-[15px] font-bold">Destek</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-32px)] sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden z-50 h-[500px] max-h-[80vh]">
      <div className="bg-blue-600 p-4 flex items-center justify-between text-white">
        <h3 className="font-semibold flex items-center gap-2">
          <Headset className="w-5 h-5" /> Canlı Destek
        </h3>
        <div className="flex items-center gap-2">
          {isRegistered && (
            <>
              <button 
                onClick={() => {
                  setIsRegistered(false);
                  localStorage.removeItem('chatRegistered');
                }} 
                className="text-xs bg-blue-700 hover:bg-blue-800 px-2 py-1 rounded transition-colors"
                title="Bilgileri Değiştir"
              >
                Düzenle
              </button>
              <button 
                onClick={handleDeleteChat} 
                className="hover:bg-blue-700 p-1 rounded-full transition-colors"
                title="Sohbeti Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded-full transition-colors" title="Kapat">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {!isRegistered ? (
        <div className="flex-1 p-6 flex flex-col justify-center bg-slate-50 dark:bg-slate-900/50">
          <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2 text-center">Hoş Geldiniz</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">Size daha iyi yardımcı olabilmemiz için lütfen bilgilerinizi giriniz.</p>
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div>
              <input 
                type="text" 
                placeholder="Adınız" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <input 
                type="text" 
                placeholder="Soyadınız" 
                value={surname} 
                onChange={(e) => setSurname(e.target.value)} 
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                required
              />
            </div>
            <div>
              <input 
                type="text" 
                placeholder="Konteyner Numaranız (örn: K-101)" 
                value={containerNo} 
                onChange={(e) => setContainerNo(e.target.value)} 
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                required
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors mt-2 shadow-md">
              Sohbete Başla
            </button>
          </form>
        </div>
      ) : (
        <>
          <div 
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar bg-slate-50 dark:bg-slate-900/50"
          >
            {messages.length === 0 && (
              <div className="text-center text-slate-500 dark:text-slate-400 text-sm mt-4">
                Size nasıl yardımcı olabiliriz? Lütfen sorununuzu yazın.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl ${
                  m.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-sm' 
                    : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-bl-sm'
                }`}>
                  {m.imageUrl && (
                    <img src={m.imageUrl} alt="Attachment" className="max-w-full rounded-lg mb-2 max-h-[300px] object-contain" />
                  )}
                  {m.text && <p className="text-sm">{m.text}</p>}
                  <span className="text-[10px] opacity-70 mt-1 block text-right">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isBanned && (
              <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm flex items-start gap-2 border border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>Canlı destek hattından yasaklandınız, görevli merkez ile görüşün.</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-end gap-2">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={() => { if(fileInputRef.current?.files?.length) handleSend(); }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isBanned}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors disabled:opacity-50"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isBanned}
                placeholder={isBanned ? "Yasaklandınız" : "Mesajınızı yazın..."}
                className="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[80px]"
                rows={1}
              />
            </div>
            <button 
              onClick={handleSend}
              disabled={isBanned || (!text.trim() && !fileInputRef.current?.files?.length)}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
