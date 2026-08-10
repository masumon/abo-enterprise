"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bot,
  BookOpen,
  Check,
  Database,
  Eye,
  Link2,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { AdminTitle } from "@/components/admin/AdminTitle";
import { assistantAdminApi } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import type {
  AssistantConfig,
  AssistantConversation,
  AssistantFaqEntry,
  AssistantActionLog,
} from "@/lib/types";

// ...existing component implementation...

const deleteConversation = (id: string) => {
  setConfirmState({
    title: "Archive this conversation?",
    message: "This conversation will be hidden from the active conversation list. Its history will be preserved.",
    action: async () => {
      setConfirmState(null);
      setDeletingConvId(id);
      try {
        await assistantAdminApi.deleteConversation(id);
        toast("success", "Conversation archived");
        if (convDetail?.conversation.id === id) setConvDetail(null);
        await loadConversations();
      } catch {
        toast("error", "Failed to archive conversation");
      } finally {
        setDeletingConvId(null);
      }
    },
  });
};
