'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Globe, Package, Plus, 
  CheckCircle2, Clock, 
  X, Users, Calendar, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useTheme } from '@/hooks/useTheme';
import { useUI } from '@/hooks/useUI';
import { BottomNav } from '@/components/BottomNav';

interface RoutineTask {
  id: string;
  title: string;
  category: 'site' | 'mercadolivre';
  assignee: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  status: 'Pendente' | 'Em Andamento' | 'Concluído';
  deadline: string;
  description: string;
}

const STORAGE_KEY = 'agentx_site_ml_routines';

export default function SiteAndMarketplacePlannerPage() {
  const { isDarkMode } = useTheme();
  const { showToast } = useUI();
  const [activeCategory, setActiveCategory] = useState<'all' | 'site' | 'mercadolivre'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const [tasks, setTasks] = useState<RoutineTask[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [
      {
        id: 'TASK-01',
        title: 'Otimizar SEO das páginas de categorias principais',
        category: 'site',
        assignee: 'Carlos Silva',
        priority: 'Alta',
        status: 'Em Andamento',
        deadline: '2026-10-25',
        description: 'Revisar tags H1, meta descriptions e palavras-chave de autopeças na Loja Virtual.'
      },
      {
        id: 'TASK-02',
        title: 'Atualizar banners da home com promoções de frete grátis',
        category: 'site',
        assignee: 'Mariana Souza',
        priority: 'Média',
        status: 'Pendente',
        deadline: '2026-10-20',
        description: 'Criar e subir novos banners rotativos para o banner principal do e-commerce.'
      },
      {
        id: 'TASK-03',
        title: 'Revisar fichas técnicas e fotos dos 20 mais vendidos',
        category: 'mercadolivre',
        assignee: 'Roberto Mendes',
        priority: 'Urgente',
        status: 'Em Andamento',
        deadline: '2026-10-18',
        description: 'Garantir que todos os anúncios do Mercado Livre tenham fotos em fundo branco e compatibilidade detalhada.'
      },
      {
        id: 'TASK-04',
        title: 'Planejar estratégia de estoque para o Full (Mercado Envios)',
        category: 'mercadolivre',
        assignee: 'Adriano Nascimento',
        priority: 'Alta',
        status: 'Pendente',
        deadline: '2026-10-22',
        description: 'Separar lotes de pastilhas de freio e amortecedores para envio ao centro de distribuição do Mercado Livre.'
      },
      {
        id: 'TASK-05',
        title: 'Testar fluxo de checkout e integração de pagamento pix/cartão',
        category: 'site',
        assignee: 'Carlos Silva',
        priority: 'Urgente',
        status: 'Concluído',
        deadline: '2026-10-15',
        description: 'Simular compras com cartão e Pix para certificar zero falhas na conversão da Loja Virtual.'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'site' as 'site' | 'mercadolivre',
    assignee: 'Carlos Silva',
    priority: 'Média' as 'Baixa' | 'Média' | 'Alta' | 'Urgente',
    deadline: '',
    description: ''
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      showToast('Informe o título da tarefa ou rotina', 'error');
      return;
    }
    const newTask: RoutineTask = {
      id: `TASK-${Math.floor(Math.random() * 9000 + 1000)}`,
      title: form.title,
      category: form.category,
      assignee: form.assignee,
      priority: form.priority,
      status: 'Pendente',
      deadline: form.deadline || '2026-10-30',
      description: form.description
    };
    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTasks));
    } catch {}

    setIsModalOpen(false);
    setForm({ title: '', category: 'site', assignee: 'Carlos Silva', priority: 'Média', deadline: '', description: '' });
    showToast('Ação planejada e gravada com sucesso!', 'success');
  };

  const handleToggleStatus = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'Pendente' ? 'Em Andamento' : t.status === 'Em Andamento' ? 'Concluído' : 'Pendente';
        return { ...t, status: nextStatus as any };
      }
      return t;
    });
    setTasks(updated);
    showToast('Status atualizado com sucesso!', 'success');
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Deseja excluir esta ação/rotina?')) {
      const updated = tasks.filter(t => t.id !== taskId);
      setTasks(updated);
      showToast('Ação removida com sucesso.', 'info');
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (activeCategory !== 'all' && t.category !== activeCategory) return false;
    if (statusFilter !== 'todos' && t.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    return true;
  });

  const siteTasks = filteredTasks.filter(t => t.category === 'site');
  const mlTasks = filteredTasks.filter(t => t.category === 'mercadolivre');

  const siteTotalCount = tasks.filter(t => t.category === 'site').length;
  const mlTotalCount = tasks.filter(t => t.category === 'mercadolivre').length;

  return (
    <div className={`min-h-screen pb-24 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 px-6 py-4 backdrop-blur-md border-b ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className={`p-2 rounded-xl border transition-colors ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <Globe size={18} />
            </Link>
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-md shadow-orange-500/20">
              <ShoppingBag size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">Site & Mercado Livre</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Rotinas & Planejamento Gravado
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Definição de rotinas, delegação de tarefas e planejamento de ações específicas separadas por canal</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-md shadow-orange-500/25 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Nova Ação / Rotina</span>
            </button>
          </div>
        </div>

        {/* Category Split Filters */}
        <div className="flex items-center justify-between flex-wrap gap-3 mt-5">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'Todas as Ações', count: tasks.length },
              { id: 'site', label: '🌐 Ações do Site (Loja Virtual)', count: siteTotalCount },
              { id: 'mercadolivre', label: '📦 Ações do Mercado Livre', count: mlTotalCount },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                    : isDarkMode 
                    ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800' 
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeCategory === cat.id ? 'bg-white text-amber-600' : 'bg-amber-500/15 text-amber-500'}`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Status:</span>
            {['todos', 'pendente', 'em andamento', 'concluído'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  statusFilter === st 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : isDarkMode ? 'bg-slate-900 text-slate-400 border border-slate-800' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Split Comparison Overview Cards */}
        <div className={`grid grid-cols-1 ${activeCategory === 'all' ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
          
          {/* Site Overview Column */}
          {(activeCategory === 'all' || activeCategory === 'site') && (
            <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">Site & Loja Virtual</h3>
                    <p className="text-[11px] text-slate-400">Rotinas de SEO, banners, design e conversão</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600">
                  {siteTasks.length} ações
                </span>
              </div>

              <div className="space-y-3">
                {siteTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Nenhuma ação encontrada para o filtro selecionado.</p>
                ) : (
                  siteTasks.map((task) => (
                    <div key={task.id} className={`p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-50 border-slate-200/60'}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">{task.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            task.priority === 'Urgente' ? 'bg-rose-500/10 text-rose-500' :
                            task.priority === 'Alta' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(task.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                              task.status === 'Concluído' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' :
                              task.status === 'Em Andamento' ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                            }`}
                            title="Clique para alternar status"
                          >
                            {task.status} 🔄
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{task.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{task.description}</p>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Users size={13} className="text-blue-500" />
                          <span>{task.assignee}</span>
                        </div>
                        <div className="flex items-center gap-1 font-medium">
                          <Calendar size={13} className="text-amber-500" />
                          <span>{task.deadline}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Mercado Livre Overview Column */}
          {(activeCategory === 'all' || activeCategory === 'mercadolivre') && (
            <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">Mercado Livre</h3>
                    <p className="text-[11px] text-slate-400">Gestão de anúncios, Full, reputação e campanhas</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600">
                  {mlTasks.length} ações
                </span>
              </div>

              <div className="space-y-3">
                {mlTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Nenhuma ação encontrada para o filtro selecionado.</p>
                ) : (
                  mlTasks.map((task) => (
                    <div key={task.id} className={`p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-50 border-slate-200/60'}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">{task.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            task.priority === 'Urgente' ? 'bg-rose-500/10 text-rose-500' :
                            task.priority === 'Alta' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(task.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                              task.status === 'Concluído' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' :
                              task.status === 'Em Andamento' ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                            }`}
                            title="Clique para alternar status"
                          >
                            {task.status} 🔄
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{task.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{task.description}</p>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Users size={13} className="text-amber-500" />
                          <span>{task.assignee}</span>
                        </div>
                        <div className="flex items-center gap-1 font-medium">
                          <Calendar size={13} className="text-amber-500" />
                          <span>{task.deadline}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* New Task / Routine Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl space-y-5 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black">Planejar Nova Ação / Rotina</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Canal / Categoria</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setForm({...form, category: 'site'})}
                    className={`p-3 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      form.category === 'site' ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600' : 'border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}
                  >
                    <Globe size={16} />
                    <span>Site (Loja Virtual)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({...form, category: 'mercadolivre'})}
                    className={`p-3 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      form.category === 'mercadolivre' ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-600' : 'border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}
                  >
                    <Package size={16} />
                    <span>Mercado Livre</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Título da Ação / Rotina</label>
                <input 
                  required
                  type="text"
                  placeholder="ex: Otimizar fotos dos produtos Full..."
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  className={`w-full mt-1 px-4 py-3 rounded-xl border text-xs outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Responsável</label>
                  <input 
                    type="text"
                    placeholder="Nome do colaborador"
                    value={form.assignee}
                    onChange={(e) => setForm({...form, assignee: e.target.value})}
                    className={`w-full mt-1 px-4 py-3 rounded-xl border text-xs outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Prioridade</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({...form, priority: e.target.value as any})}
                    className={`w-full mt-1 px-4 py-3 rounded-xl border text-xs outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Prazo (Deadline)</label>
                <input 
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({...form, deadline: e.target.value})}
                  className={`w-full mt-1 px-4 py-3 rounded-xl border text-xs outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Descrição da Rotina / Ação</label>
                <textarea 
                  rows={3}
                  placeholder="Descreva os detalhes da tarefa..."
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className={`w-full mt-1 px-4 py-3 rounded-xl border text-xs outline-none resize-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Salvar e Gravar Ação
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
