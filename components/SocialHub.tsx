
import React, { useState, useEffect, useRef } from 'react';

interface SocialHubProps {
  onExit: () => void;
}

interface UserProfile {
  username: string;
  isBot: boolean;
  avatarColor: string;
  scores: Record<string, number>;
  isOnline: boolean;
}

interface ChatMessage {
  id: number;
  sender: string;
  text: string;
  timestamp: number;
  isSystem: boolean;
}

const GAME_NAMES: Record<string, string> = {
    snake: 'Snake',
    sky: 'Sky Gift',
    danger: 'Danger Zone',
    racing: 'Asphalt Fury',
    platformer: 'Platformer',
    shooter: 'Neon Shield',
    keepup: 'Keep Up',
    dotrunner: 'Dot Runner'
};

const SocialHub: React.FC<SocialHubProps> = ({ onExit }) => {
  const [view, setView] = useState<'login' | 'hub' | 'chat' | 'search' | 'profile'>('login');
  const [currentUser, setCurrentUser] = useState<string>('');
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load user session
  useEffect(() => {
    const storedUser = sessionStorage.getItem('social_user');
    if (storedUser) {
        setCurrentUser(storedUser);
        setView('hub');
    }
    // Initial system message
    setMessages([
        { id: 1, sender: 'System', text: 'Welcome to the Nexus Link.', timestamp: Date.now(), isSystem: true },
    ]);
  }, []);

  // Fluctuating online count simulation
  useEffect(() => {
    const interval = setInterval(() => {
        setOnlineCount(prev => Math.max(1, prev + Math.floor(Math.random() * 3) - 1));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, view]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.trim() && password.trim()) {
        sessionStorage.setItem('social_user', currentUser);
        setView('hub');
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const msgText = inputText;
    setMessages(prev => [...prev, {
        id: Date.now(),
        sender: currentUser,
        text: msgText,
        timestamp: Date.now(),
        isSystem: false
    }]);
    setInputText('');
  };

  const getMyProfile = (): UserProfile => {
      // Read high scores from localStorage
      const scores: Record<string, number> = {};
      Object.keys(GAME_NAMES).forEach(key => {
          // Keys are like 'snake_best', 'sky_best'
          const stored = localStorage.getItem(`${key}_best`);
          // Special case for Platformer which saves level
          if (key === 'platformer') {
              const lvl = localStorage.getItem('platformer_currentLevel');
              scores[key] = lvl ? parseInt(lvl) + 1 : 1;
          } else {
              scores[key] = stored ? parseInt(stored) : 0;
          }
      });

      return {
          username: currentUser,
          isBot: false,
          avatarColor: '#22d3ee', // Cyan
          scores: scores,
          isOnline: true,
      };
  };

  const handleViewProfile = (user: UserProfile) => {
      setViewingProfile(user);
      setView('profile');
  };

  // Views
  if (view === 'login') {
      return (
          <div className="bg-slate-900 w-full h-full p-6 flex flex-col justify-center items-center rounded-2xl border border-cyan-500/30 shadow-2xl">
              <h2 className="text-3xl font-bold text-cyan-400 mb-6 tracking-widest">NEXUS LOGIN</h2>
              <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
                  <div>
                      <label className="block text-xs text-cyan-200 mb-1">CODENAME</label>
                      <input 
                        type="text" 
                        value={currentUser}
                        onChange={e => setCurrentUser(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white focus:border-cyan-400 outline-none"
                        required
                      />
                  </div>
                  <div>
                      <label className="block text-xs text-cyan-200 mb-1">PASSPHRASE</label>
                      <input 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white focus:border-cyan-400 outline-none"
                        required
                      />
                  </div>
                  <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded transition-colors mt-4">
                      CONNECT
                  </button>
              </form>
              <button onClick={onExit} className="mt-6 text-xs text-gray-500 hover:text-gray-300">Abort Connection</button>
          </div>
      );
  }

  return (
      <div className="bg-slate-900 w-full h-[500px] flex flex-col rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800/50">
              <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <div className="flex flex-col">
                    <span className="font-mono text-cyan-400 font-bold leading-none">{currentUser}</span>
                    <span className="text-[10px] text-gray-500 leading-none">ONLINE: {onlineCount}</span>
                  </div>
              </div>
              <button onClick={() => view === 'hub' ? onExit() : setView('hub')} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-white transition-colors">
                  {view === 'hub' ? 'EXIT' : 'BACK'}
              </button>
          </div>

          {/* HUB View */}
          {view === 'hub' && (
              <div className="flex-1 p-6 flex flex-col justify-center space-y-4">
                  <button onClick={() => setView('chat')} className="bg-gradient-to-r from-indigo-900 to-indigo-700 p-4 rounded-xl border border-indigo-500/50 hover:scale-105 transition-transform flex items-center space-x-4 group">
                      <span className="text-3xl group-hover:animate-bounce">💬</span>
                      <div className="text-left">
                          <div className="flex items-center">
                            <h3 className="font-bold text-white mr-2">Global Chat</h3>
                            <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                          </div>
                          <p className="text-xs text-indigo-200">Live feed from the network.</p>
                      </div>
                  </button>
                  <button onClick={() => setView('search')} className="bg-gradient-to-r from-emerald-900 to-emerald-700 p-4 rounded-xl border border-emerald-500/50 hover:scale-105 transition-transform flex items-center space-x-4">
                      <span className="text-3xl">🔍</span>
                      <div className="text-left">
                          <h3 className="font-bold text-white">Find Player</h3>
                          <p className="text-xs text-emerald-200">Search database for users.</p>
                      </div>
                  </button>
                  <button onClick={() => handleViewProfile(getMyProfile())} className="bg-gradient-to-r from-purple-900 to-purple-700 p-4 rounded-xl border border-purple-500/50 hover:scale-105 transition-transform flex items-center space-x-4">
                      <span className="text-3xl">👤</span>
                      <div className="text-left">
                          <h3 className="font-bold text-white">My Profile</h3>
                          <p className="text-xs text-purple-200">View your stats and high scores.</p>
                      </div>
                  </button>
              </div>
          )}

          {/* CHAT View */}
          {view === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-600">
                      {messages.map(msg => (
                          <div key={msg.id} className={`flex flex-col ${msg.sender === currentUser ? 'items-end' : 'items-start'}`}>
                               <div className="flex items-baseline space-x-2 mb-1">
                                   <span className={`text-xs font-bold ${msg.sender === currentUser ? 'text-cyan-400' : 'text-green-500'}`}>
                                       {msg.sender}
                                   </span>
                                   <span className="text-[10px] text-gray-500">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                               </div>
                               <div className={`px-3 py-2 rounded-lg max-w-[80%] text-sm ${
                                   msg.isSystem ? 'bg-green-900/30 border border-green-500/30 text-green-100 italic w-full text-center' :
                                   msg.sender === currentUser ? 'bg-cyan-900/50 text-white rounded-tr-none' : 'bg-slate-700 text-gray-200 rounded-tl-none'
                               }`}>
                                   {msg.text}
                               </div>
                          </div>
                      ))}
                      <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={handleSendMessage} className="p-3 bg-slate-800 flex space-x-2">
                      <input 
                        className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 outline-none"
                        placeholder="Type a message..."
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded font-bold text-sm">SEND</button>
                  </form>
              </div>
          )}

          {/* SEARCH View */}
          {view === 'search' && (
              <div className="flex-1 p-4 flex flex-col min-h-0">
                  <input 
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white mb-4 focus:border-emerald-400 outline-none"
                    placeholder="Search username..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <div className="flex-1 overflow-y-auto space-y-2">
                      {/* Always show current user in search */}
                      {(currentUser.toLowerCase().includes(searchQuery.toLowerCase()) || searchQuery === '') && (
                          <div onClick={() => handleViewProfile(getMyProfile())} className="bg-slate-800 p-3 rounded hover:bg-slate-700 cursor-pointer flex items-center justify-between border border-transparent hover:border-cyan-500/50 transition-all">
                              <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-slate-900 font-bold relative">
                                      {currentUser.charAt(0).toUpperCase()}
                                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-800 rounded-full" title="Online"></div>
                                  </div>
                                  <span className="text-white font-bold">{currentUser}</span>
                              </div>
                              <span className="text-xs text-cyan-400 px-2 py-1 bg-cyan-900/30 rounded">YOU</span>
                          </div>
                      )}
                      
                      {/* No bots loop here anymore */}
                      {searchQuery !== '' && !currentUser.toLowerCase().includes(searchQuery.toLowerCase()) && (
                           <div className="text-center text-gray-500 py-4 text-sm">No other users found.</div>
                      )}
                  </div>
              </div>
          )}

          {/* PROFILE View */}
          {view === 'profile' && viewingProfile && (
              <div className="flex-1 p-4 overflow-y-auto">
                  <div className="flex flex-col items-center mb-6">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-slate-900 shadow-lg mb-2 relative" style={{ backgroundColor: viewingProfile.avatarColor }}>
                          {viewingProfile.username.charAt(0).toUpperCase()}
                          {viewingProfile.isOnline && (
                             <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-slate-900 rounded-full" title="Online"></div>
                          )}
                      </div>
                      <h2 className="text-2xl font-bold text-white">{viewingProfile.username}</h2>
                      <div className="flex space-x-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded ${viewingProfile.isBot ? 'bg-yellow-900/50 text-yellow-400' : 'bg-cyan-900/50 text-cyan-400'}`}>
                            {viewingProfile.isBot ? 'AI ENTITY' : 'PLAYER'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${viewingProfile.isOnline ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                            {viewingProfile.isOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                  </div>

                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-700 pb-1">High Scores</h3>
                  <div className="grid grid-cols-2 gap-3">
                      {Object.entries(GAME_NAMES).map(([key, name]) => (
                          <div key={key} className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center">
                              <span className="text-xs text-gray-400">{name}</span>
                              <span className="text-white font-mono font-bold">{viewingProfile.scores[key] || 0}</span>
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>
  );
};

export default SocialHub;
