import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, ChevronLeft, Menu, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContextApi';
import * as api from '../lib/api';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
  messages: Message[];
}

interface ConversationSummary {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export default function AiChat() {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Load current conversation
  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId || !user) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/ai-chat/${conversationId}`);
        if (response.ok) {
          const data = await response.json();
          setConversation(data);
          setError('');
        } else {
          setError('Failed to load conversation');
        }
      } catch (err) {
        setError('Error loading conversation');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [conversationId, user]);

  // Load conversations list
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/ai-chat');
        if (response.ok) {
          const data = await response.json();
          setConversations(data);
        }
      } catch (err) {
        console.error('Error loading conversations', err);
      }
    };

    loadConversations();
  }, [user]);

  // Create new conversation
  const handleNewConversation = async () => {
    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' })
      });
      
      if (response.ok) {
        const data = await response.json();
        navigate(`/ai-chat/${data.id}`);
      }
    } catch (err) {
      console.error('Error creating conversation', err);
      setError('Failed to create conversation');
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversationId || isSending) return;

    try {
      setIsSending(true);
      setMessage('');
      setError('');

      const response = await fetch(`/api/ai-chat/${conversationId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Reload conversation to show new messages
        const convResponse = await fetch(`/api/ai-chat/${conversationId}`);
        if (convResponse.ok) {
          const updatedConv = await convResponse.json();
          setConversation(updatedConv);
        }
      } else {
        setError('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message', err);
      setError('Error sending message');
    } finally {
      setIsSending(false);
    }
  };

  if (!conversationId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            AI Chat
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
            Start a new conversation or select one from the list
          </p>
          <button
            onClick={handleNewConversation}
            className="px-6 py-3 rounded-xl text-white font-medium press"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <Plus size={18} className="inline mr-2" />
            New Conversation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Sidebar */}
      {showSidebar && (
        <div
          className="w-64 border-r flex flex-col"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={handleNewConversation}
              className="w-full py-2 px-3 rounded-lg flex items-center gap-2 text-sm press"
              style={{ backgroundColor: 'var(--accent)', color: 'white' }}
            >
              <Plus size={16} />
              New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => navigate(`/ai-chat/${conv.id}`)}
                className={`w-full text-left p-3 rounded-lg mb-2 press truncate text-sm ${
                  conversationId === conv.id.toString()
                    ? 'font-semibold'
                    : ''
                }`}
                style={{
                  backgroundColor: conversationId === conv.id.toString() ? 'var(--accent)' : 'transparent',
                  color: conversationId === conv.id.toString() ? 'white' : 'var(--text-secondary)'
                }}
              >
                {conv.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div
          className="border-b p-4 flex items-center gap-3"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 rounded-lg press"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <Menu size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <h1 className="flex-1 font-semibold" style={{ color: 'var(--text-primary)' }}>
            {conversation?.title || 'Chat'}
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div
                className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--accent)' }}
              />
            </div>
          ) : (
            <>
              {error && (
                <div
                  className="p-3 rounded-lg text-sm"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}
                >
                  {error}
                </div>
              )}

              {conversation?.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-2xl px-4 py-3 rounded-2xl break-words"
                    style={{
                      backgroundColor:
                        msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                      color:
                        msg.role === 'user'
                          ? 'white'
                          : 'var(--text-primary)'
                    }}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p
                      className="text-xs mt-1"
                      style={{
                        color:
                          msg.role === 'user'
                            ? 'rgba(255,255,255,0.7)'
                            : 'var(--text-muted)'
                      }}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div
                    className="max-w-2xl px-4 py-3 rounded-2xl"
                    style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                      <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                      <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: 'var(--accent)' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="border-t p-4"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending}
              className="flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                '--tw-ring-color': 'var(--accent)'
              } as React.CSSProperties}
            />
            <button
              type="submit"
              disabled={!message.trim() || isSending}
              className="px-4 py-3 rounded-xl text-white font-medium press disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
