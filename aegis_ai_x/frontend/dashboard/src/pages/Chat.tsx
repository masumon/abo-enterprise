import React, { useState, useEffect, useRef } from 'react';
import { useChatStore, Message } from '../store/chatStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useAuth } from '../hooks/useAuth';

const MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', tier: 'free' },
  { id: 'gpt-4o', label: 'GPT-4o', tier: 'go' },
  { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', tier: 'pro' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', tier: 'pro' },
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', tier: 'ultra_pro' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'ultra_pro' },
];

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown-like rendering for code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const lines = part.slice(3, -3).split('\n');
          const lang = lines[0] || '';
          const code = lines.slice(1).join('\n') || lines.join('\n');
          return (
            <div key={i} className="rounded-lg overflow-hidden bg-gray-950 border border-gray-700">
              {lang && (
                <div className="px-4 py-2 bg-gray-800 text-xs text-gray-400 flex justify-between">
                  <span>{lang}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="hover:text-white transition-colors"
                  >
                    Copy
                  </button>
                </div>
              )}
              <pre className="p-4 text-sm text-green-400 overflow-x-auto font-mono">
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">
            {part}
          </p>
        );
      })}
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">
          S
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-5 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-800 text-gray-100 rounded-bl-md border border-gray-700'
        }`}
      >
        <MarkdownContent content={message.content} />
        {message.model && !isUser && (
          <div className="mt-2 text-xs text-gray-500">{message.model}</div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">
          U
        </div>
      )}
    </div>
  );
}

function ConversationSidebar() {
  const { conversations, activeConversationId, selectConversation, createConversation, deleteConversation, clearChat } =
    useChatStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  const today = new Date().toDateString();
  const todayConvos = conversations.filter((c) => new Date(c.created_at).toDateString() === today);
  const olderConvos = conversations.filter((c) => new Date(c.created_at).toDateString() !== today);

  const handleNew = () => {
    clearChat();
  };

  return (
    <div className="w-72 bg-gray-950 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4">
        <button
          onClick={handleNew}
          className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-white text-sm font-medium transition-colors border border-gray-700"
        >
          <span className="text-lg">+</span>
          New Chat
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {todayConvos.length > 0 && (
          <>
            <div className="px-3 py-2 text-xs text-gray-500 font-medium uppercase">Today</div>
            {todayConvos.map((c) => (
              <ConvoItem
                key={c.id}
                convo={c}
                isActive={c.id === activeConversationId}
                onSelect={() => selectConversation(c.id)}
                onDelete={() => deleteConversation(c.id)}
              />
            ))}
          </>
        )}
        {olderConvos.length > 0 && (
          <>
            <div className="px-3 py-2 text-xs text-gray-500 font-medium uppercase mt-4">Previous</div>
            {olderConvos.map((c) => (
              <ConvoItem
                key={c.id}
                convo={c}
                isActive={c.id === activeConversationId}
                onSelect={() => selectConversation(c.id)}
                onDelete={() => deleteConversation(c.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ConvoItem({
  convo,
  isActive,
  onSelect,
  onDelete,
}: {
  convo: any;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
      }`}
      onClick={onSelect}
    >
      <span className="flex-1 truncate text-sm">{convo.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all text-xs"
      >
        x
      </button>
    </div>
  );
}

function WelcomeScreen({ onSendMessage }: { onSendMessage: (msg: string) => void }) {
  const suggestions = [
    'Write a Python function to sort a list',
    'Explain quantum computing simply',
    'Create a business plan for a startup',
    'Help me debug my React component',
    'Write a poem about technology',
    'Explain machine learning algorithms',
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <span className="text-white text-2xl font-bold">S</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">SUMONIX AI</h1>
        <p className="text-gray-400 mb-10">How can I help you today?</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(s)}
              className="text-left p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-300 hover:text-white transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const {
    messages, activeConversationId, isSending, error, selectedModel,
    sendMessage, setSelectedModel, fetchConversations,
  } = useChatStore();
  const { fetchUsage, usage } = useSubscriptionStore();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchUsage();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isSending) return;
    sendMessage(input.trim());
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <ConversationSidebar />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-semibold">SUMONIX AI</h2>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {usage && (
              <span>
                {usage.daily_limit === -1
                  ? 'Unlimited'
                  : `${usage.messages_today}/${usage.daily_limit} today`}
              </span>
            )}
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">{user?.username}</span>
          </div>
        </div>

        {/* Messages / Welcome */}
        {messages.length === 0 && !activeConversationId ? (
          <WelcomeScreen onSendMessage={(msg) => { setInput(''); sendMessage(msg); }} />
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              {isSending && (
                <div className="flex gap-4 animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    S
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-md px-5 py-4">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Error bar */}
        {error && (
          <div className="mx-4 mb-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-800">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-violet-500 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Message SUMONIX AI..."
                rows={1}
                className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none text-sm leading-6 max-h-[200px]"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isSending}
                className="flex-shrink-0 w-9 h-9 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-gray-700 disabled:text-gray-500 text-white flex items-center justify-center transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M1 8L14 1L8 15L6.5 9.5L1 8Z" fill="currentColor" />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs text-gray-600 mt-2">
              SUMONIX AI can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
