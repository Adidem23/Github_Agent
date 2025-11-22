import { useEffect, useRef, useState } from 'react';
import './dash.css';
import axios from 'axios';

const SAMPLE_CHATS = [
  {
    id: '1',
    title: 'Project ideas',
    updatedAt: Date.now() - 1000 * 60 * 60,
    messages: [
      { id: 'm1', role: 'user', text: 'Give me 5 project ideas for a portfolio.' },
      { id: 'm2', role: 'assistant', text: 'Sure — a real-time chat app, personal finance dashboard, and more.' },
    ],
  },
];

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function ChatDashboard() {
  const [chats, setChats] = useState(() => {
    try {
      const raw = localStorage.getItem('cgpt_chats_v2');
      return raw ? JSON.parse(raw) : SAMPLE_CHATS;
    } catch (e) {
      return SAMPLE_CHATS;
    }
  });

  const [selectedChatId, setSelectedChatId] = useState(chats[0]?.id ?? null);
  const [query, setQuery] = useState('');
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('cgpt_chats_v2', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChatId, chats]);

  const selectedChat = chats.find(c => c.id === selectedChatId) ?? null;

  function createNewChat() {
    const id = uid('chat');
    const newChat = { id, title: 'New chat', updatedAt: Date.now(), messages: [] };
    setChats(s => [newChat, ...s]);
    setSelectedChatId(id);
  }

  function deleteChat(id) {
    setChats(s => s.filter(c => c.id !== id));
    if (id === selectedChatId) {
      const remaining = chats.filter(c => c.id !== id);
      setSelectedChatId(remaining[0]?.id ?? null);
    }
  }

  function resetChat(id) {
    setChats(s => s.map(c => c.id === id ? { ...c, messages: [], title: 'New chat', updatedAt: Date.now() } : c));
  }

  function renameChat(id) {
    const newTitle = window.prompt('Rename chat', chats.find(c => c.id === id)?.title || '');
    if (newTitle !== null) {
      setChats(s => s.map(c => c.id === id ? { ...c, title: newTitle } : c));
    }
  }

  async function sendMessage() {
    if (!input.trim() || !selectedChatId) return;

    const msg = { id: uid('m'), role: 'user', text: input.trim(), createdAt: Date.now() };
    setChats(prev => prev.map(c => c.id === selectedChatId ? { ...c, messages: [...c.messages, msg], updatedAt: Date.now() } : c));
    setInput('');

    const placeholderId = uid('m');
    const placeholder = { id: placeholderId, role: 'assistant', text: '...', createdAt: Date.now() };
    setChats(prev => prev.map(c => c.id === selectedChatId ? { ...c, messages: [...c.messages, placeholder], updatedAt: Date.now() } : c));

    try {
      const res = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          "id": 1,
          "Query_body": msg.text,
          "User_Name": "Aditya"
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const dataAPI = await res.json();

      const replyText = (dataAPI && (dataAPI.reply || dataAPI.message || dataAPI.text)) ?? 'No reply';

      const url = 'https://global.api.murf.ai/v1/speech/stream';

      const data = {
        "voiceId": "en-US-matthew",
        "text": replyText,
        "multiNativeLocale": "en-US",
        "model": "FALCON",
        "format": "MP3",
        "sampleRate": 24000,
        "channelType": "MONO"
      };

      const config = {
        method: 'post',
        url: url,
        headers: {
          'Content-Type': 'application/json',
          'api-key': ''
        },
        data: data,
        responseType: 'arraybuffer' 
      };

      axios(config)
        .then((response) => {
          const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);

          audio.play()
            .catch(err => console.error("Playback failed:", err));

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
          };
        })

        
      setChats(prev => prev.map(c => {
        if (c.id !== selectedChatId) return c;
        return {
          ...c,
          messages: c.messages.map(m => m.id === placeholderId ? { ...m, text: replyText, createdAt: Date.now() } : m),
          updatedAt: Date.now(),
        };
      }));
    } catch (err) {
      console.error('sendMessage error', err);
      // show error text in place of placeholder
      setChats(prev => prev.map(c => {
        if (c.id !== selectedChatId) return c;
        return {
          ...c,
          messages: c.messages.map(m => m.id === placeholderId ? { ...m, text: 'Error: failed to get response from API.' } : m),
          updatedAt: Date.now(),
        };
      }));
    }
  }

  const filteredChats = chats.filter(c => c.title.toLowerCase().includes(query.toLowerCase()) || c.messages.some(m => m.text.toLowerCase().includes(query.toLowerCase())));

  return (
    <div className="cd-root">
      <aside className="cd-sidebar">
        <div className="cd-side-header">
          <div className="cd-title">Chat</div>
          <button className="cd-btn" onClick={createNewChat}>New</button>
        </div>

        <div className="cd-search">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search chats" />
        </div>

        <div className="cd-list">
          {filteredChats.map(chat => (
            <div key={chat.id} className={`cd-chat-item ${chat.id === selectedChatId ? 'active' : ''}`} onClick={() => setSelectedChatId(chat.id)}>
              <div className="cd-avatar">💬</div>
              <div className="cd-chat-main">
                <div className="cd-chat-title">{chat.title}</div>
                <div className="cd-chat-snippet">{chat.messages[chat.messages.length - 1]?.text ?? 'No messages yet'}</div>
              </div>
              <div className="cd-chat-actions">
                <button className="cd-small" onClick={e => { e.stopPropagation(); resetChat(chat.id); }}>Reset</button>
                <button className="cd-small cd-danger" onClick={e => { e.stopPropagation(); deleteChat(chat.id); }}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        <div className="cd-side-footer">Local demo</div>
      </aside>

      <main className="cd-main">
        <header className="cd-main-header">
          <div>
            <h2 className="cd-main-title">{selectedChat?.title ?? 'No chat selected'}</h2>
            <div className="cd-main-sub">{selectedChat ? `${selectedChat.messages.length} messages` : 'Select or create a chat'}</div>
          </div>
          <div className="cd-main-controls">
            {selectedChat && (
              <>
                <button className="cd-btn" onClick={() => renameChat(selectedChat.id)}>Rename</button>
                <button className="cd-btn" onClick={() => resetChat(selectedChat.id)}>Reset</button>
                <button className="cd-btn cd-danger" onClick={() => deleteChat(selectedChat.id)}>Delete</button>
              </>
            )}
          </div>
        </header>

        <div className="cd-conversation">
          {!selectedChat && <div className="cd-empty">Select or create a chat.</div>}

          {selectedChat && (
            <div className="cd-messages">
              {selectedChat.messages.map(msg => (
                <div key={msg.id} className={`cd-message ${msg.role}`}>
                  <div className="cd-message-bubble">
                    <div className="cd-message-text">{msg.text}</div>
                    <div className="cd-message-time">{new Date(msg.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="cd-composer">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendMessage(); }} placeholder="Type message — Ctrl/Cmd+Enter to send"></textarea>

          <div className="cd-composer-actions">
            <button className="cd-btn" onClick={sendMessage}>Send</button>
            <button className="cd-btn" onClick={() => setInput('')}>Clear</button>
          </div>
        </div>
      </main>
    </div>
  );
}