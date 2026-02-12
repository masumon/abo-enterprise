import { create } from 'zustand';
import { tasksAPI } from '../api/endpoints';

interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: (params?: { project_id?: string; status?: string }) => Promise<void>;
  createTask: (data: { project_id: string; title: string; description?: string }) => Promise<void>;
  cancelTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async (params) => {
    set({ isLoading: true });
    try {
      const { data } = await tasksAPI.list(params);
      set({ tasks: data.tasks, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createTask: async (taskData) => {
    try {
      await tasksAPI.create(taskData);
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  cancelTask: async (id) => {
    try {
      await tasksAPI.cancel(id);
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));
