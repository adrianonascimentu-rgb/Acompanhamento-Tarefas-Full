'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, DollarSign, CheckCircle2, Clock, Plus, Search, 
  Filter, Download, Trash2, Edit2, RotateCcw, AlertCircle,
  Building, ShoppingCart, Percent, Calendar, Check, X,
  FileSpreadsheet, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PartnerCommission, INITIAL_COMMISSIONS } from '@/lib/initialCommissions';

interface CommissionsManagerProps {
  isDarkMode?: boolean;
}

export default function CommissionsManager({ isDarkMode = false }: CommissionsManagerProps) {
  const [commissions, setCommissions] = useState<PartnerCommission[]>(INITIAL_COMMISSIONS);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartner, setSelectedPartner] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedSeller, setSelectedSeller] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');

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

  // Recalcular comissão automaticamente no form quando valor_venda ou percentual_comissao mudarem
  const handleVendaChange = (valStr: string) => {
    const val = parseFloat(valStr.replace(',', '.')) || 0;
    const percStr = formData.percentual_comissao || '3%';
    const percNum = parseFloat(percStr.replace('%', '').replace(',', '.')) || 3;
    const calcComissao = Number(((val * percNum) / 100).toFixed(2));
    
    setFormData(prev => ({
      ...prev,
      valor_venda: val,
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
      `"${c.vendedor}"`,
      `"${c.loja}"`,
      `"${c.parceiro}"`,
      `"${c.codigo_parceiro}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `comissionados_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Planilha exportada em formato CSV com sucesso!', 'success');
  };

  // Filtros dinâmicos
  const partnerOptions = useMemo(() => {
    return Array.from(new Set(commissions.map(c => c.parceiro).filter(Boolean)));
  }, [commissions]);

  const sellerOptions = useMemo(() => {
    return Array.from(new Set(commissions.map(c => c.vendedor).filter(Boolean)));
  }, [commissions]);

  const storeOptions = useMemo(() => {
    return Array.from(new Set(commissions.map(c => c.loja).filter(Boolean)));
  }, [commissions]);

  const filteredCommissions = useMemo(() => {
    return commissions.filter(item => {
      // Busca geral
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchSeq = item.sequencia?.toLowerCase().includes(term);
        const matchPartner = item.parceiro?.toLowerCase().includes(term);
        const matchSeller = item.vendedor?.toLowerCase().includes(term);
        const matchStore = item.loja?.toLowerCase().includes(term);
        const matchCod = item.codigo_parceiro?.toLowerCase().includes(term);
        const matchPayment = item.tipo_pagamento?.toLowerCase().includes(term);
        if (!matchSeq && !matchPartner && !matchSeller && !matchStore && !matchCod && !matchPayment) {
          return false;
        }
      }

      // Filtro de Parceiro
      if (selectedPartner !== 'all' && item.parceiro !== selectedPartner) {
        return false;
      }

      // Filtro de Vendedor
      if (selectedSeller !== 'all' && item.vendedor !== selectedSeller) {
        return false;
      }

      // Filtro de Loja
      if (selectedStore !== 'all' && item.loja !== selectedStore) {
        return false;
      }

      // Filtro de Status Pago
      if (selectedStatus === 'paid' && !item.pago) return false;
      if (selectedStatus === 'pending' && item.pago) return false;

      return true;
    });
  }, [commissions, searchTerm, selectedPartner, selectedSeller, selectedStore, selectedStatus]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const totalVenda = filteredCommissions.reduce((acc, c) => acc + (Number(c.valor_venda) || 0), 0);
    const totalComissao = filteredCommissions.reduce((acc, c) => acc + (Number(c.valor_comissao) || 0), 0);
    const pagas = filteredCommissions.filter(c => c.pago);
    const pendentes = filteredCommissions.filter(c => !c.pago);
    const valorPago = pagas.reduce((acc, c) => acc + (Number(c.valor_comissao) || 0), 0);
    const valorPendente = pendentes.reduce((acc, c) => acc + (Number(c.valor_comissao) || 0), 0);

    return {
      totalRegistros: filteredCommissions.length,
      totalVenda,
      totalComissao,
      pagasCount: pagas.length,
      valorPago,
      pendentesCount: pendentes.length,
      valorPendente
    };
  }, [filteredCommissions]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : toastMessage.type === 'error'
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-blue-600 text-white border-blue-500'
            }`}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 border-slate-800' 
          : 'bg-gradient-to-br from-white via-blue-50/30 to-emerald-50/20 border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 shrink-0">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Controle de Comissionados
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Planilha Integrada
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gestão completa de comissões por parceiro, vendedor, loja e status de pagamento. Dados pré-preenchidos da planilha original.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleResetToSpreadsheet}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
              }`}
              title="Restaurar os 44 registros originais da planilha"
            >
              <RotateCcw size={14} className="text-amber-500" />
              <span>Restaurar Planilha</span>
            </button>

            <button
              onClick={handleExportCSV}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <Download size={14} className="text-blue-500" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handleOpenNewModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all active:scale-95"
            >
              <Plus size={16} />
              <span>Nova Comissão</span>
            </button>
          </div>
        </div>

        {/* Executive Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80 shadow-xs'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Volume de Vendas</span>
              <ShoppingCart size={15} className="text-blue-500" />
            </div>
            <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              R$ {stats.totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{stats.totalRegistros} lançamentos</p>
          </div>

          <div className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80 shadow-xs'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total de Comissões</span>
              <Percent size={15} className="text-purple-500" />
            </div>
            <p className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400">
              R$ {stats.totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Média ~3% sobre vendas</p>
          </div>

          <div className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80 shadow-xs'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Comissões Pagas</span>
              <CheckCircle2 size={15} className="text-emerald-500" />
            </div>
            <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
              R$ {stats.valorPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{stats.pagasCount} comissões quitadas</p>
          </div>

          <div className={`p-4 rounded-2xl border ${
            isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-white border-slate-200/80 shadow-xs'
          }`}>
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">A Pagar (Pendentes)</span>
              <Clock size={15} className="text-amber-500" />
            </div>
            <p className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
              R$ {stats.valorPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{stats.pendentesCount} comissões a acertar</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por sequência, parceiro, vendedor, loja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border outline-none transition-all ${
              isDarkMode 
                ? 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' 
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500'
            }`}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Parceiro Filter */}
          <select
            value={selectedPartner}
            onChange={(e) => setSelectedPartner(e.target.value)}
            className={`px-3 py-2 text-xs rounded-xl border outline-none font-semibold ${
              isDarkMode 
                ? 'bg-slate-800 border-slate-700 text-slate-300' 
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">Todos Parceiros</option>
            {partnerOptions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Vendedor Filter */}
          <select
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value)}
            className={`px-3 py-2 text-xs rounded-xl border outline-none font-semibold ${
              isDarkMode 
                ? 'bg-slate-800 border-slate-700 text-slate-300' 
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">Todos Vendedores</option>
            {sellerOptions.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {/* Loja Filter */}
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className={`px-3 py-2 text-xs rounded-xl border outline-none font-semibold ${
              isDarkMode 
                ? 'bg-slate-800 border-slate-700 text-slate-300' 
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <option value="all">Todas Lojas</option>
            {storeOptions.map(l => (
              <option key={l} value={l}>Loja {l}</option>
            ))}
          </select>

          {/* Status Filter */}
          <div className={`p-0.5 rounded-xl border flex items-center ${
            isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedStatus === 'all' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedStatus('paid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedStatus === 'paid' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-emerald-600'
              }`}
            >
              Pagos
            </button>
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedStatus === 'pending' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-amber-600'
              }`}
            >
              Pendentes
            </button>
          </div>
        </div>
      </div>

      {/* Spreadsheet Table View */}
      <div className={`rounded-3xl border overflow-hidden ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'bg-slate-800/60 border-slate-800 text-slate-400' : 'bg-slate-50/80 border-slate-200 text-slate-600'}`}>
                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[10px]">Sequência</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px]">Data Venda</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px]">V. Venda</th>
                <th className="py-3 px-2.5 font-bold uppercase tracking-wider text-[10px]">% Desc.</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px]">Entrega</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px]">Pagamento</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px] text-purple-600 dark:text-purple-400">V. Comissão</th>
                <th className="py-3 px-2 font-bold uppercase tracking-wider text-[10px]">% Com.</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px] text-center">Status</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px]">Dt. Pgto</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px]">Vendedor</th>
                <th className="py-3 px-2.5 font-bold uppercase tracking-wider text-[10px]">Loja</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px]">Parceiro</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px]">Cód. Parceiro</th>
                <th className="py-3 px-3 font-bold uppercase tracking-wider text-[10px] text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400">
                    Nenhum registro de comissão encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((c) => (
                  <tr 
                    key={c.id}
                    className={`transition-colors hover:bg-blue-50/40 dark:hover:bg-slate-800/40 ${
                      c.pago 
                        ? '' 
                        : isDarkMode ? 'bg-amber-950/10' : 'bg-amber-50/30'
                    }`}
                  >
                    <td className="py-3 px-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                      #{c.sequencia}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {c.data_venda}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      R$ {Number(c.valor_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2.5 text-slate-500 whitespace-nowrap">
                      {c.percentual_desconto || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {c.data_entrega || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {c.tipo_pagamento || '-'}
                    </td>
                    <td className="py-3 px-3 font-black text-purple-600 dark:text-purple-400 whitespace-nowrap">
                      R$ {Number(c.valor_comissao).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-slate-500 whitespace-nowrap font-bold">
                      {c.percentual_comissao || '3%'}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePago(c)}
                        title={c.pago ? 'Clique para marcar como Pendente' : 'Clique para marcar como Pago'}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-all cursor-pointer ${
                          c.pago 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' 
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                        }`}
                      >
                        {c.pago ? (
                          <>
                            <CheckCircle2 size={11} />
                            Pago
                          </>
                        ) : (
                          <>
                            <Clock size={11} />
                            Pendente
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                      {c.data_pagamento || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-200 whitespace-nowrap font-semibold">
                      {c.vendedor}
                    </td>
                    <td className="py-3 px-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono">
                      Loja {c.loja}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                      {c.parceiro}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {c.codigo_parceiro}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 dark:hover:bg-slate-800 transition-colors"
                          title="Editar Registro"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.sequencia)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 dark:hover:bg-slate-800 transition-colors"
                          title="Excluir Registro"
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

        {/* Footer Summary */}
        <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
          isDarkMode ? 'bg-slate-800/40 border-slate-800 text-slate-400' : 'bg-slate-50/60 border-slate-200 text-slate-600'
        }`}>
          <div>
            Mostrando <strong>{filteredCommissions.length}</strong> de <strong>{commissions.length}</strong> comissões
          </div>
          <div className="flex items-center gap-4 font-semibold">
            <span>Vendas: <strong className="text-slate-900 dark:text-white">R$ {stats.totalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
            <span>Comissões: <strong className="text-purple-600 dark:text-purple-400">R$ {stats.totalComissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
          </div>
        </div>
      </div>

      {/* Modal de Criação / Edição de Comissão */}
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
              className={`relative w-full max-w-2xl rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto border ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">
                      {editingCommission ? `Editar Comissão #${formData.sequencia}` : 'Novo Lançamento de Comissão'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Preencha os campos exatamente como constam na planilha de controle.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveCommission} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Sequência */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                      Sequência / Pedido *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: 100605"
                      value={formData.sequencia}
                      onChange={(e) => setFormData({ ...formData, sequencia: e.target.value })}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-mono ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  {/* Data Venda */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                      Data da Venda *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="DD/MM/AAAA"
                      value={formData.data_venda}
                      onChange={(e) => setFormData({ ...formData, data_venda: e.target.value })}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  {/* V. Venda */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                      Valor da Venda (R$) *
                    </label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.valor_venda}
                      onChange={(e) => handleVendaChange(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-bold ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* % de Desconto */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                      % de Desconto
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 5,84%"
                      value={formData.percentual_desconto || ''}
                      onChange={(e) => setFormData({ ...formData, percentual_desconto: e.target.value })}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  {/* Data Entrega */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                      Data Entrega
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/AAAA"
                      value={formData.data_entrega || ''}
                      onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  {/* Tipo Pagamento */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                      Tipo de Pagamento
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Pix, 10X Cartão, À Vista"
                      value={formData.tipo_pagamento || ''}
                      onChange={(e) => setFormData({ ...formData, tipo_pagamento: e.target.value })}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Bloco de Comissão */}
                <div className={`p-4 rounded-2xl border ${
                  isDarkMode ? 'bg-slate-800/40 border-slate-800' : 'bg-purple-50/40 border-purple-100'
                }`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1 block">
                        % da Comissão *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="Ex: 3% ou 1,5%"
                        value={formData.percentual_comissao || '3%'}
                        onChange={(e) => handlePercComissaoChange(e.target.value)}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-bold ${
                          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1 block">
                        Valor da Comissão (R$) *
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.valor_comissao}
                        onChange={(e) => setFormData({ ...formData, valor_comissao: parseFloat(e.target.value) || 0 })}
                        className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-black text-purple-600 dark:text-purple-400 ${
                          isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Status e Pagamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                      Status da Comissão *
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, pago: true, data_pagamento: formData.data_pagamento || new Date().toLocaleDateString('pt-BR') })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          formData.pago 
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' 
                            : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        ✓ Pago
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, pago: false, data_pagamento: '' })}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          !formData.pago 
                            ? 'bg-amber-600 border-amber-600 text-white shadow-xs' 
                            : isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        ⏱ Pendente
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                      Data Pagamento (se pago)
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/AAAA"
                      value={formData.data_pagamento || ''}
                      onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Vendedor, Loja, Parceiro e Código */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                      Vendedor *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Alex ou Joabson"
                      value={formData.vendedor}
                      onChange={(e) => setFormData({ ...formData, vendedor: e.target.value })}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-semibold ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                      Loja *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: 5 ou 1"
                      value={formData.loja}
                      onChange={(e) => setFormData({ ...formData, loja: e.target.value })}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-semibold ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                      Parceiro *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Luciano, Carlos, Hitle"
                      value={formData.parceiro}
                      onChange={(e) => setFormData({ ...formData, parceiro: e.target.value })}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-bold ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                      Cód. Parceiro *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: 295255"
                      value={formData.codigo_parceiro}
                      onChange={(e) => setFormData({ ...formData, codigo_parceiro: e.target.value })}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-mono ${
                        isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all active:scale-95"
                  >
                    {editingCommission ? 'Salvar Alterações' : 'Cadastrar Comissão'}
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
