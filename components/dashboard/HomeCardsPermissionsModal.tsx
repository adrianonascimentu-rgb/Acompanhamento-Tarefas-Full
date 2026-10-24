'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  LayoutGrid,
  Check,
  Search,
  User,
  ShieldCheck,
  RotateCcw,
  CheckSquare,
  Square,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  HOME_PAGE_CARDS,
  getDefaultHomeCardsForRole,
  useRole,
} from '@/hooks/useRole';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/authFetch';
import { useUI } from '@/hooks/useUI';

interface HomeCardsPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  initialCollaboratorId?: string;
}

const ROLE_DISPLAY: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  supervisor: 'Supervisor',
  caixa: 'Caixa',
  vendedor: 'Vendedor',
  entregador: 'Entregador',
  estoque: 'Estoquista',
  user: 'Colaborador',
};

function resolveCollaboratorRoleKey(person: any): string {
  const validLevels = [
    'admin',
    'gerente',
    'supervisor',
    'caixa',
    'vendedor',
    'entregador',
    'estoque',
    'user',
  ];
  const savedLevel = String(person?.access_level || '')
    .toLowerCase()
    .trim();
  const typeStr = String(person?.type || '')
    .toLowerCase()
    .trim();
  const roleStr = String(person?.role || '')
    .toLowerCase()
    .trim();

  if (savedLevel && validLevels.includes(savedLevel)) return savedLevel;
  if (typeStr && validLevels.includes(typeStr) && typeStr !== 'user') return typeStr;
  if (typeStr === 'admin' || roleStr.includes('admin')) return 'admin';
  if (roleStr.includes('gerente') || roleStr.includes('gestor')) return 'gerente';
  if (roleStr.includes('supervisor') || roleStr.includes('coordenador')) return 'supervisor';
  if (roleStr.includes('caixa') || roleStr.includes('financeiro')) return 'caixa';
  if (roleStr.includes('vendedor') || roleStr.includes('venda')) return 'vendedor';
  if (roleStr.includes('entreg') || roleStr.includes('motorista')) return 'entregador';
  if (roleStr.includes('estoq') || roleStr.includes('almoxarif')) return 'estoque';
  return 'user';
}

