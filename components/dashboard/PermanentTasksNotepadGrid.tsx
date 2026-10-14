'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pin, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Search, 
  User, 
  Trash2, 
  Filter, 
  Sparkles, 
  Calendar, 
  ChevronDown, 
  X,
  Edit2,
  RefreshCw,
  Tag,
  History,
  CheckSquare,
  Bell,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUI } from '@/hooks/useUI';

export interface PermanentTaskNote {
  id: string | number;
  title: string;
  description?: string;
  status: string;
  progress?: number;
  priority?: string;
  category?: string;
  task_type?: string;
  due_date?: string;
  collaborator_id?: string;
  collaborator_name?: string;
  assignees?: { name: string }[];
  is_fixed?: boolean;
  is_permanent?: boolean;
  color_theme?: 'amber' | 'purple' | 'emerald' | 'sky' | 'rose' | 'indigo';
  has_execution_notice?: boolean;
  last_executed_at?: string;
  executed_by_name?: string;
}

export interface TaskExecutionHistory {
  id: string;
  task_id: string | number;
  title: string;
  collaborator_name: string;
  category: string;
  status: string;
  progress: number;
  execution_date: string;
  completed_at: string;
}

const DEFAULT_COLLABORATORS = [
  { id: 'collab-1', name: 'Ana Silva (Financeiro)', role: 'Financeiro' },
  { id: 'collab-2', name: 'Carlos Oliveira (Estoque)', role: 'Estoque' },
  { id: 'collab-3', name: 'Marcos Souza (TI & Suporte)', role: 'TI' },
  { id: 'collab-4', name: 'Juliana Lima (Atendimento)', role: 'Atendimento' },
  { id: 'collab-5', name: 'Roberto Alves (Manutenção)', role: 'Manutenção' },
  { id: 'collab-6', name: 'Fernanda Rocha (Supervisão)', role: 'Supervisor' }
];

const INITIAL_PERMANENT_TASKS: PermanentTaskNote[] = [
  {
    id: 'perm-1',
    title: 'Conferência Diária de Caixa',
    description: 'Validar lançamentos de entradas, saídas e fechamento financeiro do dia anterior com comprovantes.',
    status: 'Em Andamento',
    progress: 40,
    priority: 'Alta',
    category: 'Financeiro',
    task_type: 'Permanente',
    due_date: 'Diário',
    collaborator_id: 'collab-1',
    collaborator_name: 'Ana Silva (Financeiro)',
    is_fixed: true,
    is_permanent: true,
    color_theme: 'amber',
    has_execution_notice: false
  },
  {
    id: 'perm-2',
    title: 'Supervisão Geral de Atendimento e Caixa',
    description: 'Acompanhar agilidade no atendimento ao cliente e conferência de troco e recibos.',
    status: 'Pendente',
    progress: 0,
    priority: 'Média',
    category: 'Supervisão',
    task_type: 'Permanente',
    due_date: 'Diário',
    collaborator_id: 'collab-6',
    collaborator_name: 'Fernanda Rocha (Supervisão)',
    is_fixed: true,
    is_permanent: true,
    color_theme: 'purple',
    has_execution_notice: false
  }
];

const MOCK_HISTORICAL_RECORDS: TaskExecutionHistory[] = [
  {
    id: 'hist-1',
    task_id: 'perm-1',
    title: 'Conferência Diária de Caixa',
    collaborator_name: 'Ana Silva (Financeiro)',
    category: 'Financeiro',
    status: 'Concluída',
    progress: 100,
    execution_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    completed_at: 'Ontem às 18:30'
  },
  {
    id: 'hist-2',
    task_id: 'perm-3',
    title: 'Backup Geral dos Servidores',
    collaborator_name: 'Marcos Souza (TI & Suporte)',
    category: 'TI & Sistemas',
    status: 'Concluída',
    progress: 100,
    execution_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    completed_at: 'Ontem às 22:15'
  },
  {
    id: 'hist-3',
    task_id: 'perm-2',
    title: 'Organização do Estoque - Setor A',
    collaborator_name: 'Carlos Oliveira (Estoque)',
    category: 'Estoque',
    status: 'Concluída',
    progress: 100,
    execution_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    completed_at: 'Há 2 dias às 17:00'
  }
];

interface PermanentTasksNotepadGridProps {
  isDarkMode: boolean;
  userId?: string;
  isAdmin?: boolean;
  role?: string;
}

