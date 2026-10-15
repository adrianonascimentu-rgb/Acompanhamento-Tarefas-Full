'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, DollarSign, Calendar, Building, User, Users, 
  Tag, CreditCard, Percent, Clock, CheckCircle2, 
  AlertCircle, Sparkles, ShoppingBag, FileText
} from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { PartnerCommission } from '@/lib/initialCommissions';

interface NewCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Parceiros conhecidos para agilizar o preenchimento automático
const KNOWN_PARTNERS: { nome: string; codigo: string }[] = [
  { nome: 'Luciano', codigo: '295255' },
  { nome: 'Bruna Arquitetura', codigo: '310492' },
  { nome: 'Studio Ambientar', codigo: '401928' },
  { nome: 'Marcello Interiores', codigo: '198420' },
  { nome: 'Clara Designer', codigo: '552103' },
  { nome: 'Espaço Conceito', codigo: '661849' },
  { nome: 'Roberto & Associados', codigo: '772910' }
];

const STORES = ['Loja 1', 'Loja 2', 'Loja 3', 'Loja 4', 'Loja 5', 'Loja Matriz', 'Online'];

const PAYMENT_METHODS = [
  'Pix',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Boleto Bancário',
  'Dinheiro',
  'Transferência',
  'Financiamento',
  'Cheque'
];

