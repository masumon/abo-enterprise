import { create } from 'zustand';
import apiClient from '../api/client';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  tokens_used: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  is_pinned: boolean;
  is_archived: boolean;
  message_count: number;
  total_tokens: number;
  created_at: string;
  updated_at: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  selectedModel: string;

  fetchConversations: () => Promise<void>;
  createConversation: (model?: string) => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  setSelectedModel: (model: string) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  selectedModel: 'gpt-4o-mini',

  fetchConversations: async () => {
    try {
      const { data } = await apiClient.get('/api/v1/chat/conversations');
      set({ conversations: data });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to load conversations' });
    }
  },

  createConversation: async (model?: string) => {
    const m = model || get().selectedModel;
    try {
      const { data } = await apiClient.post('/api/v1/chat/conversations', {
        title: 'New Chat',
        model: m,
      });
      set((state) => ({
        conversations: [data, ...state.conversations],
        activeConversationId: data.id,
        messages: [],
      }));
      return data.id;
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to create conversation' });
      throw err;
    }
  },

  selectConversation: async (id: string) => {
    set({ activeConversationId: id, isLoading: true });
    try {
      const { data } = await apiClient.get(`/api/v1/chat/conversations/${id}/messages`);
      set({ messages: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to load messages', isLoading: false });
    }
  },

  sendMessage: async (content: string) => {
    const { activeConversationId, selectedModel } = get();
    let convoId = activeConversationId;

    set({ isSending: true, error: null });

    // Auto-create conversation if none active
    if (!convoId) {
      try {
        convoId = await get().createConversation();
      } catch {
        set({ isSending: false });
        return;
      }
    }

    // Optimistic: add user message immediately
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      tokens_used: 0,
      created_at: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, tempUserMsg] }));

    try {
      const { data } = await apiClient.post(
        `/api/v1/chat/conversations/${convoId}/messages`,
        { content, model: selectedModel }
      );

      set((state) => {
        // Replace temp message and add assistant response
        const msgs = state.messages.filter((m) => m.id !== tempUserMsg.id);
        return {
          messages: [...msgs, data.user_message, data.assistant_message],
          isSending: false,
        };
      });

      // Update conversation title in sidebar
      get().fetchConversations();
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || 'Failed to send message',
        isSending: false,
      });
    }
  },

  deleteConversation: async (id: string) => {
    try {
      await apiClient.delete(`/api/v1/chat/conversations/${id}`);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
        messages: state.activeConversationId === id ? [] : state.messages,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to delete conversation' });
    }
  },

  renameConversation: async (id: string, title: string) => {
    try {
      await apiClient.patch(`/api/v1/chat/conversations/${id}/rename`, null, {
        params: { title },
      });
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, title } : c
        ),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to rename' });
    }
  },

  togglePin: async (id: string) => {
    try {
      const { data } = await apiClient.patch(`/api/v1/chat/conversations/${id}/pin`);
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, is_pinned: data.is_pinned } : c
        ),
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to pin' });
    }
  },

  setSelectedModel: (model: string) => set({ selectedModel: model }),

  clearChat: () => set({ activeConversationId: null, messages: [] }),
}));