export function PermanentTasksNotepadGrid({ isDarkMode, userId, isAdmin, role }: PermanentTasksNotepadGridProps) {
  const { showToast } = useUI();
  const [tasks, setTasks] = useState<PermanentTaskNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [collaborators, setCollaborators] = useState<{ id: string; name: string; role?: string }[]>(DEFAULT_COLLABORATORS);
  
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Geral');
  const [newPriority, setNewPriority] = useState('Média');
  const [newDueDate, setNewDueDate] = useState('Diário');
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>('collab-1');
  const [customCollaboratorName, setCustomCollaboratorName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [historyLogs, setHistoryLogs] = useState<TaskExecutionHistory[]>(MOCK_HISTORICAL_RECORDS);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  const isManagerOrSupervisor = Boolean(
    isAdmin || 
    role === 'gerente' || 
    role === 'supervisor' || 
    role === 'admin' ||
    role === 'diretoria'
  );

  // Auto-save all tasks to localStorage on any change
  useEffect(() => {
    if (tasks.length > 0) {
      try {
        localStorage.setItem('all_permanent_task_notes', JSON.stringify(tasks.filter(isPermanentTask)));
      } catch (e) {
        console.warn('Failed to save tasks to localStorage:', e);
      }
    }
  }, [tasks]);

  useEffect(() => {
    try {
      const savedHist = localStorage.getItem('permanent_tasks_execution_history');
      if (savedHist) {
        const parsed = JSON.parse(savedHist);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHistoryLogs(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not load history from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    try {
      if (historyLogs.length > 0) {
        localStorage.setItem('permanent_tasks_execution_history', JSON.stringify(historyLogs));
      }
    } catch (e) {
      console.warn('Could not save history to localStorage:', e);
    }
  }, [historyLogs]);

  const loadCollaborators = useCallback(async () => {
    try {
      let fetched: { id: string; name: string; role?: string }[] = [];

      try {
        const apiRes = await fetch('/api/collaborators');
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson?.collaborators?.length > 0) {
            fetched = apiJson.collaborators.map((c: any) => ({
              id: c.id,
              name: c.name || c.username || 'Colaborador',
              role: c.role || c.type || 'Geral'
            }));
          }
        }
      } catch (err) {
        console.warn('API /api/collaborators fetch skipped:', err);
      }

      if (fetched.length === 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, role, type')
          .order('name');

        if (!error && data && data.length > 0) {
          fetched = data.map(p => ({
            id: p.id,
            name: p.name || 'Colaborador',
            role: p.role || p.type || 'Geral'
          }));
        }
      }

      const existingNames = new Set(fetched.map(f => f.name.toLowerCase()));
      const defaultsToAdd = DEFAULT_COLLABORATORS.filter(d => !existingNames.has(d.name.toLowerCase()));
      const combined = [...fetched, ...defaultsToAdd];

      setCollaborators(combined);
      if (combined.length > 0 && !selectedCollaboratorId) {
        setSelectedCollaboratorId(combined[0].id);
      }
    } catch (e) {
      console.warn('Fallback to default collaborators list:', e);
      setCollaborators(DEFAULT_COLLABORATORS);
      setSelectedCollaboratorId(DEFAULT_COLLABORATORS[0].id);
    }
  }, [selectedCollaboratorId]);

  const isPermanentTask = useCallback((t: any) => {
    if (!t) return false;

    // 1. Exclude any task that has been explicitly deleted by the user
    if (typeof window !== 'undefined') {
      try {
        const deletedJson = localStorage.getItem('deleted_permanent_task_ids');
        if (deletedJson) {
          const deletedIds = JSON.parse(deletedJson);
          if (Array.isArray(deletedIds) && deletedIds.includes(String(t.id))) {
            return false;
          }
        }
      } catch {}
    }

    // 2. Strict task_type check: must be explicitly 'Permanente'
    const taskType = (t.task_type || '').toLowerCase();
    if (
      taskType === 'transferência' || 
      taskType === 'transferencia' || 
      taskType === 'estoque' || 
      taskType === 'outros' ||
      taskType === 'rotina' ||
      taskType === 'padrão' ||
      taskType === 'padrao' ||
      taskType === 'social media' ||
      taskType === 'comercial' ||
      taskType === 'financeiro' ||
      taskType === ''
    ) {
      if (t.task_type !== 'Permanente') return false;
    }

    // 3. Exclude operational title patterns (demands, stock counts, transfers, maintenance, etc.)
    const titleLower = (t.title || '').toLowerCase();
    if (
      titleLower.includes('transferência') ||
      titleLower.includes('transferencia') ||
      titleLower.includes('contagem') ||
      titleLower.includes('contar') ||
      titleLower.includes('etiqueta') ||
      titleLower.includes('vitrine') ||
      titleLower.includes('gaxeta') ||
      titleLower.includes('liquidificador') ||
      titleLower.includes('ventilador') ||
      titleLower.includes('frigobar') ||
      titleLower.includes('placa potencia') ||
      titleLower.includes('bebedouro') ||
      titleLower.includes('freezer') ||
      titleLower.includes('cobre') ||
      titleLower.startsWith('foto ') ||
      titleLower.startsWith('devolução') ||
      titleLower.startsWith('devolucao') ||
      titleLower.startsWith('separar ') ||
      titleLower.startsWith('procurar ')
    ) {
      return false;
    }

    // 4. Must be strictly Permanente or created in bloquinho
    if (t.task_type === 'Permanente') return true;
    if (typeof t.id === 'string' && t.id.startsWith('perm-')) return true;

    return false;
  }, []);

  const loadPermanentTasks = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Read deleted IDs
      const deletedJson = typeof window !== 'undefined' ? localStorage.getItem('deleted_permanent_task_ids') : null;
      const deletedIds = new Set<string>();
      if (deletedJson) {
        try {
          const parsedDel = JSON.parse(deletedJson);
          if (Array.isArray(parsedDel)) {
            parsedDel.forEach(id => deletedIds.add(String(id)));
          }
        } catch {}
      }

      // 2. Read saved state from localStorage and clean it
      const localSaved = typeof window !== 'undefined' ? localStorage.getItem('all_permanent_task_notes') : null;
      let localTasks: PermanentTaskNote[] = [];
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localTasks = parsed.filter(t => !deletedIds.has(String(t.id)) && isPermanentTask(t));
          }
        } catch (e) {
          console.warn('Error parsing local tasks:', e);
        }
      }

      // 3. Query Supabase strictly for task_type = 'Permanente'
      let fetchedFromDb: PermanentTaskNote[] = [];
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('task_type', 'Permanente')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const themes: ('amber' | 'purple' | 'emerald' | 'sky' | 'rose' | 'indigo')[] = [
            'amber', 'sky', 'purple', 'emerald', 'rose', 'indigo'
          ];
          fetchedFromDb = data
            .filter((t: any) => !deletedIds.has(String(t.id)) && isPermanentTask(t))
            .map((t: any, idx: number) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status || 'Pendente',
              progress: t.progress || 0,
              priority: t.priority || 'Média',
              category: t.category || 'Geral',
              task_type: 'Permanente',
              due_date: t.due_date || 'Diário',
              collaborator_id: t.collaborator_id,
              collaborator_name: t.collaborator_name || 'Responsável',
              is_fixed: true,
              is_permanent: true,
              color_theme: themes[idx % themes.length],
              has_execution_notice: false
            }));
        }
      } catch (dbErr) {
        console.warn('Supabase tasks fetch error:', dbErr);
      }

      // 4. Combine local and DB without duplicates
      const seenIds = new Set<string>();
      const combined: PermanentTaskNote[] = [];

      for (const t of localTasks) {
        const sId = String(t.id);
        if (!seenIds.has(sId) && !deletedIds.has(sId)) {
          seenIds.add(sId);
          combined.push(t);
        }
      }

      for (const t of fetchedFromDb) {
        const sId = String(t.id);
        if (!seenIds.has(sId) && !deletedIds.has(sId)) {
          seenIds.add(sId);
          combined.push(t);
        }
      }

      const hasInitialized = typeof window !== 'undefined' ? localStorage.getItem('permanent_tasks_initialized') : null;
      if (combined.length === 0 && !hasInitialized && deletedIds.size === 0) {
        const initial = INITIAL_PERMANENT_TASKS.filter(isPermanentTask);
        setTasks(initial);
        localStorage.setItem('all_permanent_task_notes', JSON.stringify(initial));
        localStorage.setItem('permanent_tasks_initialized', 'true');
      } else {
        setTasks(combined);
        localStorage.setItem('all_permanent_task_notes', JSON.stringify(combined));
        localStorage.setItem('permanent_tasks_initialized', 'true');
      }
    } catch (err) {
      console.warn('Fallback to local default permanent tasks:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [isPermanentTask]);

  useEffect(() => {
    loadCollaborators();
    loadPermanentTasks();
  }, [loadCollaborators, loadPermanentTasks]);

  useEffect(() => {
    const checkMidnightReset = () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const lastResetDate = localStorage.getItem('permanent_tasks_last_reset_date');

      if (lastResetDate && lastResetDate !== todayStr) {
        performDailyRenewal(true);
      } else {
        localStorage.setItem('permanent_tasks_last_reset_date', todayStr);
      }
    };

    checkMidnightReset();
    const interval = setInterval(checkMidnightReset, 60000);
    return () => clearInterval(interval);
  }, [tasks]);

  const performDailyRenewal = (isAuto = false) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newHistoryEntries: TaskExecutionHistory[] = tasks.map(t => ({
      id: `hist-${Date.now()}-${t.id}`,
      task_id: t.id,
      title: t.title,
      collaborator_name: t.collaborator_name || 'Não Atribuído',
      category: t.category || 'Rotina',
      status: t.status,
      progress: t.progress || 0,
      execution_date: todayStr,
      completed_at: `${todayStr} às ${nowTimeStr}`
    }));

    setHistoryLogs(prev => [...newHistoryEntries, ...prev]);

    setTasks(prev => {
      const updated = prev.map(t => ({
        ...t,
        status: 'Pendente',
        progress: 0,
        has_execution_notice: false
      }));
      localStorage.setItem('all_permanent_task_notes', JSON.stringify(updated));
      return updated;
    });

    localStorage.setItem('permanent_tasks_last_reset_date', todayStr);

    showToast(
      isAuto
        ? '🕛 Renovação Diária (00:00) executada! As tarefas foram renovadas e o histórico foi gravado.'
        : '🔄 Renovação Diária das 00:00 simulada com sucesso! Histórico gravado e tarefas redefinidas.',
      'success'
    );
  };

  const handleStatusChange = async (taskId: string | number, newStatus: string) => {
    let progressVal = 0;
    if (newStatus === 'Concluída') progressVal = 100;
    else if (newStatus === 'Em Andamento') progressVal = 50;
    else if (newStatus === 'Revisão') progressVal = 75;

    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          return { 
            ...t, 
            status: newStatus, 
            progress: progressVal,
            last_executed_at: timeNow
          };
        }
        return t;
      });
      localStorage.setItem('all_permanent_task_notes', JSON.stringify(updated));
      return updated;
    });

    const targetTask = tasks.find(t => t.id === taskId);
    const collabName = targetTask?.collaborator_name || 'Colaborador';

    showToast(
      `Status atualizado para "${newStatus}". Gestão notificada com aviso discreto!`, 
      'success'
    );

    const historyEntry: TaskExecutionHistory = {
      id: `hist-exec-${Date.now()}`,
      task_id: taskId,
      title: targetTask?.title || 'Tarefa Permanente',
      collaborator_name: collabName,
      category: targetTask?.category || 'Rotina',
      status: newStatus,
      progress: progressVal,
      execution_date: new Date().toISOString().split('T')[0],
      completed_at: `Hoje às ${timeNow}`
    };
    setHistoryLogs(prev => [historyEntry, ...prev]);

    try {
      if (typeof taskId === 'number' || (typeof taskId === 'string' && !taskId.startsWith('perm-'))) {
        await supabase
          .from('tasks')
          .update({ 
            status: newStatus, 
            progress: progressVal 
          })
          .eq('id', taskId);
      }
    } catch (e) {
      console.error('Error updating status in DB:', e);
    }
  };

  const handleProgressChange = async (taskId: string | number, newProgress: number) => {
    let newStatus = 'Em Andamento';
    if (newProgress === 100) newStatus = 'Concluída';
    else if (newProgress === 0) newStatus = 'Pendente';

    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          return { 
            ...t, 
            progress: newProgress, 
            status: newStatus,
            has_execution_notice: true
          };
        }
        return t;
      });
      localStorage.setItem('all_permanent_task_notes', JSON.stringify(updated));
      return updated;
    });

    try {
      if (typeof taskId === 'number' || (typeof taskId === 'string' && !taskId.startsWith('perm-'))) {
        await supabase
          .from('tasks')
          .update({ progress: newProgress, status: newStatus })
          .eq('id', taskId);
      }
    } catch (e) {
      console.error('Error updating progress in DB:', e);
    }
  };

  const handleAcknowledgeNotice = async (taskId: string | number) => {
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === taskId) {
          return { ...t, has_execution_notice: false };
        }
        return t;
      });
      localStorage.setItem('all_permanent_task_notes', JSON.stringify(updated));
      return updated;
    });

    showToast('Visto registrado na execução do colaborador com sucesso!', 'info');

    try {
      if (typeof taskId === 'number' || (typeof taskId === 'string' && !taskId.startsWith('perm-'))) {
        await supabase
          .from('tasks')
          .update({ has_execution_notice: false })
          .eq('id', taskId);
      }
    } catch (e) {
      console.error('Error acknowledging notice:', e);
    }
  };

  const handleAcknowledgeAllNotices = () => {
    setTasks(prev => {
      const updated = prev.map(t => ({ ...t, has_execution_notice: false }));
      localStorage.setItem('all_permanent_task_notes', JSON.stringify(updated));
      return updated;
    });
    showToast('Visto registrado em todas as execuções recentes da equipe!', 'success');
  };

  const handleCreatePermanentTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);

    let assignedCollabName = 'Colaborador Responsável';
    let assignedCollabId = selectedCollaboratorId;

    if (selectedCollaboratorId === 'custom' && customCollaboratorName.trim()) {
      assignedCollabName = customCollaboratorName.trim();
      assignedCollabId = `custom-${Date.now()}`;
    } else {
      const found = collaborators.find(c => c.id === selectedCollaboratorId);
      if (found) {
        assignedCollabName = found.name;
        assignedCollabId = found.id;
      } else if (selectedCollaboratorId) {
        assignedCollabName = selectedCollaboratorId;
      }
    }

    const newTaskObj: PermanentTaskNote = {
      id: `perm-new-${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim() || 'Instruções e rotina permanente.',
      status: 'Pendente',
      progress: 0,
      priority: newPriority,
      category: newCategory,
      task_type: 'Permanente',
      due_date: newDueDate,
      collaborator_id: assignedCollabId,
      collaborator_name: assignedCollabName,
      is_fixed: true,
      is_permanent: true,
      color_theme: 'amber',
      has_execution_notice: false
    };

    setTasks(prev => {
      const updated = [newTaskObj, ...prev];
      localStorage.setItem('all_permanent_task_notes', JSON.stringify(updated));
      return updated;
    });

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: newTitle.trim(),
          description: newDesc.trim() || 'Instruções e rotina permanente.',
          status: 'Pendente',
          progress: 0,
          priority: newPriority,
          task_type: 'Permanente',
          due_date: newDueDate,
          collaborator_id: (assignedCollabId && !assignedCollabId.startsWith('custom-')) ? assignedCollabId : null,
          created_by: userId || null
        }])
        .select()
        .single();

      if (!error && data) {
        const tempId = newTaskObj.id;
        newTaskObj.id = data.id;
        setTasks(prev => {
          const updated = prev.map(t => t.id === tempId ? { ...t, id: data.id, ...data } : t);
          localStorage.setItem('all_permanent_task_notes', JSON.stringify(updated.filter(isPermanentTask)));
          return updated;
        });
      }
    } catch (e) {
      console.warn('Saved note locally in localStorage fallback:', e);
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    setNewTitle('');
    setNewDesc('');
    setCustomCollaboratorName('');
    showToast(`Bloquinho criado e salvo com sucesso para ${assignedCollabName}!`, 'success');
  };

  const handleDeleteNote = async (id: string | number) => {
    const sId = String(id);
    try {
      const deletedJson = localStorage.getItem('deleted_permanent_task_ids');
      const deletedList: string[] = deletedJson ? JSON.parse(deletedJson) : [];
      if (!deletedList.includes(sId)) {
        deletedList.push(sId);
      }
      localStorage.setItem('deleted_permanent_task_ids', JSON.stringify(deletedList));
    } catch (e) {
      console.warn('Error saving deleted ID:', e);
    }

    setTasks(prev => {
      const updated = prev.filter(t => String(t.id) !== sId);
      localStorage.setItem('all_permanent_task_notes', JSON.stringify(updated));
      return updated;
    });
    showToast('Bloquinho removido com sucesso.', 'info');

    try {
      if (typeof id === 'string' && id.includes('-') && !id.startsWith('perm-')) {
        await supabase.from('tasks').delete().eq('id', id);
      }
    } catch (e) {
      console.error('Error deleting task from DB:', e);
    }
  };

  const permanentTasks = tasks.filter(isPermanentTask);

  const filteredTasks = permanentTasks.filter(t => {
    const matchesSearch = (
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.collaborator_name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!matchesSearch) return false;

    if (statusFilter === 'Todas') return true;
    const s = (t.status || '').toLowerCase();
    if (statusFilter === 'Pendente') return s.includes('pendent') || s.includes('fazer') || s === '';
    if (statusFilter === 'Em Andamento') return s.includes('andamento');
    if (statusFilter === 'Revisão') return s.includes('revis');
    if (statusFilter === 'Concluída') return s.includes('conclu') || t.progress === 100;
    if (statusFilter === 'Atrasada') return s.includes('atrasa') || s.includes('venci');
    return true;
  });

  const filteredHistory = historyLogs.filter(h => {
    const matchesSearch = (
      h.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.collaborator_name.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.category.toLowerCase().includes(historySearch.toLowerCase())
    );
    const matchesDate = !historyDateFilter || h.execution_date === historyDateFilter;
    return matchesSearch && matchesDate;
  });

  const totalCount = permanentTasks.length;
  const pendingCount = permanentTasks.filter(t => (t.status || '').toLowerCase().includes('pendent') || (t.status === '' && !t.progress)).length;
  const inProgressCount = permanentTasks.filter(t => (t.status || '').toLowerCase().includes('andamento') || (t.progress! > 0 && t.progress! < 100)).length;
  const reviewCount = permanentTasks.filter(t => (t.status || '').toLowerCase().includes('revis')).length;
  const completedCount = permanentTasks.filter(t => (t.status || '').toLowerCase().includes('conclu') || t.progress === 100).length;
  const overdueCount = permanentTasks.filter(t => (t.status || '').toLowerCase().includes('atrasa')).length;
  const activeNoticesCount = permanentTasks.filter(t => t.has_execution_notice).length;

  const getNoteStyles = (theme?: string, statusStr?: string) => {
    const s = (statusStr || '').toLowerCase();
    
    if (s.includes('conclu')) {
      return {
        cardBg: isDarkMode 
          ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-100 shadow-emerald-950/30' 
          : 'bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-emerald-600/10',
        pinBg: 'bg-emerald-500 text-white',
        badgeBg: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
        progressFill: 'bg-emerald-500',
        tapeColor: 'bg-emerald-400/30'
      };
    }

    if (s.includes('revis')) {
      return {
        cardBg: isDarkMode 
          ? 'bg-purple-950/40 border-purple-800/80 text-purple-100 shadow-purple-950/30' 
          : 'bg-purple-50/90 border-purple-200 text-purple-950 shadow-purple-600/10',
        pinBg: 'bg-purple-500 text-white',
        badgeBg: 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/30',
        progressFill: 'bg-purple-500',
        tapeColor: 'bg-purple-400/30'
      };
    }

    if (s.includes('andamento')) {
      return {
        cardBg: isDarkMode 
          ? 'bg-amber-950/40 border-amber-800/80 text-amber-100 shadow-amber-950/30' 
          : 'bg-amber-50/90 border-amber-200 text-amber-950 shadow-amber-600/10',
        pinBg: 'bg-amber-500 text-white',
        badgeBg: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30',
        progressFill: 'bg-amber-500',
        tapeColor: 'bg-amber-400/30'
      };
    }

    if (s.includes('atrasa')) {
      return {
        cardBg: isDarkMode 
          ? 'bg-rose-950/40 border-rose-800/80 text-rose-100 shadow-rose-950/30' 
          : 'bg-rose-50/90 border-rose-200 text-rose-950 shadow-rose-600/10',
        pinBg: 'bg-rose-500 text-white',
        badgeBg: 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30',
        progressFill: 'bg-rose-500',
        tapeColor: 'bg-rose-400/30'
      };
    }

    return {
      cardBg: isDarkMode 
        ? 'bg-sky-950/40 border-sky-800/80 text-sky-100 shadow-sky-950/30' 
        : 'bg-sky-50/90 border-sky-200 text-sky-950 shadow-sky-600/10',
      pinBg: 'bg-sky-500 text-white',
      badgeBg: 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/30',
      progressFill: 'bg-sky-500',
      tapeColor: 'bg-sky-400/30'
    };
  };

  return (
    <div className="space-y-6">
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-lg relative overflow-hidden transition-all ${
        isDarkMode 
          ? 'bg-gradient-to-br from-purple-950/70 via-slate-900 to-indigo-950/80 border-purple-800/60' 
          : 'bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 text-white border-purple-500'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="p-3.5 rounded-2xl bg-white/20 backdrop-blur-md text-white shrink-0 shadow-md">
              <Pin size={26} className="rotate-12" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Bloquinhos de Anotações — Tarefas Permanentes
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white border border-white/30">
                  {totalCount} Bloquinhos
                </span>
                {activeNoticesCount > 0 && (
                  <span className="animate-pulse text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-400 text-emerald-950 shadow-xs flex items-center gap-1">
                    <Sparkles size={12} className="animate-spin" />
                    {activeNoticesCount} Execução Notificada
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-purple-100 opacity-90 mt-1 max-w-2xl leading-relaxed">
                Suas rotinas contínuas com escolha do colaborador, renovação diária às 00:00 e aviso discreto para a gestão.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-bold text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shrink-0"
              title="Consultar Histórico de Execuções Diárias"
            >
              <History size={16} />
              <span>📜 Histórico (00:00)</span>
            </button>

            <button
              onClick={() => performDailyRenewal(false)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-bold text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shrink-0"
              title="Simular Renovação Diária das 00:00"
            >
              <RefreshCw size={15} />
              <span className="hidden sm:inline">Renovar 00:00</span>
            </button>

            <button
              onClick={() => {
                loadCollaborators();
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-purple-700 hover:bg-purple-50 active:scale-95 text-xs font-black shadow-lg transition-all cursor-pointer shrink-0"
            >
              <Plus size={18} className="text-purple-600" />
              <span>+ Criar Bloquinho</span>
            </button>
          </div>
        </div>
      </div>

      {activeNoticesCount > 0 && isManagerOrSupervisor && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-emerald-500/15 dark:bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <Sparkles size={16} className="text-emerald-500 animate-spin shrink-0" />
            <span>
              <strong>Aviso da Gestão:</strong> {activeNoticesCount} {activeNoticesCount === 1 ? 'tarefa foi executada' : 'tarefas foram executadas'} por colaboradores e aguardam seu visto.
            </span>
          </div>
          <button
            onClick={handleAcknowledgeAllNotices}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black tracking-wide shrink-0 transition-all cursor-pointer shadow-xs"
          >
            Dar Visto em Todos
          </button>
        </motion.div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'Todas', label: 'Todas', count: totalCount, activeColor: 'bg-purple-600 text-white' },
              { id: 'Pendente', label: 'Pendentes', count: pendingCount, activeColor: 'bg-sky-600 text-white' },
              { id: 'Em Andamento', label: 'Em Andamento', count: inProgressCount, activeColor: 'bg-amber-600 text-white' },
              { id: 'Revisão', label: 'Em Revisão', count: reviewCount, activeColor: 'bg-purple-600 text-white' },
              { id: 'Concluída', label: 'Concluídas', count: completedCount, activeColor: 'bg-emerald-600 text-white' },
              { id: 'Atrasada', label: 'Atrasadas', count: overdueCount, activeColor: 'bg-rose-600 text-white' }
            ].map(tab => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                    isActive
                      ? `${tab.activeColor} border-transparent shadow-md active:scale-95`
                      : isDarkMode
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[220px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por rotina ou colaborador..."
              className={`w-full h-10 pl-9 pr-4 rounded-xl text-xs font-medium outline-none border transition-all ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-purple-500' 
                  : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-purple-500 shadow-xs'
              }`}
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className={`h-56 rounded-2xl border animate-pulse ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`} />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className={`p-12 text-center rounded-3xl border ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="p-4 rounded-full bg-purple-500/10 text-purple-500 inline-block mb-3">
            <Pin size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Nenhum bloquinho encontrado</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'Todas' 
              ? 'Nenhum bloquinho de anotações corresponde aos filtros selecionados.' 
              : 'Você ainda não possui tarefas permanentes salvas.'}
          </p>
          <button
            onClick={() => {
              loadCollaborators();
              setIsModalOpen(true);
            }}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>Adicionar Primeiro Bloquinho</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          <AnimatePresence>
            {filteredTasks.map((task, idx) => {
              const style = getNoteStyles(task.color_theme, task.status);

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className={`group relative rounded-2xl border p-4 sm:p-5 flex flex-col justify-between shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${style.cardBg} ${
                    task.has_execution_notice 
                      ? 'ring-2 ring-emerald-500/70 shadow-emerald-500/20' 
                      : ''
                  }`}
                >
                  <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-3 rounded-xs ${style.tapeColor} border border-white/20 backdrop-blur-xs`} />

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${style.pinBg} shadow-xs`}>
                          <Pin size={14} className="rotate-45" />
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200 truncate">
                          📌 {task.category || 'Rotina'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteNote(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer shrink-0"
                        title="Excluir bloquinho"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {task.has_execution_notice && (
                      <div className="mb-2.5">
                        <button
                          onClick={() => handleAcknowledgeNotice(task.id)}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-emerald-500/20 dark:bg-emerald-950/80 border border-emerald-500/50 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold flex items-center justify-between gap-1.5 animate-pulse shadow-sm cursor-pointer hover:bg-emerald-500/30 transition-all"
                          title="Clique para registrar visto na execução do colaborador"
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <Sparkles size={13} className="text-emerald-500 animate-spin shrink-0" />
                            <span className="truncate">Executado por {task.collaborator_name}</span>
                          </span>
                          <span className="underline shrink-0 text-[9px] uppercase font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded-md">Visto</span>
                        </button>
                      </div>
                    )}

                    <h3 className="text-sm font-black tracking-tight leading-snug mb-2 break-words">
                      {task.title}
                    </h3>

                    <p className="text-xs opacity-85 leading-relaxed line-clamp-3 mb-4 font-sans">
                      {task.description || 'Instruções da rotina permanente.'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-black/5 dark:border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Status:</span>
                      <div className="relative shrink-0">
                        <select
                          value={task.status || 'Pendente'}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border outline-none cursor-pointer appearance-none pr-6 shadow-2xs transition-all ${style.badgeBg}`}
                        >
                          <option value="Pendente" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">🔵 Pendente</option>
                          <option value="Em Andamento" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">🟡 Em Andamento</option>
                          <option value="Revisão" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">🟣 Em Revisão</option>
                          <option value="Concluída" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">🟢 Concluída</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold opacity-75">
                        <span>Progresso</span>
                        <span>{task.progress || 0}%</span>
                      </div>
                      <div className="relative flex items-center gap-2">
                        <div className="flex-1 bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${style.progressFill}`}
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                        <button
                          onClick={() => handleProgressChange(task.id, task.progress === 100 ? 0 : 100)}
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border transition-all cursor-pointer ${
                            task.progress === 100
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                          }`}
                          title="Alternar conclusão"
                        >
                          {task.progress === 100 ? '✓' : '100%'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] opacity-85 pt-1.5 border-t border-black/5 dark:border-white/5">
                      <span className="font-bold flex items-center gap-1.5 truncate max-w-[150px] text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                        <UserCheck size={13} className="shrink-0 text-purple-600 dark:text-purple-400" />
                        <span className="truncate">{task.collaborator_name || 'Não Atribuído'}</span>
                      </span>
                      <span className="font-extrabold flex items-center gap-1 shrink-0 opacity-70">
                        <Calendar size={11} />
                        {task.due_date || 'Diário'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl relative overflow-hidden ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300">
                    <Pin size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black">Criar Novo Bloquinho Permanente</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Escolha o colaborador e defina a rotina diária</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePermanentTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Título da Rotina / Tarefa *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Conferência diária de caixa ou auditoria de estoque"
                    className={`w-full h-11 px-3.5 rounded-xl text-xs font-semibold border outline-none ${
                      isDarkMode 
                        ? 'bg-slate-800 border-slate-700 focus:border-purple-500' 
                        : 'bg-slate-50 border-slate-200 focus:border-purple-500'
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-extrabold">
                      <UserCheck size={15} />
                      Escolher Colaborador Responsável *
                    </span>
                    {isManagerOrSupervisor && (
                      <span className="text-[10px] text-purple-600 dark:text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                        Atribuição do Gestor
                      </span>
                    )}
                  </label>

                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {collaborators.slice(0, 6).map(collab => {
                      const isSelected = selectedCollaboratorId === collab.id;
                      return (
                        <button
                          key={collab.id}
                          type="button"
                          onClick={() => {
                            setSelectedCollaboratorId(collab.id);
                            setCustomCollaboratorName('');
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 border ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                              : isDarkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                              : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected && <Check size={12} />}
                          <span>{collab.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>

                  <select
                    value={selectedCollaboratorId}
                    onChange={(e) => {
                      setSelectedCollaboratorId(e.target.value);
                      if (e.target.value !== 'custom') {
                        setCustomCollaboratorName('');
                      }
                    }}
                    className={`w-full h-11 px-3.5 rounded-xl text-xs font-bold border outline-none cursor-pointer transition-all ${
                      isDarkMode 
                        ? 'bg-slate-800 border-purple-500/50 text-slate-100' 
                        : 'bg-purple-50/70 border-purple-300 text-slate-900'
                    }`}
                  >
                    {collaborators.map(c => (
                      <option key={c.id} value={c.id} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">
                        👤 {c.name} {c.role ? `(${c.role})` : ''}
                      </option>
                    ))}
                    <option value="custom" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100 font-black">
                      ✍️ Digitar Outro Colaborador / Nome Personalizado...
                    </option>
                  </select>

                  {selectedCollaboratorId === 'custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-1"
                    >
                      <input
                        type="text"
                        required
                        value={customCollaboratorName}
                        onChange={(e) => setCustomCollaboratorName(e.target.value)}
                        placeholder="Digite o nome completo do colaborador responsável..."
                        className={`w-full h-10 px-3.5 rounded-xl text-xs font-semibold border outline-none ${
                          isDarkMode 
                            ? 'bg-slate-800 border-purple-500 focus:border-purple-400' 
                            : 'bg-white border-purple-400 focus:border-purple-600'
                        }`}
                      />
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Descrição / Instruções</label>
                  <textarea
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Detalhe o passo a passo da tarefa contínua..."
                    className={`w-full p-3.5 rounded-xl text-xs font-medium border outline-none ${
                      isDarkMode 
                        ? 'bg-slate-800 border-slate-700 focus:border-purple-500' 
                        : 'bg-slate-50 border-slate-200 focus:border-purple-500'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">Categoria</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className={`w-full h-10 px-2.5 rounded-xl text-xs font-bold border outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <option value="Geral">Geral</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="Estoque">Estoque</option>
                      <option value="Manutenção">Manutenção</option>
                      <option value="Atendimento">Atendimento</option>
                      <option value="TI & Sistemas">TI & Sistemas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Frequência</label>
                    <select
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className={`w-full h-10 px-2.5 rounded-xl text-xs font-bold border outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <option value="Diário">Diário (Renovação 00:00)</option>
                      <option value="Semanal">Semanal</option>
                      <option value="Quinzenal">Quinzenal</option>
                      <option value="Mensal">Mensal</option>
                      <option value="Contínuo">Contínuo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Prioridade</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className={`w-full h-10 px-2.5 rounded-xl text-xs font-bold border outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                      <option value="Urgente">Urgente</option>
                      <option value="Baixa">Baixa</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Salvar Bloquinho</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-4xl rounded-3xl p-6 border shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300">
                    <History size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black flex items-center gap-2">
                      Histórico de Execuções Diárias
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        Consultas Futuras (00:00)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Registro diário de conclusões de rotinas permanentes para auditoria e controle
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 shrink-0">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Buscar histórico por tarefa ou colaborador..."
                    className={`w-full h-10 pl-9 pr-4 rounded-xl text-xs font-medium outline-none border transition-all ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="date"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                    className={`h-10 px-3 rounded-xl text-xs font-bold border outline-none ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  {historyDateFilter && (
                    <button
                      onClick={() => setHistoryDateFilter('')}
                      className="text-xs font-bold text-rose-500 hover:underline shrink-0 cursor-pointer"
                    >
                      Limpar Data
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
                {filteredHistory.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Nenhum registro encontrado para os filtros pesquisados.
                  </div>
                ) : (
                  filteredHistory.map(entry => (
                    <div 
                      key={entry.id}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        isDarkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                            {entry.title}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                            {entry.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400">
                            <UserCheck size={13} />
                            {entry.collaborator_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {entry.completed_at}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                            entry.status === 'Concluída' 
                              ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30' 
                              : entry.status === 'Em Andamento'
                              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
                              : 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/30'
                          }`}>
                            {entry.status} ({entry.progress}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 shrink-0 text-xs text-slate-500">
                <span>Total de {filteredHistory.length} execuções registradas</span>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
                >
                  Fechar Histórico
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