export function HomeCardsPermissionsModal({
  isOpen,
  onClose,
  isDarkMode,
  initialCollaboratorId,
}: HomeCardsPermissionsModalProps) {
  const { refreshUser } = useRole();
  const { showToast } = useUI();

  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [accessConfigMap, setAccessConfigMap] = useState<Record<string, any>>({});
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [cardsState, setCardsState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCollaboratorsAndConfig = useCallback(async () => {
    setLoading(true);
    try {
      let collabList: any[] = [];
      let configMap: Record<string, any> = {};

      // 1. Buscar config atual em system_settings
      try {
        const { data: cfgRow } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'collaborator_access_config')
          .maybeSingle();
        if (cfgRow?.value && typeof cfgRow.value === 'object') {
          configMap = cfgRow.value;
        }
      } catch {}

      // 2. Buscar lista de colaboradores via API ou Supabase
      try {
        const res = await authFetch(`/api/collaborators?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.collaborators)) {
            collabList = json.collaborators.filter(
              (c: any) =>
                c.status !== 'Inativo' &&
                String(c.role || '').toLowerCase().trim() !== 'entregador avulso'
            );
          }
        }
      } catch {}

      if (collabList.length === 0) {
        const { data: sbProfiles } = await supabase
          .from('profiles')
          .select('*')
          .order('name');
        collabList = (sbProfiles || []).filter(
          (c: any) =>
            c.status !== 'Inativo' &&
            String(c.role || '').toLowerCase().trim() !== 'entregador avulso'
        );
      }

      setAccessConfigMap(configMap);
      setCollaborators(collabList);

      const targetId =
        initialCollaboratorId && collabList.some(c => c.id === initialCollaboratorId)
          ? initialCollaboratorId
          : collabList[0]?.id || '';

      if (targetId) {
        setSelectedId(targetId);
        const person = collabList.find(c => c.id === targetId);
        const roleKey = resolveCollaboratorRoleKey(person);
        const defaults = getDefaultHomeCardsForRole(roleKey);
        const savedCards =
          configMap[targetId]?.homeCards || person?.homeCards || {};
        setCardsState({
          ...defaults,
          ...savedCards,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar colaboradores para configuração de cards:', err);
    } finally {
      setLoading(false);
    }
  }, [initialCollaboratorId]);

  useEffect(() => {
    if (isOpen) {
      loadCollaboratorsAndConfig();
    }
  }, [isOpen, loadCollaboratorsAndConfig]);

  const handleSelectCollaborator = (person: any) => {
    setSelectedId(person.id);
    const roleKey = resolveCollaboratorRoleKey(person);
    const defaults = getDefaultHomeCardsForRole(roleKey);
    const savedCards =
      accessConfigMap[person.id]?.homeCards || person?.homeCards || {};
    setCardsState({
      ...defaults,
      ...savedCards,
    });
  };

  const selectedPerson = collaborators.find(c => c.id === selectedId);
  const selectedRoleKey = selectedPerson
    ? resolveCollaboratorRoleKey(selectedPerson)
    : 'user';

  const handleToggleCard = (cardId: string) => {
    setCardsState(prev => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const handleEnableAll = () => {
    const allEnabled: Record<string, boolean> = {};
    HOME_PAGE_CARDS.forEach(c => {
      allEnabled[c.id] = true;
    });
    setCardsState(allEnabled);
  };

  const handleDisableAll = () => {
    const allDisabled: Record<string, boolean> = {};
    HOME_PAGE_CARDS.forEach(c => {
      allDisabled[c.id] = false;
    });
    setCardsState(allDisabled);
  };

  const handleRestoreDefaults = () => {
    setCardsState(getDefaultHomeCardsForRole(selectedRoleKey));
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      // 1. Salvar via API
      try {
        await authFetch('/api/collaborators', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedId,
            access_level: selectedRoleKey,
            homeCards: cardsState,
            onlyAccessConfig: true,
          }),
        });
      } catch (e) {
        console.warn('Fallback para salvamento direto no Supabase:', e);
      }

      // 2. Garantir persistência em system_settings (collaborator_access_config)
      const { data: existingRow } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'collaborator_access_config')
        .maybeSingle();

      const currentMap =
        existingRow?.value && typeof existingRow.value === 'object'
          ? existingRow.value
          : {};
      const prevEntry = currentMap[selectedId] || {};

      const updatedMap = {
        ...currentMap,
        [selectedId]: {
          ...prevEntry,
          accessLevel: prevEntry.accessLevel || selectedRoleKey,
          submodules: prevEntry.submodules || selectedPerson?.submodules || {},
          homeCards: cardsState,
          updatedAt: new Date().toISOString(),
        },
      };

      await supabase.from('system_settings').upsert({
        key: 'collaborator_access_config',
        value: updatedMap,
        updated_at: new Date().toISOString(),
      });

      setAccessConfigMap(updatedMap);
      window.dispatchEvent(new CustomEvent('collaborator-access-updated'));
      await refreshUser();

      showToast(
        `Cards da página inicial atualizados para ${selectedPerson?.name || 'o colaborador'}!`,
        'success'
      );
    } catch (err) {
      console.error('Erro ao salvar visibilidade de cards:', err);
      showToast('Erro ao salvar configuração de cards.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const filteredCollaborators = collaborators.filter(c => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      String(c.name || '')
        .toLowerCase()
        .includes(q) ||
      String(c.role || '')
        .toLowerCase()
        .includes(q) ||
      String(c.location || '')
        .toLowerCase()
        .includes(q)
    );
  });

  const enabledCount = HOME_PAGE_CARDS.filter(c => cardsState[c.id]).length;
  const categories = [
    'Topo & Atalhos',
    'Indicadores & Operação',
    'Gráficos & Resumos',
  ] as const;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className={`w-full max-w-4xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
            isDarkMode
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl bg-blue-600/15 text-blue-600 dark:text-blue-400 shrink-0">
                <LayoutGrid size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-black tracking-tight truncate">
                  Visibilidade de Cards da Página Inicial
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Defina quais blocos e indicadores cada colaborador pode visualizar no início
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="size-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Left Column: Collaborator Selector */}
              <div
                className={`w-full md:w-72 border-b md:border-b-0 md:border-r flex flex-col shrink-0 ${
                  isDarkMode ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Buscar colaborador..."
                      className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-blue-600/20 ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500'
                          : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto p-2 gap-1.5 max-h-36 md:max-h-none">
                  {filteredCollaborators.map(person => {
                    const isSelected = person.id === selectedId;
                    const rKey = resolveCollaboratorRoleKey(person);
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => handleSelectCollaborator(person)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all shrink-0 md:w-full border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                            : isDarkMode
                            ? 'bg-slate-900/60 border-slate-800/80 text-slate-200 hover:bg-slate-800'
                            : 'bg-white border-slate-200/70 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <div className="relative size-8 rounded-full overflow-hidden shrink-0 border border-white/20">
                          <Image
                            src={
                              person.image_url ||
                              `https://picsum.photos/seed/${person.id}/100`
                            }
                            alt={person.name || 'Colaborador'}
                            fill
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate leading-tight">
                            {person.name}
                          </p>
                          <p
                            className={`text-[10px] truncate ${
                              isSelected
                                ? 'text-blue-100'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {person.role || ROLE_DISPLAY[rKey] || 'Colaborador'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Card Toggles */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                {selectedPerson ? (
                  <>
                    {/* Collaborator Info & Quick Actions Bar */}
                    <div
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isDarkMode
                          ? 'bg-slate-800/50 border-slate-800'
                          : 'bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative size-10 rounded-full overflow-hidden shrink-0 border-2 border-blue-500/40">
                          <Image
                            src={
                              selectedPerson.image_url ||
                              `https://picsum.photos/seed/${selectedPerson.id}/100`
                            }
                            alt={selectedPerson.name || 'Colaborador'}
                            fill
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black truncate">
                              {selectedPerson.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              {ROLE_DISPLAY[selectedRoleKey] || selectedPerson.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {enabledCount} de {HOME_PAGE_CARDS.length} cards habilitados na Página Inicial
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={handleEnableAll}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/25 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Liberar Todos</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRestoreDefaults}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-blue-600/15 text-blue-600 dark:text-blue-400 hover:bg-blue-600/25 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw size={13} />
                          <span>Padrão do Cargo</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDisableAll}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-rose-600/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600/25 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <EyeOff size={13} />
                          <span>Ocultar Todos</span>
                        </button>
                      </div>
                    </div>

                    {/* Grouped Cards */}
                    {categories.map(category => {
                      const items = HOME_PAGE_CARDS.filter(
                        c => c.category === category
                      );
                      return (
                        <div key={category} className="space-y-2.5">
                          <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            {category}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {items.map(card => {
                              const isEnabled = Boolean(cardsState[card.id]);
                              return (
                                <button
                                  key={card.id}
                                  type="button"
                                  onClick={() => handleToggleCard(card.id)}
                                  className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                    isEnabled
                                      ? isDarkMode
                                        ? 'bg-blue-600/10 border-blue-600/60'
                                        : 'bg-blue-50/70 border-blue-300'
                                      : isDarkMode
                                      ? 'bg-slate-900/60 border-slate-800 opacity-65 hover:opacity-100'
                                      : 'bg-white border-slate-200 opacity-70 hover:opacity-100'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`size-2 rounded-full shrink-0 ${
                                          isEnabled ? 'bg-emerald-500' : 'bg-slate-400'
                                        }`}
                                      />
                                      <p
                                        className={`text-xs font-bold truncate ${
                                          isEnabled
                                            ? isDarkMode
                                              ? 'text-white'
                                              : 'text-slate-900'
                                            : 'text-slate-500'
                                        }`}
                                      >
                                        {card.label}
                                      </p>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                      {card.desc}
                                    </p>
                                  </div>

                                  <div
                                    className={`w-10 h-5 rounded-full relative transition-all duration-200 shrink-0 ${
                                      isEnabled
                                        ? 'bg-blue-600'
                                        : isDarkMode
                                        ? 'bg-slate-800'
                                        : 'bg-slate-200'
                                    }`}
                                  >
                                    <div
                                      className={`absolute top-0.5 size-4 rounded-full bg-white shadow-xs transition-all duration-200 ${
                                        isEnabled ? 'left-5.5' : 'left-0.5'
                                      }`}
                                    />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Selecione um colaborador à esquerda para configurar os cards.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/50">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
              As alterações têm efeito imediato na Página Inicial do colaborador.
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300/80'
                }`}
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !selectedId}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                {saving ? (
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                <span>Salvar Cards deste Colaborador</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
