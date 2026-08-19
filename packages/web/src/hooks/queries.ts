import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type TaskFilter } from '../api';
import type { Task } from '../types';

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: api.listProjects });
}

export function useTasks(filter: TaskFilter = {}) {
  return useQuery({ queryKey: ['tasks', filter], queryFn: () => api.listTasks(filter) });
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.getTask(id!),
    enabled: !!id,
  });
}

export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: api.listAgents });
}

export function useModels() {
  return useQuery({ queryKey: ['models'], queryFn: api.listModels });
}

export function useMetrics() {
  return useQuery({ queryKey: ['metrics'], queryFn: api.metrics });
}

export function useConfig() {
  return useQuery({ queryKey: ['config'], queryFn: api.config });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['tasks'] });
    void qc.invalidateQueries({ queryKey: ['metrics'] });
  };
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; key?: string; repo?: string }) => api.createProject(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useCreateTask() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: Partial<Task> & { projectId: string; title: string }) =>
      api.createTask(body),
    onSuccess: invalidate,
  });
}

export function useTransition() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { id: string; to: string; comment: string; actor?: string }) =>
      api.transitionTask(v.id, { to: v.to, comment: v.comment, actor: v.actor }),
    onSuccess: (_data, v) => {
      invalidate();
      void qc.invalidateQueries({ queryKey: ['task', v.id] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { id: string; patch: Partial<Task> }) => api.updateTask(v.id, v.patch),
    onSuccess: (_data, v) => {
      invalidate();
      void qc.invalidateQueries({ queryKey: ['task', v.id] });
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; body: string; author?: string }) =>
      api.addComment(v.id, { body: v.body, author: v.author }),
    onSuccess: (_data, v) => {
      void qc.invalidateQueries({ queryKey: ['task', v.id] });
    },
  });
}

export function useClaimNext() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (v: { projectId?: string; comment?: string }) => api.claimNext(v),
    onSuccess: invalidate,
  });
}
