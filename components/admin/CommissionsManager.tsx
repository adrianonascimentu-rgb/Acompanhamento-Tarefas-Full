'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, DollarSign, CheckCircle2, Clock, Plus, Search, 
  Filter, Download, Trash2, Edit2, RotateCcw, AlertCircle,
  Building, ShoppingCart, Percent, Calendar, Check, X,
  FileSpreadsheet, ArrowUpDown, ChevronDown, Sliders, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PartnerCommission, INITIAL_COMMISSIONS } from '@/lib/initialCommissions';

interface CommissionsManagerProps {
  isDarkMode?: boolean;
}

export interface CommissionTier {
  id: string;
  name: string;
  min: number;
  max: number; // Infinity for unlimited
  percentage: string; // e.g., '3%'
}

const DEFAULT_TIERS: CommissionTier[] = [
  { id: 'tier-1', name: 'Faixa Inicial', min: 0, max: 3000, percentage: '2.5%' },
  { id: 'tier-2', name: 'Faixa Padrão', min: 3000.01, max: 8000, percentage: '3%' },
  { id: 'tier-3', name: 'Faixa Avançada', min: 8000.01, max: 20000, percentage: '3.5%' },
  { id: 'tier-4', name: 'Faixa Premium (Alto Faturamento)', min: 20000.01, max: 9999999, percentage: '4%' }
];