export function NewCommissionModal({ isOpen, onClose, onSuccess }: NewCommissionModalProps) {
  const { user } = useRole();

  // Form states
  const [sequencia, setSequencia] = useState('');
  const [dataVenda, setDataVenda] = useState(() => new Date().toISOString().split('T')[0]);
  const [valorVenda, setValorVenda] = useState<number | ''>('');
  const [percentualDesconto, setPercentualDesconto] = useState('0%');
  const [dataEntrega, setDataEntrega] = useState('');
  const [tipoPagamento, setTipoPagamento] = useState('Pix');
  const [loja, setLoja] = useState('Loja 5');
  const [parceiro, setParceiro] = useState('');
  const [codigoParceiro, setCodigoParceiro] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [percentualComissao, setPercentualComissao] = useState('3%');
  const [observacoes, setObservacoes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Preencher o vendedor automaticamente com o usuário autenticado
  useEffect(() => {
    if (user?.name) {
      setVendedor(user.name);
    } else {
      setVendedor('Alex');
    }
  }, [user]);

  // Se o modal for reaberto, resetar estados de erro/sucesso
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      if (!dataVenda) {
        setDataVenda(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen]);

  // Cálculo da comissão estimada
  const comissaoCalculada = useMemo(() => {
    const vVenda = Number(valorVenda) || 0;
    const perc = parseFloat(percentualComissao.replace('%', '').replace(',', '.')) || 3;
    return Number(((vVenda * perc) / 100).toFixed(2));
  }, [valorVenda, percentualComissao]);

  // Handler para selecionar parceiro conhecido
  const handleSelectPartner = (pNome: string) => {
    setParceiro(pNome);
    const found = KNOWN_PARTNERS.find(kp => kp.nome.toLowerCase() === pNome.toLowerCase());
    if (found) {
      setCodigoParceiro(found.codigo);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!sequencia.trim()) {
      setErrorMessage('Por favor, informe a Sequência ou Número do Pedido.');
      return;
    }

    if (!valorVenda || Number(valorVenda) <= 0) {
      setErrorMessage('Por favor, informe um valor de venda válido maior que zero.');
      return;
    }

    if (!parceiro.trim()) {
      setErrorMessage('Por favor, informe o nome do Parceiro / Indicador.');
      return;
    }

    try {
      setLoading(true);

      // Formatar data para exibição pt-BR se estiver em YYYY-MM-DD
      let dataVendaFormatada = dataVenda;
      if (dataVenda.includes('-')) {
        const [y, m, d] = dataVenda.split('-');
        dataVendaFormatada = `${d}/${m}/${y}`;
      }

      let dataEntregaFormatada = dataEntrega;
      if (dataEntrega && dataEntrega.includes('-')) {
        const [y, m, d] = dataEntrega.split('-');
        dataEntregaFormatada = `${d}/${m}/${y}`;
      }

      const payload: Partial<PartnerCommission> = {
        sequencia: sequencia.trim(),
        data_venda: dataVendaFormatada,
        valor_venda: Number(valorVenda),
        percentual_desconto: percentualDesconto.trim(),
        data_entrega: dataEntregaFormatada,
        tipo_pagamento: tipoPagamento,
        loja: loja.trim(),
        parceiro: parceiro.trim(),
        codigo_parceiro: codigoParceiro.trim() || 'S/N',
        vendedor: vendedor.trim() || user?.name || 'Vendedor',
        valor_comissao: comissaoCalculada,
        percentual_comissao: percentualComissao,
        pago: false,
        observacoes: observacoes.trim()
      };

      // 1. Tentar salvar no endpoint da API
      const response = await fetch('/api/admin/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => null);

      // 2. Atualizar o cache de commissions em localStorage
      try {
        const localSaved = localStorage.getItem('agentx_local_commissions');
        let currentList: any[] = [];
        if (localSaved) {
          currentList = JSON.parse(localSaved);
        }
        const newRecord = result?.commission || {
          id: `comm-${Date.now()}`,
          ...payload,
          created_at: new Date().toISOString()
        };
        const updatedList = [newRecord, ...currentList];
        localStorage.setItem('agentx_local_commissions', JSON.stringify(updatedList));
      } catch (lsErr) {
        console.warn('Erro ao atualizar localStorage de comissões:', lsErr);
      }

      // 3. Disparar evento global para re-renderizar CommissionsManager e outros ouvintes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('commissions-updated'));
      }

      setSuccessMessage('Comissão registrada com sucesso!');

      setTimeout(() => {
        setLoading(false);
        onSuccess?.();
        onClose();
        // Reset form
        setSequencia('');
        setValorVenda('');
        setPercentualDesconto('0%');
        setDataEntrega('');
        setParceiro('');
        setCodigoParceiro('');
        setObservacoes('');
      }, 700);

    } catch (err: any) {
      console.error('Erro ao salvar comissão:', err);
      setErrorMessage(err?.message || 'Falha ao salvar a comissão. Tente novamente.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <DollarSign size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Lançar Nova Comissão
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  Atalho Vendedor
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Alimente os dados da venda, pedido e parceiro para registro de comissionamento
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Grid de Campos Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sequência / Pedido */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Sequência / Pedido *
              </label>
              <div className="relative">
                <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ex: 89245 ou PED-1020"
                  value={sequencia}
                  onChange={(e) => setSequencia(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Data da Venda */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Data da Venda *
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  required
                  value={dataVenda}
                  onChange={(e) => setDataVenda(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Valor da Venda */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Valor da Venda (R$) *
              </label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={valorVenda}
                  onChange={(e) => setValorVenda(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-black focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* % de Desconto */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                % de Desconto
              </label>
              <div className="relative">
                <Percent size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex: 5% ou 0%"
                  value={percentualDesconto}
                  onChange={(e) => setPercentualDesconto(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Data da Entrega */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Data da Entrega
              </label>
              <div className="relative">
                <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Tipo de Pagamento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tipo de Pagamento
              </label>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={tipoPagamento}
                  onChange={(e) => setTipoPagamento(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>{pm}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Loja */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Loja
              </label>
              <div className="relative">
                <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={loja}
                  onChange={(e) => setLoja(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                >
                  {STORES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vendedor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Vendedor Responsável
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={vendedor}
                  onChange={(e) => setVendedor(e.target.value)}
                  placeholder="Nome do vendedor"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Seção Parceiro e Código */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Users size={16} className="text-emerald-600" />
                Dados do Parceiro / Especificador
              </span>
              <span className="text-[10px] text-slate-400">Sugestões rápidas abaixo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Nome do Parceiro *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Luciano ou Bruna Arquitetura"
                  value={parceiro}
                  onChange={(e) => handleSelectPartner(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold focus:border-emerald-500 outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Código do Parceiro
                </label>
                <input
                  type="text"
                  placeholder="Ex: 295255"
                  value={codigoParceiro}
                  onChange={(e) => setCodigoParceiro(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold focus:border-emerald-500 outline-none text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Quick chips para parceiros frequentes */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400 font-medium">Parceiros frequentes:</span>
              {KNOWN_PARTNERS.slice(0, 4).map(kp => (
                <button
                  type="button"
                  key={kp.codigo}
                  onClick={() => {
                    setParceiro(kp.nome);
                    setCodigoParceiro(kp.codigo);
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                    parceiro === kp.nome 
                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold' 
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-500'
                  }`}
                >
                  {kp.nome} ({kp.codigo})
                </button>
              ))}
            </div>
          </div>

          {/* Banner de Cálculo de Comissão */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Comissão Calculada
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                R$ {comissaoCalculada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Calculada automaticamente sobre o valor da venda
              </p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-center">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                % Comissão:
              </label>
              <select
                value={percentualComissao}
                onChange={(e) => setPercentualComissao(e.target.value)}
                className="h-10 px-3 rounded-xl border border-emerald-500/30 bg-white dark:bg-slate-900 text-xs font-black text-emerald-700 dark:text-emerald-400 outline-none"
              >
                <option value="2.5%">2.5%</option>
                <option value="3%">3% (Padrão)</option>
                <option value="3.5%">3.5%</option>
                <option value="4%">4%</option>
                <option value="5%">5%</option>
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Observações (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Alguma nota sobre a negociação, projeto ou pagamento..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black transition-all shadow-md shadow-emerald-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Salvar Comissão</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewCommissionModal;