export default function CommissionsManager({ isDarkMode = false }: CommissionsManagerProps) {
  const [commissions, setCommissions] = useState<PartnerCommission[]>(INITIAL_COMMISSIONS);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartner, setSelectedPartner] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedSeller, setSelectedSeller] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');

  // Faixas de Faturamento State
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('commission_billing_tiers');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return DEFAULT_TIERS;
  });
  const [showTiersModal, setShowTiersModal] = useState(false);
  const [newTier, setNewTier] = useState({ name: 'Nova Faixa', min: 0, max: 10000, percentage: '3%' });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState<PartnerCommission | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<PartnerCommission>>({
    sequencia: '',
    data_venda: new Date().toLocaleDateString('pt-BR'),
    valor_venda: 0,
    percentual_desconto: '',
    data_entrega: '',
    tipo_pagamento: 'Pix',
    valor_comissao: 0,
    percentual_comissao: '3%',
    pago: false,
    data_pagamento: '',
    vendedor: 'Alex',
    loja: '5',
    parceiro: 'Luciano',
    codigo_parceiro: '295255'
  });

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/commissions');
      const data = await res.json();
      if (data.success && Array.isArray(data.commissions) && data.commissions.length > 0) {
        setCommissions(data.commissions);
      } else {
        setCommissions(INITIAL_COMMISSIONS);
      }
    } catch (err) {
      console.warn('Falha ao buscar comissões da API, usando dados iniciais:', err);
      setCommissions(INITIAL_COMMISSIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  // Salvar faixas no localStorage
  const saveTiers = (tiers: CommissionTier[]) => {
    setCommissionTiers(tiers);
    try {
      localStorage.setItem('commission_billing_tiers', JSON.stringify(tiers));
    } {}
    showToast('Faixas de faturamento atualizadas com sucesso!', 'success');
  };

  // Determinar percentual baseado na faixa de faturamento do valor da venda
  const getPercentageForValue = (val: number): string => {
    for (const tier of commissionTiers) {
      if (val >= tier.min && val <= tier.max) {
        return tier.percentage;
      }
    }
    // Fallback
    return '3%';
  };

  // Recalcular comissão automaticamente no form quando valor_venda mudar
  const handleVendaChange = (valStr: string) => {
    const val = parseFloat(valStr.replace(',', '.')) || 0;
    
    // Determinar percentual com base nas faixas cadastradas
    const matchedPercentage = getPercentageForValue(val);
    const percNum = parseFloat(matchedPercentage.replace('%', '').replace(',', '.')) || 3;
    const calcComissao = Number(((val * percNum) / 100).toFixed(2));
    
    setFormData(prev => ({
      ...prev,
      valor_venda: val,
      percentual_comissao: matchedPercentage,
      valor_comissao: calcComissao
    }));
  };

  const handlePercComissaoChange = (percStr: string) => {
    const percNum = parseFloat(percStr.replace('%', '').replace(',', '.')) || 0;
    const val = Number(formData.valor_venda) || 0;
    const calcComissao = Number(((val * percNum) / 100).toFixed(2));

    setFormData(prev => ({
      ...prev,
      percentual_comissao: percStr,
      valor_comissao: calcComissao
    }));
  };

  const handleOpenNewModal = () => {
    setEditingCommission(null);
    setFormData({
      sequencia: '',
      data_venda: new Date().toLocaleDateString('pt-BR'),
      valor_venda: 0,
      percentual_desconto: '0%',
      data_entrega: '',
      tipo_pagamento: 'Pix',
      valor_comissao: 0,
      percentual_comissao: '3%',
      pago: false,
      data_pagamento: '',
      vendedor: 'Alex',
      loja: '5',
      parceiro: 'Luciano',
      codigo_parceiro: '295255'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PartnerCommission) => {
    setEditingCommission(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCommission) {
        // Atualizar
        const res = await fetch('/api/admin/commissions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, id: editingCommission.id })
        });
        const data = await res.json();
        if (data.success) {
          setCommissions(prev => prev.map(c => c.id === editingCommission.id ? data.commission : c));
          showToast('Registro de comissão atualizado com sucesso!', 'success');
        } else {
          throw new Error(data.error);
        }
      } else {
        // Criar
        const res = await fetch('/api/admin/commissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success) {
          setCommissions(prev => [data.commission, ...prev]);
          showToast('Comissão cadastrada com sucesso!', 'success');
        } else {
          throw new Error(data.error);
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar comissão.', 'error');
    }
  };

  const handleTogglePago = async (commission: PartnerCommission) => {
    try {
      const nextPago = !commission.pago;
      const todayStr = new Date().toLocaleDateString('pt-BR');
      const updatedData: Partial<PartnerCommission> = {
        id: commission.id,
        pago: nextPago,
        data_pagamento: nextPago ? (commission.data_pagamento || todayStr) : ''
      };

      const res = await fetch('/api/admin/commissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      const data = await res.json();
      if (data.success) {
        setCommissions(prev => prev.map(c => c.id === commission.id ? data.commission : c));
        showToast(nextPago ? 'Marcado como PAGO!' : 'Marcado como PENDENTE!', 'success');
      }
    } catch (err) {
      showToast('Erro ao atualizar status de pagamento.', 'error');
    }
  };

  const handleDelete = async (id: string, sequencia: string) => {
    if (!confirm(`Tem certeza que deseja excluir o registro de comissão Sequência #${sequencia}?`)) return;
    try {
      const res = await fetch(`/api/admin/commissions?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setCommissions(prev => prev.filter(c => c.id !== id));
        showToast('Registro de comissão excluído.', 'info');
      }
    } catch (err) {
      showToast('Erro ao excluir registro.', 'error');
    }
  };

  const handleResetToSpreadsheet = async () => {
    if (!confirm('Deseja recarregar e redefinir todas as comissões com os 44 registros originais da planilha?')) return;
    try {
      const res = await fetch('/api/admin/commissions', { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setCommissions(data.commissions);
        showToast('Planilha de comissões original restaurada!', 'success');
      }
    } catch (err) {
      showToast('Erro ao redefinir comissões.', 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Sequência',
      'Data Venda',
      'V. Venda',
      '% de Desconto',
      'Data Entrega',
      'Tipo Pagamento',
      'V. Comissão',
      '% Comissão',
      'Pago',
      'Data Pagamento',
      'Vendedor',
      'Loja',
      'Parceiro',
      'Cód. Parceiro'
    ];

    const rows = filteredCommissions.map(c => [
      `"${c.sequencia}"`,
      `"${c.data_venda}"`,
      `"${c.valor_venda.toFixed(2).replace('.', ',')}"`,
      `"${c.percentual_desconto || ''}"`,
      `"${c.data_entrega || ''}"`,
      `"${c.tipo_pagamento || ''}"`,
      `"${c.valor_comissao.toFixed(2).replace('.', ',')}"`,
      `"${c.percentual_comissao || ''}"`,
      `"${c.pago ? 'Sim' : 'Não'}"`,
      `"${c.data_pagamento || ''}"`,
      `"${c.vendedor || ''}"`,
      `"${c.loja || ''}"`,
      `"${c.parceiro || ''}"`,
      `"${c.codigo_parceiro || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_comissionados_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Planilha CSV exportada com sucesso!', 'success');
  };

  // Distinct Lists for Filtering
  const partnerList = useMemo(() => Array.from(new Set(commissions.map(c => c.parceiro).filter(Boolean))), [commissions]);
  const sellerList = useMemo(() => Array.from(new Set(commissions.map(c => c.vendedor).filter(Boolean))), [commissions]);
  const storeList = useMemo(() => Array.from(new Set(commissions.map(c => c.loja).filter(Boolean))), [commissions]);

  // Filtered Commissions
  const filteredCommissions = useMemo(() => {
    return commissions.filter(c => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        c.sequencia.toLowerCase().includes(q) ||
        c.parceiro.toLowerCase().includes(q) ||
        c.codigo_parceiro.toLowerCase().includes(q) ||
        c.vendedor.toLowerCase().includes(q) ||
        (c.tipo_pagamento && c.tipo_pagamento.toLowerCase().includes(q));

      const matchesPartner = selectedPartner === 'all' || c.parceiro === selectedPartner;
      const matchesStatus = 
        selectedStatus === 'all' || 
        (selectedStatus === 'paid' && c.pago) || 
        (selectedStatus === 'pending' && !c.pago);
      const matchesSeller = selectedSeller === 'all' || c.vendedor === selectedSeller;
      const matchesStore = selectedStore === 'all' || c.loja === selectedStore;

      return matchesSearch && matchesPartner && matchesStatus && matchesSeller && matchesStore;
    });
  }, [commissions, searchTerm, selectedPartner, selectedStatus, selectedSeller, selectedStore]);

  // Totais e KPIs calculados dinamicamente com base no filtro ativo
  const metrics = useMemo(() => {
    const totalVenda = filteredCommissions.reduce((acc, c) => acc + (Number(c.valor_venda) || 0), 0);
    const totalComissao = filteredCommissions.reduce((acc, c) => acc + (Number(c.valor_comissao) || 0), 0);

    const pagas = filteredCommissions.filter(c => c.pago);
    const pendentes = filteredCommissions.filter(c => !c.pago);

    const valorPago = pagas.reduce((acc, c) => acc + (Number(c.valor_comissao) || 0), 0);
    const valorPendente = pendentes.reduce((acc, c) => acc + (Number(c.valor_comissao) || 0), 0);

    return {
      totalVenda,
      totalComissao,
      countPagas: pagas.length,
      valorPago,
      countPendentes: pendentes.length,
      valorPendente,
      totalRegistros: filteredCommissions.length
    };
  }, [filteredCommissions]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold border backdrop-blur-md ${
              toastMessage.type === 'error'
                ? 'bg-rose-500/90 text-white border-rose-600'
                : toastMessage.type === 'info'
                  ? 'bg-blue-600/90 text-white border-blue-700'
                  : 'bg-emerald-600/90 text-white border-emerald-700'
            }`}
          >
            {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
              <Percent size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Gestão de Comissionados & Faixas de Faturamento
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure regras de comissão baseadas em faixas de faturamento e controle pagamentos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowTiersModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 transition-colors"
          >
            <Layers size={15} />
            <span>Configurar Faixas de Faturamento</span>
          </button>

          <button
            onClick={handleResetToSpreadsheet}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Recarregar os 44 registros originais"
          >
            <RotateCcw size={14} className="text-amber-500" />
            <span>Restaurar Planilha</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download size={14} className="text-blue-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total em Vendas</p>
          <p className="text-lg font-black mt-1 text-slate-900 dark:text-white">
            R$ {metrics.totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{metrics.totalRegistros} vendas filtradas</p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de Comissões</p>
          <p className="text-lg font-black mt-1 text-purple-600 dark:text-purple-400">
            R$ {metrics.totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Soma geral de comissões</p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Comissões Quitadas</p>
          <p className="text-lg font-black mt-1 text-emerald-600 dark:text-emerald-400">
            R$ {metrics.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{metrics.countPagas} pagamentos realizados</p>
        </div>

        <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Comissões Pendentes</p>
          <p className="text-lg font-black mt-1 text-amber-600 dark:text-amber-400">
            R$ {metrics.valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{metrics.countPendentes} a pagar</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por sequência, parceiro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="paid">Pagos</option>
            <option value="pending">Pendentes</option>
          </select>

          {/* Partner Filter */}
          <select
            value={selectedPartner}
            onChange={(e) => setSelectedPartner(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none"
          >
            <option value="all">Todos os Parceiros</option>
            {partnerList.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Seller Filter */}
          <select
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none"
          >
            <option value="all">Todos Vendedores</option>
            {sellerList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-black uppercase text-[10px] tracking-wider ${
                isDarkMode ? 'bg-slate-800/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="py-3 px-4">Sequência</th>
                <th className="py-3 px-3">Data Venda</th>
                <th className="py-3 px-3">V. Venda</th>
                <th className="py-3 px-3">% Desc</th>
                <th className="py-3 px-3">Entrega</th>
                <th className="py-3 px-3">Pagamento</th>
                <th className="py-3 px-3 text-purple-600 dark:text-purple-400">V. Comissão</th>
                <th className="py-3 px-3">% Com.</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Dt. Pgto</th>
                <th className="py-3 px-3">Vendedor</th>
                <th className="py-3 px-3">Loja</th>
                <th className="py-3 px-4">Parceiro</th>
                <th className="py-3 px-3">Cód.</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredCommissions.map(c => (
                  <tr key={c.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${!c.pago ? (isDarkMode ? 'bg-amber-950/10' : 'bg-amber-50/30') : ''}`}>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      #{c.sequencia}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">{c.data_venda}</td>
                    <td className="py-3.5 px-3 font-black text-slate-900 dark:text-white whitespace-nowrap">
                      R$ {Number(c.valor_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">{c.percentual_desconto || '-'}</td>
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">{c.data_entrega || '-'}</td>
                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{c.tipo_pagamento || '-'}</td>
                    <td className="py-3.5 px-3 font-black text-purple-600 dark:text-purple-400 whitespace-nowrap">
                      R$ {Number(c.valor_comissao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {c.percentual_comissao || '3%'}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePago(c)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer transition-all ${
                          c.pago
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {c.pago ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        {c.pago ? 'Pago' : 'Pendente'}
                      </button>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">{c.data_pagamento || '-'}</td>
                    <td className="py-3.5 px-3 font-semibold whitespace-nowrap text-slate-800 dark:text-slate-200">{c.vendedor}</td>
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap font-mono">Loja {c.loja}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">{c.parceiro}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-500 whitespace-nowrap">{c.codigo_parceiro}</td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 dark:hover:bg-slate-800 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.sequencia)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 dark:hover:bg-slate-800 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Configuração de Faixas de Faturamento */}
      <AnimatePresence>
        {showTiersModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTiersModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-xl rounded-3xl p-6 shadow-2xl border ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Faixas de Faturamento & Percentuais</h3>
                    <p className="text-xs text-slate-500">Defina o percentual de comissão aplicado automaticamente por faixa de valor de venda.</p>
                  </div>
                </div>
                <button onClick={() => setShowTiersModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 pt-4">
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {commissionTiers.map((tier, index) => (
                    <div key={tier.id} className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">Faixa {index + 1}</span>
                          <input
                            type="text"
                            value={tier.name}
                            onChange={(e) => {
                              const updated = [...commissionTiers];
                              updated[index].name = e.target.value;
                              setCommissionTiers(updated);
                            }}
                            className="bg-transparent text-xs font-bold border-b border-dashed border-slate-400 px-1 outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                          <span>De R$</span>
                          <input
                            type="number"
                            value={tier.min}
                            onChange={(e) => {
                              const updated = [...commissionTiers];
                              updated[index].min = parseFloat(e.target.value) || 0;
                              setCommissionTiers(updated);
                            }}
                            className="w-24 px-2 py-1 rounded-lg border text-xs font-bold bg-white dark:bg-slate-900"
                          />
                          <span>até R$</span>
                          <input
                            type="number"
                            value={tier.max}
                            onChange={(e) => {
                              const updated = [...commissionTiers];
                              updated[index].max = parseFloat(e.target.value) || 0;
                              setCommissionTiers(updated);
                            }}
                            className="w-24 px-2 py-1 rounded-lg border text-xs font-bold bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Comissão</span>
                          <input
                            type="text"
                            value={tier.percentage}
                            onChange={(e) => {
                              const updated = [...commissionTiers];
                              updated[index].percentage = e.target.value;
                              setCommissionTiers(updated);
                            }}
                            className="w-16 px-2 py-1 text-center rounded-lg border text-xs font-black text-purple-600 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const updated = commissionTiers.filter(t => t.id !== tier.id);
                            setCommissionTiers(updated);
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors mt-4"
                          title="Remover Faixa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Adicionar nova faixa */}
                <div className={`p-3 rounded-2xl border border-dashed ${isDarkMode ? 'border-slate-700 bg-slate-800/20' : 'border-slate-300 bg-slate-50'}`}>
                  <p className="text-xs font-bold mb-2">Adicionar Nova Faixa de Faturamento</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder="Nome"
                      value={newTier.name}
                      onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                      className="px-2.5 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900"
                    />
                    <input
                      type="number"
                      placeholder="Mín (R$)"
                      value={newTier.min}
                      onChange={(e) => setNewTier({ ...newTier, min: parseFloat(e.target.value) || 0 })}
                      className="px-2.5 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900"
                    />
                    <input
                      type="number"
                      placeholder="Máx (R$)"
                      value={newTier.max}
                      onChange={(e) => setNewTier({ ...newTier, max: parseFloat(e.target.value) || 0 })}
                      className="px-2.5 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      placeholder="% (ex: 3.5%)"
                      value={newTier.percentage}
                      onChange={(e) => setNewTier({ ...newTier, percentage: e.target.value })}
                      className="px-2.5 py-1.5 rounded-xl border text-xs bg-white dark:bg-slate-900"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const created: CommissionTier = {
                        id: `tier-${Date.now()}`,
                        ...newTier
                      };
                      setCommissionTiers([...commissionTiers, created]);
                      setNewTier({ name: 'Nova Faixa', min: 0, max: 15000, percentage: '3%' });
                    }}
                    className="mt-2.5 w-full py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
                  >
                    + Adicionar Faixa
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setShowTiersModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => {
                      saveTiers(commissionTiers);
                      setShowTiersModal(false);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-600/20"
                  >
                    Salvar Faixas de Faturamento
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Novo / Editar Registro */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative w-full max-w-2xl rounded-3xl p-6 shadow-2xl border ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">
                      {editingCommission ? 'Editar Registro de Comissão' : 'Novo Registro de Comissão'}
                    </h3>
                    <p className="text-xs text-slate-500">O percentual de comissão é calculado automaticamente pelas faixas de faturamento.</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveCommission} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Sequência / Pedido *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: 100605"
                      value={formData.sequencia || ''}
                      onChange={(e) => setFormData({ ...formData, sequencia: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Data da Venda *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="DD/MM/AAAA"
                      value={formData.data_venda || ''}
                      onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Valor da Venda (R$) *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.valor_venda || ''}
                      onChange={(e) => handleVendaChange(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-black text-blue-600 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      % de Desconto
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 5,84%"
                      value={formData.percentual_desconto || ''}
                      onChange={(e) => setFormData({ ...formData, percentual_desconto: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Data da Entrega
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/AAAA"
                      value={formData.data_entrega || ''}
                      onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Tipo de Pagamento
                    </label>
                    <input
                      type="text"
                      placeholder="Pix, Cartão..."
                      value={formData.tipo_pagamento || ''}
                      onChange={(e) => setFormData({ ...formData, tipo_pagamento: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                  {/* % de Comissão Baseado em Faixa */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                        % da Comissão (Faixa) *
                      </label>
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold">Baseado no Faturamento</span>
                    </div>
                    <input
                      required
                      type="text"
                      placeholder="3%"
                      value={formData.percentual_comissao || '3%'}
                      onChange={(e) => handlePercComissaoChange(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-bold outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Valor da Comissão */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 block mb-1">
                      Valor da Comissão (R$) *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.valor_comissao || ''}
                      onChange={(e) => setFormData({ ...formData, valor_comissao: parseFloat(e.target.value) || 0 })}
                      className="w-full h-10 px-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-black text-amber-600 dark:text-amber-400 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Comissão Foi Paga?
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, pago: false, data_pagamento: '' })}
                        className={`flex-1 h-10 rounded-xl text-xs font-bold border transition-all ${
                          !formData.pago
                            ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        Não (Pendente)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ 
                          ...formData, 
                          pago: true, 
                          data_pagamento: formData.data_pagamento || new Date().toLocaleDateString('pt-BR') 
                        })}
                        className={`flex-1 h-10 rounded-xl text-xs font-bold border transition-all ${
                          formData.pago
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500'
                        }`}
                      >
                        Sim (Pago)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Data do Pagamento
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/AAAA (se pago)"
                      value={formData.data_pagamento || ''}
                      onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Vendedor *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Alex, Joabson..."
                      value={formData.vendedor || ''}
                      onChange={(e) => setFormData({ ...formData, vendedor: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Loja *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="5, 1..."
                      value={formData.loja || ''}
                      onChange={(e) => setFormData({ ...formData, loja: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Parceiro *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Luciano, Carlos..."
                      value={formData.parceiro || ''}
                      onChange={(e) => setFormData({ ...formData, parceiro: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-black text-blue-600 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Cód. Parceiro *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="295255..."
                      value={formData.codigo_parceiro || ''}
                      onChange={(e) => setFormData({ ...formData, codigo_parceiro: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-95"
                  >
                    Salvar Registro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
