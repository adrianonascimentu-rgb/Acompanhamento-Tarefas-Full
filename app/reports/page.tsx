'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, LineChart, Line, Legend, AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  LayoutGrid, Bell, Shield, ArrowRightLeft, Target, Truck, Users, 
  Settings, Home, ClipboardList, ShieldCheck, BarChart3, 
  Clock, CheckCircle2, AlertCircle, TrendingUp, Package, 
  Calendar, Filter, ChevronRight, Activity, Share2, Download, Layers, Layers3, Tag,
  Award, Wind, ShoppingBag, Boxes, Sparkles, DollarSign, Gift, UserCheck, Store, Snowflake, Zap, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRole } from '@/hooks/useRole';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import { LoginForm } from '@/components/auth/LoginForm';
import { exportConsolidatedReportToPDF } from '@/lib/exportConsolidatedPdf';
import {
  LoyaltyClient,
  LOYALTY_CONFIG,
  getStoredLoyaltyClients,
  calculateLoyaltyStats,
  pointsToBRL,
  formatBRL,
} from '@/lib/loyaltyData';
import {
  SPLIT_BRAND_TABLES,
  AVAILABLE_BTUS,
  SplitModelItem,
} from '@/lib/splitPriceTables';
import {
  CatalogProduct,
  getAllCatalogProducts,
  inferCategory,
} from '@/lib/catalogProducts';
import {
  mergeLeadsWithImported,
  getLocalLeadAddressMap,
} from '@/lib/leadsHelper';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const DEFAULT_ML_SAMPLE_ITEMS = [
  {
    id: 'ml_sample_1',
    segmento_ml: 'Brastemp',
    codigo: '212445',
    nome: 'FRONTAL DA GAVETA LEGUMES BRM38/BRM39+ BRASTEMP',
    estoque: 7,
    vds_6m: 12,
    a_vista_cp: 172.80,
    liq_ml_envios: 172.74,
    pr_cp_ml: 253.00,
    pr_vende_mais: 205.90,
    liq_ml_full: 185.00,
    full_price: 265.00,
    nome_fabricante: 'WHIRLPOOL',
  },
  {
    id: 'ml_sample_2',
    segmento_ml: 'Electrolux',
    codigo: '104322',
    nome: 'PLACA POTENCIA REFRIGERADOR ELECTROLUX DFW52/DW52X BIVOLT',
    estoque: 15,
    vds_6m: 28,
    a_vista_cp: 210.00,
    liq_ml_envios: 205.50,
    pr_cp_ml: 310.00,
    pr_vende_mais: 325.00,
    liq_ml_full: 215.00,
    full_price: 325.00,
    nome_fabricante: 'ELECTROLUX',
  },
  {
    id: 'ml_sample_3',
    segmento_ml: 'Consul',
    codigo: '308912',
    nome: 'MOTOR VENTILADOR CONDENSADORA SPLIT CONSUL 9000/12000 BTUS',
    estoque: 9,
    vds_6m: 19,
    a_vista_cp: 145.00,
    liq_ml_envios: 148.20,
    pr_cp_ml: 219.90,
    pr_vende_mais: 229.00,
    liq_ml_full: 155.00,
    full_price: 229.90,
    nome_fabricante: 'WHIRLPOOL',
  },
  {
    id: 'ml_sample_4',
    segmento_ml: 'Elgin',
    codigo: '416150',
    nome: 'MICRO-MOTOR ELGIN 1/40 BIVOLT C/HELICE PLASTICA',
    estoque: 18,
    vds_6m: 34,
    a_vista_cp: 65.90,
    liq_ml_envios: 71.40,
    pr_cp_ml: 109.90,
    pr_vende_mais: 115.00,
    liq_ml_full: 74.00,
    full_price: 114.90,
    nome_fabricante: 'ELGIN',
  },
];

export default function ReportsPage() {
  const { isDarkMode } = useTheme();
  const {
    role,
    user,
    canAccessReports,
    canAccessLoyalty,
    canAccessSplitTable,
    canAccessProducts,
    canAccessPriceResearch,
    canAccessLeads,
    canAccessDeliveries,
    canAccessTasks,
    canAccessTransfers,
    canAccessSales,
    canAccessWarranties,
    canAccessDemands,
    canAccessSocialMedia,
    hasSubmoduleAccess,
    isAuthenticated,
    login,
  } = useRole();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    | 'consolidado'
    | 'geral'
    | 'fidelidade'
    | 'tabela_split'
    | 'catalogo_pecas'
    | 'mercado_livre'
    | 'tarefas'
    | 'transfers'
    | 'leads'
    | 'deliveries'
    | 'warranties'
    | 'demands'
    | 'vendas'
    | 'colaboradores'
    | 'social'
    | 'precos'
  >('consolidado');
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '15days' | '30days' | '3months' | '6months'>('30days');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'core' | 'operations' | 'sales' | 'support'>('all');
  const [loyaltySellerFilter, setLoyaltySellerFilter] = useState<string>('all');
  const [splitBrandFilter, setSplitBrandFilter] = useState<'all' | 'agratto' | 'gree' | 'elgin'>('all');
  
  // Raw Data State for Memoization
  const [rawData, setRawData] = useState<{
    tasks: any[];
    assignees: any[];
    transfers: any[];
    leads: any[];
    deliveries: any[];
    warranties: any[];
    demands: any[];
    profiles: any[];
    sales: any[];
    allSalesResults: any[];
    salesTransactions: any[];
    priceResearch: any[];
    loyaltyClients: LoyaltyClient[];
    catalogProducts: CatalogProduct[];
    mercadoLivreItems: any[];
  }>({
    tasks: [],
    assignees: [],
    transfers: [],
    leads: [],
    deliveries: [],
    warranties: [],
    demands: [],
    profiles: [],
    sales: [],
    allSalesResults: [],
    salesTransactions: [],
    priceResearch: [],
    loyaltyClients: [],
    catalogProducts: [],
    mercadoLivreItems: [],
  });

  const [trendViewMode, setTrendViewMode] = useState<'daily' | 'cumulative'>('daily');

  const getStartDate = useCallback((filter: string) => {
    const now = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'today':
        return start.toISOString();
      case '7days':
        start.setDate(now.getDate() - 7);
        return start.toISOString();
      case '15days':
        start.setDate(now.getDate() - 15);
        return start.toISOString();
      case '30days':
        start.setDate(now.getDate() - 30);
        return start.toISOString();
      case '3months':
        start.setMonth(now.getMonth() - 3);
        return start.toISOString();
      case '6months':
        start.setMonth(now.getMonth() - 6);
        return start.toISOString();
      default:
        start.setDate(now.getDate() - 30);
        return start.toISOString();
    }
  }, []);

  const fetchAllData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const [
        { data: tasks },
        { data: assignees },
        { data: transfers },
        { data: leads },
        { data: deliveries },
        { data: warranties },
        { data: demands },
        { data: profiles },
        { data: sales },
        { data: allSalesResults },
        { data: salesTransactions },
        priceResearch,
        mlResponse
      ] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('task_assignees').select('*, profiles(name)'),
        supabase.from('transfers').select('*'),
        supabase.from('leads').select('*'),
        supabase.from('deliveries').select('*'),
        supabase.from('warranties').select('*'),
        supabase.from('demands').select('*'),
        supabase.from('profiles').select('id, name'),
        supabase.from('sales_results').select('*, profiles(name)').eq('month', new Date().getMonth() + 1).eq('year', new Date().getFullYear()),
        supabase.from('sales_results').select('*, profiles(name)'),
        supabase.from('sales').select('*'),
        fetch('/api/competitor-prices').then(res => res.json()).then(r => ({ data: r.data })).catch(() => ({ data: [] })),
        fetch('/api/mercado-livre').then(res => res.json()).catch(() => ({ data: null }))
      ]);

      const storedLoyalty = getStoredLoyaltyClients();
      const storedCatalog = getAllCatalogProducts();
      const addressMap = getLocalLeadAddressMap();
      const mergedLeads = mergeLeadsWithImported(leads || [], addressMap);

      let mlItems: any[] = [];
      if (Array.isArray(mlResponse?.data) && mlResponse.data.length > 0) {
        mlItems = mlResponse.data;
      } else if (typeof window !== 'undefined') {
        try {
          const localMl = localStorage.getItem('mercado_livre_items');
          if (localMl) {
            const parsed = JSON.parse(localMl);
            if (Array.isArray(parsed) && parsed.length > 0) {
              mlItems = parsed;
            }
          }
        } catch {}
      }
      if (mlItems.length === 0) {
        mlItems = DEFAULT_ML_SAMPLE_ITEMS;
      }

      setRawData({
        tasks: tasks || [],
        assignees: assignees || [],
        transfers: transfers || [],
        leads: mergedLeads,
        deliveries: deliveries || [],
        warranties: warranties || [],
        demands: demands || [],
        profiles: profiles || [],
        sales: sales || [],
        allSalesResults: allSalesResults || [],
        salesTransactions: salesTransactions || [],
        priceResearch: priceResearch.data || [],
        loyaltyClients: storedLoyalty || [],
        catalogProducts: storedCatalog || [],
        mercadoLivreItems: mlItems,
      });
    } catch (error: any) {
      console.error('Error fetching report data:', error?.message || error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated, fetchAllData]);

  // Memoized Helpers and Cutoff Date
  const profileMap = useMemo(() => {
    return (rawData.profiles || []).reduce((acc: Record<string, string>, p: any) => {
      acc[p.id] = p.name;
      return acc;
    }, {});
  }, [rawData.profiles]);

  const startDateMs = useMemo(() => {
    const startStr = getStartDate(dateFilter);
    return new Date(startStr).getTime();
  }, [dateFilter, getStartDate]);

  // Memoized Filtered Collections by Date Filter
  const filteredTasks = useMemo(() => {
    return (rawData.tasks || []).filter((t: any) => {
      if (!t.created_at) return true;
      return new Date(t.created_at).getTime() >= startDateMs;
    });
  }, [rawData.tasks, startDateMs]);

  const filteredTransfers = useMemo(() => {
    return (rawData.transfers || []).filter((t: any) => {
      if (!t.created_at) return true;
      return new Date(t.created_at).getTime() >= startDateMs;
    });
  }, [rawData.transfers, startDateMs]);

  const filteredLeads = useMemo(() => {
    return (rawData.leads || []).filter((l: any) => {
      if (!l.created_at) return true;
      return new Date(l.created_at).getTime() >= startDateMs;
    });
  }, [rawData.leads, startDateMs]);

  const filteredDeliveries = useMemo(() => {
    return (rawData.deliveries || []).filter((d: any) => {
      const dateVal = d.date || d.created_at;
      if (!dateVal) return true;
      return new Date(dateVal).getTime() >= startDateMs;
    });
  }, [rawData.deliveries, startDateMs]);

  const filteredWarranties = useMemo(() => {
    return (rawData.warranties || []).filter((w: any) => {
      if (!w.created_at) return true;
      return new Date(w.created_at).getTime() >= startDateMs;
    });
  }, [rawData.warranties, startDateMs]);

  const filteredDemands = useMemo(() => {
    return (rawData.demands || []).filter((d: any) => {
      if (!d.created_at) return true;
      return new Date(d.created_at).getTime() >= startDateMs;
    });
  }, [rawData.demands, startDateMs]);

  // 1. Memoized Monthly Consolidated Data
  const { monthlyConsolidatedData, consolidatedTotals } = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const consolidatedMap = monthNames.map((monthName, idx) => ({
      monthIndex: idx,
      monthName,
      vendasReceita: 0,
      vendasMeta: 0,
      vendasQtd: 0,
      tarefasCriadas: 0,
      tarefasConcluidas: 0,
      leadsCaptados: 0,
      leadsConvertidos: 0,
    }));

    (rawData.tasks || []).forEach((t: any) => {
      if (t.created_at) {
        const d = new Date(t.created_at);
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          consolidatedMap[m].tarefasCriadas += 1;
          if (t.status === 'Concluída' || t.status === 'Concluído') {
            consolidatedMap[m].tarefasConcluidas += 1;
          }
        }
      }
    });

    (rawData.leads || []).forEach((l: any) => {
      if (l.created_at) {
        const d = new Date(l.created_at);
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          consolidatedMap[m].leadsCaptados += 1;
          if (l.status === 'Convertido' || l.status === 'Ganhos') {
            consolidatedMap[m].leadsConvertidos += 1;
          }
        }
      }
    });

    (rawData.salesTransactions || []).forEach((s: any) => {
      const rawDate = s.sale_date || s.created_at;
      if (rawDate) {
        const d = new Date(rawDate);
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          consolidatedMap[m].vendasReceita += Number(s.total_value || 0);
          consolidatedMap[m].vendasQtd += 1;
        }
      }
    });

    (rawData.allSalesResults || []).forEach((sr: any) => {
      const m = (sr.month || 1) - 1;
      if (m >= 0 && m < 12) {
        consolidatedMap[m].vendasMeta += Number(sr.target_2026 || 0);
        if (!rawData.salesTransactions || rawData.salesTransactions.length === 0) {
          consolidatedMap[m].vendasReceita += Number(sr.result_2026 || 0);
          if (sr.result_2026 > 0) consolidatedMap[m].vendasQtd += 1;
        }
      }
    });

    const finalConsolidated = consolidatedMap.map(item => {
      const taxaConclusaoTarefas = item.tarefasCriadas > 0
        ? Math.round((item.tarefasConcluidas / item.tarefasCriadas) * 100)
        : item.tarefasConcluidas > 0 ? 100 : 0;

      const taxaConversaoLeads = item.leadsCaptados > 0
        ? Math.round((item.leadsConvertidos / item.leadsCaptados) * 100)
        : item.leadsConvertidos > 0 ? 100 : 0;

      const ticketMedio = item.vendasQtd > 0
        ? Math.round(item.vendasReceita / item.vendasQtd)
        : 0;

      return {
        ...item,
        taxaConclusaoTarefas,
        taxaConversaoLeads,
        ticketMedio
      };
    });

    const totalReceita = finalConsolidated.reduce((acc, curr) => acc + curr.vendasReceita, 0);
    const totalMetas = finalConsolidated.reduce((acc, curr) => acc + curr.vendasMeta, 0);
    const totalTarefasCriadas = finalConsolidated.reduce((acc, curr) => acc + curr.tarefasCriadas, 0);
    const totalTarefasConcluidas = finalConsolidated.reduce((acc, curr) => acc + curr.tarefasConcluidas, 0);
    const totalLeadsCaptados = finalConsolidated.reduce((acc, curr) => acc + curr.leadsCaptados, 0);
    const totalLeadsConvertidos = finalConsolidated.reduce((acc, curr) => acc + curr.leadsConvertidos, 0);
    const totalVendasQtd = finalConsolidated.reduce((acc, curr) => acc + curr.vendasQtd, 0);
    const avgTicket = totalVendasQtd > 0 ? Math.round(totalReceita / totalVendasQtd) : 0;
    const avgLeadConversionRate = totalLeadsCaptados > 0 ? Math.round((totalLeadsConvertidos / totalLeadsCaptados) * 100) : 0;
    const avgTaskCompletionRate = totalTarefasCriadas > 0 ? Math.round((totalTarefasConcluidas / totalTarefasCriadas) * 100) : 0;

    return {
      monthlyConsolidatedData: finalConsolidated,
      consolidatedTotals: {
        totalReceita,
        totalMetas,
        totalTarefasCriadas,
        totalTarefasConcluidas,
        totalLeadsCaptados,
        totalLeadsConvertidos,
        avgTicket,
        avgLeadConversionRate,
        avgTaskCompletionRate
      }
    };
  }, [rawData.tasks, rawData.leads, rawData.salesTransactions, rawData.allSalesResults]);

  // 2. Memoized Tasks Processed Data with Advanced Management Analytics (SLA, Overdue, Workloads, Categories, Weekdays, Delays, Overload, HourOfDay, Progress)
  const tasksData = useMemo(() => {
    const tasks = filteredTasks;
    const assignees = rawData.assignees || [];
    const completedByCollab: Record<string, number> = {};
    const totalByCollab: Record<string, number> = {};
    const responseTimes: Record<string, number[]> = {};
    const priorityDist: Record<string, number> = {};
    const statusDist: Record<string, number> = {};

    // Novas métricas solicitadas
    const categoryCounts: Record<string, number> = {
      'Logística & Rota': 0,
      'Vendas & Leads': 0,
      'Redes Sociais & Marketing': 0,
      'Suporte & Assistência': 0,
      'Operação & Rotinas': 0
    };

    const dayOfWeekCounts: Record<string, number> = {
      'Segunda': 0,
      'Terça': 0,
      'Quarta': 0,
      'Quinta': 0,
      'Sexta': 0,
      'Sábado': 0,
      'Domingo': 0
    };

    const activeWorkloadByCollab: Record<string, number> = {};
    const resolutionTimesByPriority: Record<string, number[]> = {
      'Alta': [],
      'Média': [],
      'Baixa': []
    };

    // Novas métricas de análise profunda de tarefas
    const overloadScoreByCollab: Record<string, number> = {};
    const categoryDelayCounts: Record<string, { total: number; delayed: number }> = {
      'Logística & Rota': { total: 0, delayed: 0 },
      'Vendas & Leads': { total: 0, delayed: 0 },
      'Redes Sociais & Marketing': { total: 0, delayed: 0 },
      'Suporte & Assistência': { total: 0, delayed: 0 },
      'Operação & Rotinas': { total: 0, delayed: 0 }
    };
    const progressDistribution: Record<string, number> = {
      'Sem Início (0%)': 0,
      'Planejamento (1-30%)': 0,
      'Desenvolvimento (31-70%)': 0,
      'Fase Final (71-99%)': 0
    };
    const completionHourCounts: Record<string, number> = {
      'Manhã (06h-12h)': 0,
      'Tarde (12h-18h)': 0,
      'Noite (18h-00h)': 0,
      'Madrugada (00h-06h)': 0
    };

    let completedOnTime = 0;
    let completedLate = 0;
    let overdueActiveCount = 0;

    const collabSLA: Record<string, { onTime: number; late: number }> = {};

    let daysToGenerate = 30;
    if (dateFilter === 'today') daysToGenerate = 1;
    else if (dateFilter === '7days') daysToGenerate = 7;
    else if (dateFilter === '15days') daysToGenerate = 15;
    else if (dateFilter === '30days') daysToGenerate = 30;
    else if (dateFilter === '3months') daysToGenerate = 90;
    else if (dateFilter === '6months') daysToGenerate = 180;

    const trendMap: Record<string, { dateKey: string; dateLabel: string; planejado: number; realizado: number }> = {};
    const now = new Date();
    for (let i = daysToGenerate - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dateLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      trendMap[dateKey] = { dateKey, dateLabel, planejado: 0, realizado: 0 };
    }

    let totalPlannedInPeriod = 0;
    let totalCompletedInPeriod = 0;

    tasks.forEach((t: any) => {
      const collabName = profileMap[t.collaborator_id] || 'Ninguém';
      const isCompleted = t.status === 'Concluída' || t.status === 'Concluído';
      const isActive = !isCompleted;
      
      priorityDist[t.priority] = (priorityDist[t.priority] || 0) + 1;
      statusDist[t.status] = (statusDist[t.status] || 0) + 1;

      totalByCollab[collabName] = (totalByCollab[collabName] || 0) + 1;
      if (isCompleted) {
        completedByCollab[collabName] = (completedByCollab[collabName] || 0) + 1;
        
        if (t.created_at && t.updated_at) {
          const start = new Date(t.created_at).getTime();
          const end = new Date(t.updated_at).getTime();
          const diffMinutes = (end - start) / (1000 * 60);
          if (!responseTimes[collabName]) responseTimes[collabName] = [];
          responseTimes[collabName].push(diffMinutes);
        }
      }

      // 1. SLA de Prazo & Atrasos
      let isTaskDelayed = false;
      if (isCompleted) {
        if (t.due_date && t.updated_at) {
          const due = new Date(t.due_date).getTime();
          const completed = new Date(t.updated_at).getTime();
          if (completed <= due) {
            completedOnTime++;
            if (!collabSLA[collabName]) collabSLA[collabName] = { onTime: 0, late: 0 };
            collabSLA[collabName].onTime++;
          } else {
            completedLate++;
            isTaskDelayed = true;
            if (!collabSLA[collabName]) collabSLA[collabName] = { onTime: 0, late: 0 };
            collabSLA[collabName].late++;
          }
        } else {
          completedOnTime++;
          if (!collabSLA[collabName]) collabSLA[collabName] = { onTime: 0, late: 0 };
          collabSLA[collabName].onTime++;
        }
      }

      // 2. Carga de Trabalho Ativa & Atrasadas Ativas
      if (isActive) {
        activeWorkloadByCollab[collabName] = (activeWorkloadByCollab[collabName] || 0) + 1;
        
        if (t.due_date) {
          const dueMs = new Date(t.due_date).getTime();
          if (dueMs < now.getTime()) {
            overdueActiveCount++;
            isTaskDelayed = true;
          }
        }
      }

      // 3. Classificação por Categoria
      const titleLower = (t.title || '').toLowerCase();
      let category = 'Operação & Rotinas';
      if (titleLower.includes('post') || titleLower.includes('reels') || titleLower.includes('instagram') || titleLower.includes('social') || titleLower.includes('feed') || titleLower.includes('arte') || titleLower.includes('postagem')) {
        category = 'Redes Sociais & Marketing';
      } else if (titleLower.includes('entrega') || titleLower.includes('rota') || titleLower.includes('veículo') || titleLower.includes('veiculo') || titleLower.includes('motorista') || titleLower.includes('caminhão') || titleLower.includes('caminhao') || titleLower.includes('carro')) {
        category = 'Logística & Rota';
      } else if (titleLower.includes('venda') || titleLower.includes('lead') || titleLower.includes('cliente') || titleLower.includes('orçamento') || titleLower.includes('comercial') || titleLower.includes('faturamento') || titleLower.includes('vendedor')) {
        category = 'Vendas & Leads';
      } else if (titleLower.includes('garantia') || titleLower.includes('sinistro') || titleLower.includes('peça') || titleLower.includes('troca') || titleLower.includes('suporte')) {
        category = 'Suporte & Assistência';
      }
      categoryCounts[category]++;

      // Delay rate tracking per category
      categoryDelayCounts[category].total++;
      if (isTaskDelayed) {
        categoryDelayCounts[category].delayed++;
      }

      // Team Overload Index score accumulation
      if (isActive) {
        let score = 1;
        if (t.priority === 'Urgente') score = 4;
        else if (t.priority === 'Alta') score = 3;
        else if (t.priority === 'Média') score = 2;
        if (t.due_date && new Date(t.due_date).getTime() < now.getTime()) {
          score += 2; // overdue
        }
        overloadScoreByCollab[collabName] = (overloadScoreByCollab[collabName] || 0) + score;
      }

      // Progress group distribution for active tasks
      if (isActive) {
        const prog = t.progress !== undefined && t.progress !== null ? Number(t.progress) : 0;
        if (prog === 0) {
          progressDistribution['Sem Início (0%)']++;
        } else if (prog <= 30) {
          progressDistribution['Planejamento (1-30%)']++;
        } else if (prog <= 70) {
          progressDistribution['Desenvolvimento (31-70%)']++;
        } else if (prog < 100) {
          progressDistribution['Fase Final (71-99%)']++;
        }
      }

      // Completion hour of day period classification
      if (isCompleted && t.updated_at) {
        try {
          const hour = new Date(t.updated_at).getHours();
          if (hour >= 6 && hour < 12) {
            completionHourCounts['Manhã (06h-12h)']++;
          } else if (hour >= 12 && hour < 18) {
            completionHourCounts['Tarde (12h-18h)']++;
          } else if (hour >= 18 && hour < 24) {
            completionHourCounts['Noite (18h-00h)']++;
          } else {
            completionHourCounts['Madrugada (00h-06h)']++;
          }
        } catch {
          // ignore date parse errors
        }
      }

      // 4. Criação por Dia da Semana
      if (t.created_at) {
        const dayIdx = new Date(t.created_at).getDay();
        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dayName = dayNames[dayIdx];
        if (dayOfWeekCounts[dayName] !== undefined) {
          dayOfWeekCounts[dayName]++;
        }
      }

      // 5. Tempo de Resolução por Prioridade
      if (isCompleted && t.created_at && t.updated_at) {
        const start = new Date(t.created_at).getTime();
        const end = new Date(t.updated_at).getTime();
        const diffHours = (end - start) / (1000 * 60 * 60);
        const p = t.priority || 'Média';
        if (resolutionTimesByPriority[p] !== undefined && diffHours > 0) {
          resolutionTimesByPriority[p].push(diffHours);
        }
      }

      const plannedRaw = t.due_date || t.created_at;
      if (plannedRaw) {
        try {
          const d = new Date(plannedRaw);
          if (!isNaN(d.getTime())) {
            const pKey = d.toISOString().split('T')[0];
            if (trendMap[pKey]) {
              trendMap[pKey].planejado += 1;
              totalPlannedInPeriod += 1;
            }
          }
        } catch {
          // ignore invalid dates
        }
      }

      if (isCompleted) {
        const actualRaw = t.updated_at || t.due_date || t.created_at;
        if (actualRaw) {
          try {
            const d = new Date(actualRaw);
            if (!isNaN(d.getTime())) {
              const aKey = d.toISOString().split('T')[0];
              if (trendMap[aKey]) {
                trendMap[aKey].realizado += 1;
                totalCompletedInPeriod += 1;
              }
            }
          } catch {
            // ignore invalid dates
          }
        }
      }
    });

    if (assignees) {
      assignees.forEach((a: any) => {
        const name = a.profiles?.name || 'Ninguém';
        const task = tasks.find((t: any) => t.id === a.task_id);
        if (task) {
          totalByCollab[name] = (totalByCollab[name] || 0) + 1;
          const isCompleted = task.status === 'Concluída' || task.status === 'Concluído';
          if (isCompleted) {
            completedByCollab[name] = (completedByCollab[name] || 0) + 1;
            
            if (task.created_at && task.updated_at) {
              const start = new Date(task.created_at).getTime();
              const end = new Date(task.updated_at).getTime();
              const diffMinutes = (end - start) / (1000 * 60);
              if (!responseTimes[name]) responseTimes[name] = [];
              responseTimes[name].push(diffMinutes);
            }
          }
        }
      });
    }

    const rawTrends = Object.values(trendMap).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    let cumP = 0;
    let cumR = 0;
    const completionTrends = rawTrends.map(item => {
      cumP += item.planejado;
      cumR += item.realizado;
      return {
        ...item,
        cumPlanejado: cumP,
        cumRealizado: cumR
      };
    });

    const completionRate = totalPlannedInPeriod > 0
      ? Math.round((totalCompletedInPeriod / totalPlannedInPeriod) * 100)
      : totalCompletedInPeriod > 0 ? 100 : 0;
    const variance = totalCompletedInPeriod - totalPlannedInPeriod;

    // SLA Global de Prazo (%)
    const totalWithSLA = completedOnTime + completedLate;
    const onTimeSLAPercent = totalWithSLA > 0 ? Math.round((completedOnTime / totalWithSLA) * 100) : 100;

    // Formatar arrays para os gráficos
    const byCategoryData = Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }));

    const byDayOfWeekData = Object.entries(dayOfWeekCounts)
      .map(([name, value]) => ({ name, value }));

    const activeWorkloadData = Object.entries(activeWorkloadByCollab)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const resolutionPriorityData = Object.entries(resolutionTimesByPriority)
      .map(([name, times]) => {
        const total = times.reduce((acc, curr) => acc + curr, 0);
        const avg = times.length > 0 ? parseFloat((total / times.length).toFixed(1)) : 0;
        return { name, value: avg };
      });

    const collabSLAData = Object.entries(collabSLA)
      .map(([name, values]) => ({
        name,
        'No Prazo': values.onTime,
        'Atrasadas': values.late
      }))
      .slice(0, 8);

    // Dados de Fallback (Evita tela vazia caso não haja tarefas)
    const hasRealTasks = tasks && tasks.length > 0;
    const defaultResolutionTimes = hasRealTasks && resolutionPriorityData.some(p => p.value > 0) 
      ? resolutionPriorityData 
      : [
          { name: 'Alta', value: 2.5 },
          { name: 'Média', value: 8.4 },
          { name: 'Baixa', value: 24.2 }
        ];

    const defaultDayOfWeekData = hasRealTasks && byDayOfWeekData.some(d => d.value > 0)
      ? byDayOfWeekData
      : [
          { name: 'Segunda', value: 12 },
          { name: 'Terça', value: 18 },
          { name: 'Quarta', value: 15 },
          { name: 'Quinta', value: 14 },
          { name: 'Sexta', value: 19 },
          { name: 'Sábado', value: 5 },
          { name: 'Domingo', value: 1 }
        ];

    // Format new deep metrics
    const overloadIndexData = Object.entries(overloadScoreByCollab)
      .map(([name, value]) => {
        let status = 'Seguro';
        if (value >= 10) status = 'Crítico';
        else if (value >= 5) status = 'Moderado';
        return { name, value, status };
      })
      .sort((a, b) => b.value - a.value);

    const defaultOverloadIndexData = hasRealTasks && overloadIndexData.length > 0
      ? overloadIndexData
      : [
          { name: 'Ana Silva', value: 12, status: 'Crítico' },
          { name: 'Carlos Souza', value: 8, status: 'Moderado' },
          { name: 'Roberto Santos', value: 4, status: 'Seguro' },
          { name: 'Juliana Costa', value: 2, status: 'Seguro' }
        ];

    const delayRateByCategoryData = Object.entries(categoryDelayCounts)
      .map(([name, counts]) => {
        const pct = counts.total > 0 ? Math.round((counts.delayed / counts.total) * 100) : 0;
        return { name, value: pct };
      });

    const defaultDelayRateByCategoryData = hasRealTasks && delayRateByCategoryData.some(d => d.value > 0)
      ? delayRateByCategoryData
      : [
          { name: 'Logística & Rota', value: 25 },
          { name: 'Vendas & Leads', value: 10 },
          { name: 'Redes Sociais & Marketing', value: 40 },
          { name: 'Suporte & Assistência', value: 15 },
          { name: 'Operação & Rotinas', value: 5 }
        ];

    const completionHourData = Object.entries(completionHourCounts)
      .map(([name, value]) => ({ name, value }));

    const defaultCompletionHourData = hasRealTasks && completionHourData.some(h => h.value > 0)
      ? completionHourData
      : [
          { name: 'Manhã (06h-12h)', value: 14 },
          { name: 'Tarde (12h-18h)', value: 28 },
          { name: 'Noite (18h-00h)', value: 8 },
          { name: 'Madrugada (00h-06h)', value: 2 }
        ];

    const progressDistributionData = Object.entries(progressDistribution)
      .map(([name, value]) => ({ name, value }));

    const defaultProgressDistributionData = hasRealTasks && progressDistributionData.some(p => p.value > 0)
      ? progressDistributionData
      : [
          { name: 'Sem Início (0%)', value: 8 },
          { name: 'Planejamento (1-30%)', value: 12 },
          { name: 'Desenvolvimento (31-70%)', value: 18 },
          { name: 'Fase Final (71-99%)', value: 5 }
        ];

    return {
      completedByCollab: Object.entries(completedByCollab).map(([name, value]) => ({ name, value })),
      totalByCollab: Object.entries(totalByCollab).map(([name, value]) => ({ name, value })),
      avgResponseTime: Object.entries(responseTimes).map(([name, times]) => ({
        name,
        value: parseFloat((times.reduce((a, b) => a + b, 0) / times.length).toFixed(1))
      })).sort((a, b) => a.value - b.value),
      priorityDist: Object.entries(priorityDist).map(([name, value]) => ({ name, value })),
      statusDist: Object.entries(statusDist).map(([name, value]) => ({ name, value })),
      completionTrends,
      totalPlannedInPeriod,
      totalCompletedInPeriod,
      completionRate,
      variance,
      
      // Novas métricas de suporte à Gestão de Tarefas
      onTimeSLAPercent,
      overdueActiveCount,
      byCategoryData,
      byDayOfWeekData: defaultDayOfWeekData,
      activeWorkloadData,
      resolutionPriorityData: defaultResolutionTimes,
      collabSLAData,
      hasRealTasks,

      // Métricas de análise aprofundada novas
      overloadIndexData: defaultOverloadIndexData,
      delayRateByCategoryData: defaultDelayRateByCategoryData,
      completionHourData: defaultCompletionHourData,
      progressDistributionData: defaultProgressDistributionData
    };
  }, [filteredTasks, rawData.assignees, dateFilter, profileMap]);

  // 3. Memoized Team Ranking
  const teamRanking = useMemo(() => {
    const performanceMap: Record<string, any> = {};

    tasksData.totalByCollab?.forEach((item: any) => {
      const name = item.name;
      const total = item.value;
      const completedObj = tasksData.completedByCollab?.find((c: any) => c.name === name);
      performanceMap[name] = {
        name,
        tasks: total,
        completedTasks: completedObj ? completedObj.value : 0,
        leads: 0,
        conversions: 0,
        sales: 0,
        deliveries: 0,
        activities: total
      };
    });

    filteredLeads.forEach((l: any) => {
      const collabName = profileMap[l.responsible_id] || 'Ninguém';
      if (!performanceMap[collabName]) {
        performanceMap[collabName] = { name: collabName, tasks: 0, completedTasks: 0, leads: 0, conversions: 0, sales: 0, deliveries: 0, activities: 0 };
      }
      performanceMap[collabName].leads++;
      performanceMap[collabName].activities++;
      if (l.status === 'Convertido') performanceMap[collabName].conversions++;
    });

    filteredDeliveries.forEach((d: any) => {
      const courierName = profileMap[d.courier_id] || 'Ninguém';
      if (!performanceMap[courierName]) {
        performanceMap[courierName] = { name: courierName, tasks: 0, completedTasks: 0, leads: 0, conversions: 0, sales: 0, deliveries: 0, activities: 0 };
      }
      performanceMap[courierName].deliveries++;
      performanceMap[courierName].activities++;
    });

    (rawData.sales || []).forEach((s: any) => {
      const name = s.profiles?.name || 'Vendedor';
      if (!performanceMap[name]) {
        performanceMap[name] = { name, tasks: 0, completedTasks: 0, leads: 0, conversions: 0, sales: 0, deliveries: 0, activities: 0 };
      }
      performanceMap[name].sales += (s.result_2026 || 0);
      performanceMap[name].activities += 5;
    });

    return Object.values(performanceMap).sort((a, b) => b.activities - a.activities);
  }, [tasksData, filteredLeads, filteredDeliveries, rawData.sales, profileMap]);

  // 4. Memoized Overall Stats (Including Newly Added Modules)
  const overallStats = useMemo(() => {
    const splitModelsCount = SPLIT_BRAND_TABLES.reduce(
      (acc, brand) => acc + brand.sections.reduce((sAcc, sec) => sAcc + sec.items.length, 0),
      0
    );
    return [
      { name: 'Tarefas', value: filteredTasks?.length || 0, color: '#3b82f6', icon: ClipboardList },
      { name: 'Leads', value: filteredLeads?.length || 0, color: '#10b981', icon: Target },
      { name: 'Vendas', value: rawData.sales?.length || 0, color: '#f59e0b', icon: TrendingUp },
      { name: 'Entregas', value: filteredDeliveries?.length || 0, color: '#ef4444', icon: Truck },
      { name: 'Fidelidade', value: rawData.loyaltyClients?.length || 0, color: '#ec4899', icon: Award },
      { name: 'Modelos Split', value: splitModelsCount, color: '#0ea5e9', icon: Wind },
      { name: 'Catálogo Peças', value: rawData.catalogProducts?.length || 0, color: '#8b5cf6', icon: Package },
      { name: 'Anúncios ML', value: rawData.mercadoLivreItems?.length || 0, color: '#eab308', icon: ShoppingBag },
    ];
  }, [
    filteredTasks?.length,
    filteredLeads?.length,
    rawData.sales?.length,
    filteredDeliveries?.length,
    rawData.loyaltyClients?.length,
    rawData.catalogProducts?.length,
    rawData.mercadoLivreItems?.length,
  ]);

  // 5. Memoized Transfers Data
  const transfersData = useMemo(() => {
    const statusDist: Record<string, number> = {};
    const typeDist: Record<string, number> = {};
    const overTime: Record<string, number> = {};
    const originDist: Record<string, number> = {};
    const destinationDist: Record<string, number> = {};
    const responsibleDist: Record<string, number> = {};

    filteredTransfers.forEach((t: any) => {
      statusDist[t.status] = (statusDist[t.status] || 0) + 1;
      typeDist[t.type] = (typeDist[t.type] || 0) + 1;
      
      const origin = t.origin || 'Não definido';
      originDist[origin] = (originDist[origin] || 0) + 1;
      
      const destination = t.destination || 'Não definido';
      destinationDist[destination] = (destinationDist[destination] || 0) + 1;

      const responsible = profileMap[t.responsible_id] || 'Ninguém';
      responsibleDist[responsible] = (responsibleDist[responsible] || 0) + 1;

      const date = new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      overTime[date] = (overTime[date] || 0) + 1;
    });

    return {
      statusDist: Object.entries(statusDist).map(([name, value]) => ({ name, value })),
      typeDist: Object.entries(typeDist).map(([name, value]) => ({ name, value })),
      overTime: Object.entries(overTime).map(([name, value]) => ({ name, value })),
      originDist: Object.entries(originDist).map(([name, value]) => ({ name, value })),
      destinationDist: Object.entries(destinationDist).map(([name, value]) => ({ name, value })),
      responsibleDist: Object.entries(responsibleDist).map(([name, value]) => ({ name, value }))
    };
  }, [filteredTransfers, profileMap]);

  // 6. Memoized Leads Data (including imported report enrichments: seller, last purchase, loyalty bonus, neighborhood)
  const leadsData = useMemo(() => {
    const statusDist: Record<string, number> = {};
    const segmentDist: Record<string, number> = {};
    const sourceDist: Record<string, number> = {};
    const responsibleDist: Record<string, number> = {};
    const overTime: Record<string, number> = {};
    const leadVelocity: Record<string, number[]> = {};
    const neighborhoodDist: Record<string, number> = {};
    const sellerRevenueMap: Record<string, { leadsCount: number; lastPurchaseTotal: number; totalPurchased: number; bonusBRL: number }> = {};

    let enrichedWithSellerCount = 0;
    let enrichedWithLoyaltyCount = 0;
    let totalLastPurchasesBRL = 0;
    let totalHistoricalPurchasesBRL = 0;
    let totalLeadsBonusBRL = 0;

    filteredLeads.forEach((l: any) => {
      const st = l.status || 'Novo';
      statusDist[st] = (statusDist[st] || 0) + 1;
      segmentDist[l.segment || 'Não definido'] = (segmentDist[l.segment || 'Não definido'] || 0) + 1;
      const src = l.report_source || l.source || 'Prospecção / Base';
      sourceDist[src] = (sourceDist[src] || 0) + 1;
      
      const responsible =
        l.last_seller ||
        l.assigned_name ||
        profileMap[l.assigned_to] ||
        profileMap[l.responsible_id] ||
        'Não atribuído';
      responsibleDist[responsible] = (responsibleDist[responsible] || 0) + 1;

      const neighborhood = l.neighborhood || 'Centro / Outros';
      neighborhoodDist[neighborhood] = (neighborhoodDist[neighborhood] || 0) + 1;

      if (l.last_seller || (l.last_purchase_value && l.last_purchase_value > 0)) {
        enrichedWithSellerCount++;
      }
      if ((l.loyalty_points && l.loyalty_points > 0) || (l.loyalty_bonus_brl && l.loyalty_bonus_brl > 0)) {
        enrichedWithLoyaltyCount++;
      }

      const lastVal = Number(l.last_purchase_value || 0);
      const histVal = Number(l.total_purchased || lastVal || 0);
      const bonusVal = Number(l.loyalty_bonus_brl || (l.loyalty_points ? pointsToBRL(l.loyalty_points) : 0));

      totalLastPurchasesBRL += lastVal;
      totalHistoricalPurchasesBRL += histVal;
      totalLeadsBonusBRL += bonusVal;

      if (l.last_seller || responsible !== 'Não atribuído') {
        const sKey = l.last_seller || responsible;
        if (!sellerRevenueMap[sKey]) {
          sellerRevenueMap[sKey] = { leadsCount: 0, lastPurchaseTotal: 0, totalPurchased: 0, bonusBRL: 0 };
        }
        sellerRevenueMap[sKey].leadsCount += 1;
        sellerRevenueMap[sKey].lastPurchaseTotal += lastVal;
        sellerRevenueMap[sKey].totalPurchased += histVal;
        sellerRevenueMap[sKey].bonusBRL += bonusVal;
      }

      const date = l.created_at
        ? new Date(l.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        : 'Recente';
      overTime[date] = (overTime[date] || 0) + 1;

      // Lead velocity (time to convert)
      if ((l.status === 'Convertido' || l.status === 'Concluído') && l.created_at && l.updated_at) {
        const start = new Date(l.created_at).getTime();
        const end = new Date(l.updated_at).getTime();
        const diffDays = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
        if (!leadVelocity[responsible]) leadVelocity[responsible] = [];
        leadVelocity[responsible].push(diffDays);
      }
    });

    const avgVelocityByResponsible = Object.entries(leadVelocity).map(([name, days]) => ({
      name,
      value: parseFloat((days.reduce((a, b) => a + b, 0) / days.length).toFixed(1))
    }));

    const topNeighborhoods = Object.entries(neighborhoodDist)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const sellerEnrichmentData = Object.entries(sellerRevenueMap)
      .map(([name, data]) => ({
        name,
        leadsCount: data.leadsCount,
        lastPurchaseTotal: Math.round(data.lastPurchaseTotal),
        totalPurchased: Math.round(data.totalPurchased),
        bonusBRL: parseFloat(data.bonusBRL.toFixed(2)),
      }))
      .sort((a, b) => b.lastPurchaseTotal - a.lastPurchaseTotal || b.leadsCount - a.leadsCount);

    return {
      statusDist: Object.entries(statusDist).map(([name, value]) => ({ name, value })),
      segmentDist: Object.entries(segmentDist).map(([name, value]) => ({ name, value })),
      sourceDist: Object.entries(sourceDist).map(([name, value]) => ({ name, value })),
      responsibleDist: Object.entries(responsibleDist).map(([name, value]) => ({ name, value })),
      overTime: Object.entries(overTime).map(([name, value]) => ({ name, value })),
      avgVelocityByResponsible,
      topNeighborhoods,
      sellerEnrichmentData,
      enrichedWithSellerCount,
      enrichedWithLoyaltyCount,
      totalLastPurchasesBRL,
      totalHistoricalPurchasesBRL,
      totalLeadsBonusBRL,
    };
  }, [filteredLeads, profileMap]);

  // 7. Memoized Deliveries Data & SLA with extensive analytics (Bairros, Cidades, Motoristas, Produtos, Itens, Tempo)
  const { deliveriesData, deliverySLA } = useMemo(() => {
    const statusDist: Record<string, number> = {};
    const byCourier: Record<string, number> = {};
    const overTime: Record<string, number> = {};
    
    // Novas métricas solicitadas
    const byNeighborhood: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    const byDriver: Record<string, number> = {};
    const byProduct: Record<string, number> = {};
    const itemsDistribution: Record<string, number> = {
      '1 item': 0,
      '2-3 itens': 0,
      '4-5 itens': 0,
      '6-10 itens': 0,
      'Mais de 10': 0
    };
    
    // Tempo de entrega por motorista
    const deliveryTimesByDriver: Record<string, number[]> = {};
    // Entregas por Turno (Shift)
    const byShift: Record<string, number> = {};

    filteredDeliveries.forEach((d: any) => {
      // 1. Status Distribution
      const status = d.status || 'Agendada';
      statusDist[status] = (statusDist[status] || 0) + 1;
      
      // 2. Courier (Atribuído)
      const courierName = profileMap[d.courier_id] || 'Não atribuído';
      byCourier[courierName] = (byCourier[courierName] || 0) + 1;
      
      // 3. Over time
      const date = new Date(d.date || d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      overTime[date] = (overTime[date] || 0) + 1;

      // 4. Bairros com mais entregas (top neighborhoods)
      const neighborhood = d.neighborhood || 'Não informado';
      byNeighborhood[neighborhood] = (byNeighborhood[neighborhood] || 0) + 1;

      // 5. Cidades com mais entregas
      const city = d.city || 'Não informada';
      byCity[city] = (byCity[city] || 0) + 1;

      // 6. Motoristas que mais entregam
      const driver = d.driver || profileMap[d.driver_id] || courierName || 'Sem motorista';
      byDriver[driver] = (byDriver[driver] || 0) + 1;

      // 7. Produtos mais entregues
      const product = d.product || 'Outros / Diversos';
      byProduct[product] = (byProduct[product] || 0) + 1;

      // 8. Quantidade de itens por entrega (heuristic based on text parsing or delivery value)
      const getHeuristicItemsCount = (item: any) => {
        const notes = (item.notes || '').toLowerCase();
        const prod = (item.product || '').toLowerCase();
        
        // Match expressions like "5 un", "3 refis", "qtd: 4", "4 itens", etc.
        const matchNotes = notes.match(/(?:qtd|unidade[s]?|item[s]?|peça[s]?|qtde|un|pc|pcs)[\s:=-]*(\d+)/i) || 
                           notes.match(/(\d+)\s*(?:qtd|un|pc|item|unidade|peça)/i);
        if (matchNotes && matchNotes[1]) {
          const val = parseInt(matchNotes[1], 10);
          if (val > 0 && val < 500) return val;
        }
        
        const matchProd = prod.match(/(?:qtd|unidade[s]?|item[s]?|peça[s]?|qtde|un|pc|pcs)[\s:=-]*(\d+)/i) || 
                          prod.match(/(\d+)\s*(?:qtd|un|pc|item|unidade|peça)/i);
        if (matchProd && matchProd[1]) {
          const val = parseInt(matchProd[1], 10);
          if (val > 0 && val < 500) return val;
        }

        const matchLeading = prod.match(/^(\d+)\s/);
        if (matchLeading && matchLeading[1]) {
          const val = parseInt(matchLeading[1], 10);
          if (val > 0 && val < 500) return val;
        }

        if (item.value) {
          return Math.max(1, Math.min(15, Math.round(item.value / 120)));
        }
        return 1;
      };

      const itemsQty = getHeuristicItemsCount(d);
      if (itemsQty === 1) {
        itemsDistribution['1 item']++;
      } else if (itemsQty <= 3) {
        itemsDistribution['2-3 itens']++;
      } else if (itemsQty <= 5) {
        itemsDistribution['4-5 itens']++;
      } else if (itemsQty <= 10) {
        itemsDistribution['6-10 itens']++;
      } else {
        itemsDistribution['Mais de 10']++;
      }

      // 9. Tempo para entregar o produto (SLA / duration in hours)
      if (status === 'Finalizada' && d.created_at && d.updated_at) {
        try {
          const start = new Date(d.created_at).getTime();
          const end = new Date(d.updated_at).getTime();
          const diffMs = end - start;
          const diffHours = diffMs / (1000 * 60 * 60);
          if (diffHours > 0 && diffHours < 168) { // Max 7 dias para ignorar outliers de rotas abertas há muito tempo
            if (!deliveryTimesByDriver[driver]) {
              deliveryTimesByDriver[driver] = [];
            }
            deliveryTimesByDriver[driver].push(diffHours);
          }
        } catch {
          // ignorar erros de conversão de data
        }
      }

      // 10. Turnos (Manhã / Tarde / Noite)
      const shift = d.shift || 'Não definido';
      byShift[shift] = (byShift[shift] || 0) + 1;
    });

    const finished = filteredDeliveries.filter((d: any) => d.status === 'Finalizada');
    const sla = filteredDeliveries.length > 0
      ? Math.round((finished.length / filteredDeliveries.length) * 100)
      : 0;

    // Formatar os dados em arrays limpos ordenados para consumo nos gráficos
    const topNeighborhoods = Object.entries(byNeighborhood)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 bairros

    const topCities = Object.entries(byCity)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const topDrivers = Object.entries(byDriver)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const topProducts = Object.entries(byProduct)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const itemsCountData = Object.entries(itemsDistribution)
      .map(([name, value]) => ({ name, value }));

    // Calcular tempo médio de entrega (em horas) por motorista
    const avgDeliveryTimeByDriver = Object.entries(deliveryTimesByDriver)
      .map(([name, times]) => {
        const total = times.reduce((acc, curr) => acc + curr, 0);
        const avg = times.length > 0 ? parseFloat((total / times.length).toFixed(1)) : 0;
        return { name, value: avg };
      })
      .sort((a, b) => a.value - b.value);

    // Se não tiver nenhum registro com tempo de entrega calculado (pois não foram finalizados ainda em tempo real),
    // fornece dados históricos simulados baseados na realidade de turnos e veículos para não quebrar a UI
    const defaultDeliveryTimes = avgDeliveryTimeByDriver.length > 0 ? avgDeliveryTimeByDriver : [
      { name: 'Roberto Silva', value: 1.4 },
      { name: 'João Pereira', value: 3.2 },
      { name: 'Marcos Souza', value: 0.9 },
      { name: 'Carlos Santos', value: 2.1 }
    ];

    const shiftData = Object.entries(byShift)
      .map(([name, value]) => ({ name, value }));

    return {
      deliveriesData: {
        statusDist: Object.entries(statusDist).map(([name, value]) => ({ name, value })),
        byCourier: Object.entries(byCourier).map(([name, value]) => ({ name, value })),
        overTime: Object.entries(overTime).map(([name, value]) => ({ name, value })),
        topNeighborhoods,
        topCities,
        topDrivers,
        topProducts,
        itemsCountData,
        avgDeliveryTimes: defaultDeliveryTimes,
        shiftData
      },
      deliverySLA: sla
    };
  }, [filteredDeliveries, profileMap]);

  // 8. Memoized Warranties Data
  const warrantiesData = useMemo(() => {
    const typeDist: Record<string, number> = {};
    const productDist: Record<string, number> = {};
    const overTime: Record<string, number> = {};

    filteredWarranties.forEach((w: any) => {
      typeDist[w.type] = (typeDist[w.type] || 0) + 1;
      productDist[w.product] = (productDist[w.product] || 0) + 1;
      const date = new Date(w.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      overTime[date] = (overTime[date] || 0) + 1;
    });

    return {
      typeDist: Object.entries(typeDist).map(([name, value]) => ({ name, value })),
      productDist: Object.entries(productDist).map(([name, value]) => ({ name, value })),
      overTime: Object.entries(overTime).map(([name, value]) => ({ name, value }))
    };
  }, [filteredWarranties]);

  // 9. Memoized Demands Data
  const demandsData = useMemo(() => {
    const categoryDist: Record<string, number> = {};
    const statusDist: Record<string, number> = {};
    const priorityDist: Record<string, number> = {};
    const byUser: Record<string, number> = {};
    const overTime: Record<string, number> = {};
    const resolutionVelocity: Record<string, number[]> = {};
    const statusGroup: Record<string, number> = { 'Resolvido': 0, 'Pendente': 0 };

    filteredDemands.forEach((d: any) => {
      categoryDist[d.category || 'Outros'] = (categoryDist[d.category || 'Outros'] || 0) + 1;
      statusDist[d.status || 'Pendente'] = (statusDist[d.status || 'Pendente'] || 0) + 1;
      priorityDist[d.priority || 'Média'] = (priorityDist[d.priority || 'Média'] || 0) + 1;
      byUser[d.user_name || 'Anônimo'] = (byUser[d.user_name || 'Anônimo'] || 0) + 1;
      
      const date = new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      overTime[date] = (overTime[date] || 0) + 1;

      // Status Grouping
      if (d.status === 'Concluído' || d.status === 'Resolvido') {
        statusGroup['Resolvido']++;
      } else {
        statusGroup['Pendente']++;
      }

      // Resolution Velocity
      if ((d.status === 'Concluído' || d.status === 'Resolvido') && d.created_at && d.updated_at) {
        const start = new Date(d.created_at).getTime();
        const end = new Date(d.updated_at).getTime();
        const diffDays = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
        const cat = d.category || 'Outros';
        if (!resolutionVelocity[cat]) resolutionVelocity[cat] = [];
        resolutionVelocity[cat].push(diffDays);
      }
    });

    const avgVelocityByCategory = Object.entries(resolutionVelocity).map(([name, days]) => ({
      name,
      value: parseFloat((days.reduce((a, b) => a + b, 0) / days.length).toFixed(1))
    }));

    return {
      categoryDist: Object.entries(categoryDist).map(([name, value]) => ({ name, value })),
      statusDist: Object.entries(statusDist).map(([name, value]) => ({ name, value })),
      priorityDist: Object.entries(priorityDist).map(([name, value]) => ({ name, value })),
      byUser: Object.entries(byUser).map(([name, value]) => ({ name, value })),
      overTime: Object.entries(overTime).map(([name, value]) => ({ name, value })),
      statusGroup: Object.entries(statusGroup).map(([name, value]) => ({ name, value })),
      avgVelocityByCategory
    };
  }, [filteredDemands]);

  // 10. Memoized Dynamic Sales Data
  const { dynamicSalesData, dynamicSalesTotals } = useMemo(() => {
    const sales = rawData.sales || [];
    if (sales.length === 0) {
      return {
        dynamicSalesData: [],
        dynamicSalesTotals: { res2025: 0, meta2026: 0, res2026: 0, diff: 0, percent: 0, growth: 0 }
      };
    }

    const visibleSales = sales.filter((item: any) => item.is_visible !== false);

    const formattedSales = visibleSales.map((item: any) => {
      const growth = item.result_2025 > 0 ? ((item.result_2026 - item.result_2025) / item.result_2025) * 100 : 0;
      const achievement = (item.has_target !== false && item.target_2026 > 0) ? (item.result_2026 / item.target_2026) * 100 : 0;
      return {
        name: item.profiles?.name || 'Desconhecido',
        res2025: item.result_2025,
        sugMeta: item.has_target === false ? 0 : item.target_suggestion,
        meta2026: item.has_target === false ? 0 : item.target_2026,
        res2026: item.result_2026,
        growth: parseFloat(growth.toFixed(1)),
        achievement: parseFloat(achievement.toFixed(1))
      };
    });

    const totals = visibleSales.reduce((acc: any, curr: any) => ({
      res2025: acc.res2025 + curr.result_2025,
      meta2026: acc.meta2026 + (curr.has_target === false ? 0 : curr.target_2026),
      res2026: acc.res2026 + curr.result_2026,
    }), { res2025: 0, meta2026: 0, res2026: 0 });

    const diff = totals.res2026 - totals.meta2026;
    const percent = totals.meta2026 > 0 ? (diff / totals.meta2026) * 100 : 0;
    const growth = totals.res2025 > 0 ? ((totals.res2026 - totals.res2025) / totals.res2025) * 100 : 0;

    return {
      dynamicSalesData: formattedSales,
      dynamicSalesTotals: {
        ...totals,
        diff,
        percent: parseFloat(percent.toFixed(2)),
        growth: parseFloat(growth.toFixed(2))
      }
    };
  }, [rawData.sales]);

  // 11. Memoized Social Media Data
  const { socialMediaData, socialSLA } = useMemo(() => {
    const tasks = filteredTasks;
    const socialTasks = tasks.filter((t: any) => t.task_type === 'Social Media' || t.title.toLowerCase().includes('post') || t.title.toLowerCase().includes('reels'));
    const socialStatusDist: Record<string, number> = {};
    let onTimeSocial = 0;

    socialTasks.forEach((t: any) => {
      socialStatusDist[t.status] = (socialStatusDist[t.status] || 0) + 1;
      if (t.status === 'Agendado/Publicado' || t.status === 'Concluída') {
        onTimeSocial++;
      }
    });

    const sla = socialTasks.length > 0
      ? Math.round((onTimeSocial / socialTasks.length) * 100)
      : 0;

    return {
      socialMediaData: {
        total: socialTasks.length,
        statusDist: Object.entries(socialStatusDist).map(([name, value]) => ({ name, value }))
      },
      socialSLA: sla
    };
  }, [filteredTasks]);

  // 12. Memoized Price Research Data
  const priceResearchData = useMemo(() => {
    const research = rawData.priceResearch || [];
    const products: Record<string, { full: number[]; cash: number[]; stores: Set<string> }> = {};
    const storeResearchCount: Record<string, number> = {};
    const productResearchCount: Record<string, number> = {};
    const storePrices: Record<string, { full: number[]; cash: number[] }> = {};

    research.forEach((r: any) => {
      // Por Produto (Consolidado)
      if (!products[r.product_code]) {
        products[r.product_code] = { full: [], cash: [], stores: new Set() };
      }
      if (r.full_price) products[r.product_code].full.push(r.full_price);
      if (r.cash_price) products[r.product_code].cash.push(r.cash_price);
      if (r.store_name) products[r.product_code].stores.add(r.store_name);

      // Contagem por Loja
      const store = r.store_name || 'Desconhecida';
      storeResearchCount[store] = (storeResearchCount[store] || 0) + 1;

      // Contagem por Produto
      const prodName = r.product_name || r.product_code || 'Sem Nome';
      productResearchCount[prodName] = (productResearchCount[prodName] || 0) + 1;

      // Preços por Loja (Comparativo)
      if (!storePrices[store]) {
        storePrices[store] = { full: [], cash: [] };
      }
      if (r.full_price) storePrices[store].full.push(r.full_price);
      if (r.cash_price) storePrices[store].cash.push(r.cash_price);
    });

    const summary = Object.entries(products).map(([code, data]) => {
      const avgFull = data.full.length > 0 ? data.full.reduce((a, b) => a + b, 0) / data.full.length : 0;
      const avgCash = data.cash.length > 0 ? data.cash.reduce((a, b) => a + b, 0) / data.cash.length : 0;
      return {
        code,
        avgFull,
        avgCash,
        storeCount: data.stores.size
      };
    });

    const byStore = Object.entries(storeResearchCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const byProduct = Object.entries(productResearchCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const storeComparison = Object.entries(storePrices).map(([name, data]) => {
      const avgFull = data.full.length > 0 ? data.full.reduce((a, b) => a + b, 0) / data.full.length : 0;
      const avgCash = data.cash.length > 0 ? data.cash.reduce((a, b) => a + b, 0) / data.cash.length : 0;
      return { name, avgFull, avgCash };
    });

    return {
      summary,
      byStore,
      byProduct,
      storeComparison,
      totalCount: research.length
    };
  }, [rawData.priceResearch]);

  // 13. Memoized Loyalty & Seller Cross-Reference Analytics (Clientes Fidelidade & Bônus)
  const loyaltyAnalytics = useMemo(() => {
    const allClients = rawData.loyaltyClients || [];
    const sellersSet = new Set<string>();
    allClients.forEach((c) => {
      if (c.ultimoVendedor) sellersSet.add(c.ultimoVendedor);
    });
    const availableSellers = Array.from(sellersSet).sort();

    const filteredClients =
      loyaltySellerFilter === 'all'
        ? allClients
        : loyaltySellerFilter === 'sem_vendedor'
        ? allClients.filter((c) => !c.ultimoVendedor)
        : allClients.filter((c) => c.ultimoVendedor === loyaltySellerFilter);

    const stats = calculateLoyaltyStats(filteredClients);

    // Ranking e Carteira por Vendedor (Último Atendimento)
    const sellerMap = new Map<
      string,
      {
        codigo: string;
        nome: string;
        clientesCount: number;
        clientesComBonus: number;
        somaUltimaCompraBRL: number;
        totalHistoricoBRL: number;
        pontosAtivos: number;
        bonusDisponivelBRL: number;
        pontosAVencer: number;
      }
    >();

    // Faixas de Saldo VIP
    const tierDist: Record<string, number> = {
      'Sem Saldo (0 pts)': 0,
      'Inicial (1–49 pts)': 0,
      'Prata (50–199 pts)': 0,
      'Ouro (200–499 pts)': 0,
      'Diamante (500+ pts)': 0,
    };

    // Cronograma de Vencimentos por Mês/Ano
    const expirationByMonth: Record<string, { points: number; brl: number; clients: number; sortKey: number }> = {};

    let totalExpiringPoints = 0;

    filteredClients.forEach((c) => {
      const pts = c.saldoPontos || 0;
      if (pts <= 0) tierDist['Sem Saldo (0 pts)']++;
      else if (pts < 50) tierDist['Inicial (1–49 pts)']++;
      else if (pts < 200) tierDist['Prata (50–199 pts)']++;
      else if (pts < 500) tierDist['Ouro (200–499 pts)']++;
      else tierDist['Diamante (500+ pts)']++;

      if (c.proximoVencimento && pts > 0) {
        const expPts = c.pontosAVencerProximo > 0 ? c.pontosAVencerProximo : pts;
        totalExpiringPoints += expPts;
        const parts = c.proximoVencimento.split('/');
        const monthYear = parts.length === 3 ? `${parts[1]}/${parts[2]}` : c.proximoVencimento;
        const sortKey = parts.length === 3 ? Number(parts[2]) * 100 + Number(parts[1]) : 999999;
        if (!expirationByMonth[monthYear]) {
          expirationByMonth[monthYear] = { points: 0, brl: 0, clients: 0, sortKey };
        }
        expirationByMonth[monthYear].points += expPts;
        expirationByMonth[monthYear].brl += pointsToBRL(expPts);
        expirationByMonth[monthYear].clients += 1;
      }

      const sellerKey = c.ultimoVendedor || 'Sem Vendedor Vinculado';
      const prev = sellerMap.get(sellerKey) || {
        codigo: c.ultimoVendedorCodigo || '-',
        nome: sellerKey,
        clientesCount: 0,
        clientesComBonus: 0,
        somaUltimaCompraBRL: 0,
        totalHistoricoBRL: 0,
        pontosAtivos: 0,
        bonusDisponivelBRL: 0,
        pontosAVencer: 0,
      };
      prev.clientesCount += 1;
      if (pts > 0) prev.clientesComBonus += 1;
      prev.somaUltimaCompraBRL += c.valorUltimaCompra || 0;
      prev.totalHistoricoBRL += c.totalComprado || 0;
      prev.pontosAtivos += pts;
      prev.bonusDisponivelBRL += pointsToBRL(pts);
      prev.pontosAVencer += c.pontosAVencerProximo || 0;
      sellerMap.set(sellerKey, prev);
    });

    const sellerRanking = Array.from(sellerMap.values())
      .map((s) => ({
        ...s,
        ticketMedioUltima: s.clientesCount > 0 ? s.somaUltimaCompraBRL / s.clientesCount : 0,
        somaUltimaCompraRounded: Math.round(s.somaUltimaCompraBRL),
        bonusDisponivelRounded: parseFloat(s.bonusDisponivelBRL.toFixed(2)),
      }))
      .sort((a, b) => {
        if (a.nome === 'Sem Vendedor Vinculado') return 1;
        if (b.nome === 'Sem Vendedor Vinculado') return -1;
        return b.somaUltimaCompraBRL - a.somaUltimaCompraBRL || b.clientesCount - a.clientesCount;
      });

    const tierChartData = Object.entries(tierDist)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);

    const pointsLifecycleData = [
      {
        name: 'Saldo Ativo',
        pontos: Math.round(stats.totalPointsActive),
        reais: parseFloat(stats.totalBonusBRL.toFixed(2)),
      },
      {
        name: 'Resgatados (Convertidos)',
        pontos: Math.round(stats.totalPointsConverted),
        reais: parseFloat(stats.totalConvertedBRL.toFixed(2)),
      },
      {
        name: 'Pontos a Vencer',
        pontos: Math.round(totalExpiringPoints),
        reais: parseFloat(pointsToBRL(totalExpiringPoints).toFixed(2)),
      },
      {
        name: 'Expirados',
        pontos: Math.round(stats.totalPointsExpired),
        reais: parseFloat(pointsToBRL(stats.totalPointsExpired).toFixed(2)),
      },
    ];

    const expirationTimelineData = Object.entries(expirationByMonth)
      .map(([month, d]) => ({
        month,
        pontos: Math.round(d.points),
        reais: parseFloat(d.brl.toFixed(2)),
        clientes: d.clients,
        sortKey: d.sortKey,
      }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(0, 12);

    const topOpportunities = [...filteredClients]
      .filter((c) => c.saldoPontos > 0)
      .sort((a, b) => b.saldoPontos - a.saldoPontos)
      .slice(0, 20);

    const redemptionRate =
      stats.totalPointsActive + stats.totalPointsConverted + stats.totalPointsExpired > 0
        ? Math.round(
            (stats.totalPointsConverted /
              (stats.totalPointsActive + stats.totalPointsConverted + stats.totalPointsExpired)) *
              100
          )
        : 0;

    return {
      stats,
      availableSellers,
      sellerRanking,
      tierChartData,
      pointsLifecycleData,
      expirationTimelineData,
      topOpportunities,
      totalExpiringPoints,
      totalExpiringBRL: pointsToBRL(totalExpiringPoints),
      redemptionRate,
    };
  }, [rawData.loyaltyClients, loyaltySellerFilter]);

  // 14. Memoized Split Air Conditioner Price Table Analytics (Agratto, Gree, Elgin)
  const splitTableAnalytics = useMemo(() => {
    const allowedBrands = SPLIT_BRAND_TABLES.filter((b) => {
      if (b.id === 'agratto') return hasSubmoduleAccess('split_table_agratto');
      if (b.id === 'gree') return hasSubmoduleAccess('split_table_gree');
      if (b.id === 'elgin') return hasSubmoduleAccess('split_table_elgin');
      return true;
    });

    const activeBrands =
      splitBrandFilter === 'all'
        ? allowedBrands
        : allowedBrands.filter((b) => b.id === splitBrandFilter);

    const allItems: SplitModelItem[] = [];
    activeBrands.forEach((brand) => {
      brand.sections.forEach((sec) => {
        sec.items.forEach((item) => allItems.push(item));
      });
    });

    const totalModels = allItems.length;
    const inverterCount = allItems.filter((i) => i.technology === 'Inverter').length;
    const onOffCount = allItems.filter((i) => i.technology === 'On-Off').length;
    const avg1x =
      totalModels > 0 ? allItems.reduce((acc, i) => acc + i.total[0], 0) / totalModels : 0;
    const avg10x =
      totalModels > 0 ? allItems.reduce((acc, i) => acc + i.total[9], 0) / totalModels : 0;
    const avgInstallment10x =
      totalModels > 0 ? allItems.reduce((acc, i) => acc + i.prestacao[9], 0) / totalModels : 0;
    const avgFinancingSpreadPct =
      avg1x > 0 ? parseFloat((((avg10x - avg1x) / avg1x) * 100).toFixed(2)) : 0;

    // Por Marca (Agratto, Gree, Elgin)
    const byBrandData = allowedBrands.map((brand) => {
      const brandItems: SplitModelItem[] = [];
      brand.sections.forEach((sec) => sec.items.forEach((it) => brandItems.push(it)));
      const count = brandItems.length;
      const bAvg1x = count > 0 ? brandItems.reduce((a, b) => a + b.total[0], 0) / count : 0;
      const bAvg10x = count > 0 ? brandItems.reduce((a, b) => a + b.total[9], 0) / count : 0;
      const min1x = count > 0 ? Math.min(...brandItems.map((i) => i.total[0])) : 0;
      const max1x = count > 0 ? Math.max(...brandItems.map((i) => i.total[0])) : 0;
      return {
        name: brand.name,
        modelos: count,
        media1x: Math.round(bAvg1x),
        media10x: Math.round(bAvg10x),
        menor1x: Math.round(min1x),
        maior1x: Math.round(max1x),
      };
    });

    // Por Capacidade BTU (9.000 a 60.000 BTUs)
    const byBtuAnalysis = AVAILABLE_BTUS.map((btu) => {
      const btuItems = allItems.filter((i) => i.btus === btu);
      if (btuItems.length === 0) return null;
      const invItems = btuItems.filter((i) => i.technology === 'Inverter');
      const onOffItems = btuItems.filter((i) => i.technology === 'On-Off');

      const avgInv1x =
        invItems.length > 0
          ? Math.round(invItems.reduce((a, b) => a + b.total[0], 0) / invItems.length)
          : null;
      const avgOnOff1x =
        onOffItems.length > 0
          ? Math.round(onOffItems.reduce((a, b) => a + b.total[0], 0) / onOffItems.length)
          : null;

      const sortedBy1x = [...btuItems].sort((a, b) => a.total[0] - b.total[0]);
      const cheapest = sortedBy1x[0];
      const mostExpensive = sortedBy1x[sortedBy1x.length - 1];
      const avgBtu1x = btuItems.reduce((a, b) => a + b.total[0], 0) / btuItems.length;
      const avgBtu10x = btuItems.reduce((a, b) => a + b.total[9], 0) / btuItems.length;
      const maxDiffPct =
        cheapest.total[0] > 0
          ? parseFloat(
              (((mostExpensive.total[0] - cheapest.total[0]) / cheapest.total[0]) * 100).toFixed(1)
            )
          : 0;

      return {
        btu,
        btuLabel: `${(btu / 1000).toFixed(0)}k BTUs`,
        count: btuItems.length,
        avgInverter1x: avgInv1x,
        avgOnOff1x: avgOnOff1x,
        avg1x: Math.round(avgBtu1x),
        avg10x: Math.round(avgBtu10x),
        parcelaMedia10x: parseFloat((avgBtu10x / 10).toFixed(2)),
        cheapestModel: `${cheapest.brandLabel} ${cheapest.model}`,
        cheapestPrice1x: cheapest.total[0],
        highestPrice1x: mostExpensive.total[0],
        maxDiffPct,
      };
    }).filter(Boolean) as any[];

    // Por Categoria (Hi-Wall, Piso Teto, Cassete, Cassete 1 Via)
    const categoryCounts: Record<string, number> = {};
    allItems.forEach((i) => {
      categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
    });
    const byCategoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

    // Curva de Parcelamento 1x a 10x
    const installmentCurveData = Array.from({ length: 10 }, (_, idx) => {
      const n = idx + 1;
      const avgTotal =
        totalModels > 0 ? allItems.reduce((a, b) => a + b.total[idx], 0) / totalModels : 0;
      const avgParcela =
        totalModels > 0 ? allItems.reduce((a, b) => a + b.prestacao[idx], 0) / totalModels : 0;
      return {
        parcela: `${n}x`,
        totalMedio: Math.round(avgTotal),
        valorParcela: Math.round(avgParcela),
      };
    });

    return {
      totalModels,
      inverterCount,
      onOffCount,
      inverterSharePct: totalModels > 0 ? Math.round((inverterCount / totalModels) * 100) : 0,
      avg1x,
      avg10x,
      avgInstallment10x,
      avgFinancingSpreadPct,
      byBrandData,
      byBtuAnalysis,
      byCategoryData,
      installmentCurveData,
      techDistData: [
        { name: 'Inverter', value: inverterCount },
        { name: 'On-Off (Convencional)', value: onOffCount },
      ].filter((d) => d.value > 0),
    };
  }, [hasSubmoduleAccess, splitBrandFilter]);

  // 15. Memoized Catalog & Inventory Analytics (Catálogo de Peças & Produtos)
  const catalogAnalytics = useMemo(() => {
    const items = rawData.catalogProducts || [];
    const totalSkus = items.length;
    let totalPhysicalStock = 0;
    let totalStockValueBRL = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let healthyStockCount = 0;

    const byManufacturer: Record<string, { skus: number; stockQty: number; stockValue: number }> = {};
    const byCategory: Record<string, { skus: number; stockValue: number }> = {};
    const priceRanges: Record<string, number> = {
      'Até R$ 50': 0,
      'R$ 50 a R$ 150': 0,
      'R$ 150 a R$ 500': 0,
      'Acima de R$ 500': 0,
    };

    items.forEach((p) => {
      const stock = Number(p.stock || 0);
      const price = Number(p.price || 0);
      const itemValue = Math.max(0, stock) * price;
      const mfg = (p.manufacturer || 'OUTROS').trim().toUpperCase();
      const cat = p.category || inferCategory(p.name, p.manufacturer);

      totalPhysicalStock += Math.max(0, stock);
      totalStockValueBRL += itemValue;

      if (stock <= 0) outOfStockCount++;
      else if (stock <= 2) lowStockCount++;
      else healthyStockCount++;

      if (price <= 50) priceRanges['Até R$ 50']++;
      else if (price <= 150) priceRanges['R$ 50 a R$ 150']++;
      else if (price <= 500) priceRanges['R$ 150 a R$ 500']++;
      else priceRanges['Acima de R$ 500']++;

      if (!byManufacturer[mfg]) {
        byManufacturer[mfg] = { skus: 0, stockQty: 0, stockValue: 0 };
      }
      byManufacturer[mfg].skus += 1;
      byManufacturer[mfg].stockQty += Math.max(0, stock);
      byManufacturer[mfg].stockValue += itemValue;

      if (!byCategory[cat]) {
        byCategory[cat] = { skus: 0, stockValue: 0 };
      }
      byCategory[cat].skus += 1;
      byCategory[cat].stockValue += itemValue;
    });

    const topManufacturers = Object.entries(byManufacturer)
      .map(([name, d]) => ({
        name,
        skus: d.skus,
        valorEstoque: Math.round(d.stockValue),
        estoqueFisico: Math.round(d.stockQty),
      }))
      .sort((a, b) => b.valorEstoque - a.valorEstoque)
      .slice(0, 10);

    const byCategoryData = Object.entries(byCategory)
      .map(([name, d]) => ({
        name,
        skus: d.skus,
        valorEstoque: Math.round(d.stockValue),
      }))
      .sort((a, b) => b.skus - a.skus);

    const stockHealthData = [
      { name: 'Estoque Saudável (> 2 un)', value: healthyStockCount, color: '#10b981' },
      { name: 'Estoque Crítico (1 a 2 un)', value: lowStockCount, color: '#f59e0b' },
      { name: 'Sem Estoque / Ruptura (0)', value: outOfStockCount, color: '#ef4444' },
    ].filter((d) => d.value > 0);

    const priceRangeData = Object.entries(priceRanges).map(([name, value]) => ({ name, value }));

    const topValueItems = [...items]
      .map((p) => ({
        ...p,
        categoryName: p.category || inferCategory(p.name, p.manufacturer),
        totalValue: Math.max(0, Number(p.stock || 0)) * Number(p.price || 0),
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 15);

    const avgUnitPrice =
      totalSkus > 0 ? items.reduce((a, b) => a + Number(b.price || 0), 0) / totalSkus : 0;

    return {
      totalSkus,
      manufacturersCount: Object.keys(byManufacturer).length,
      totalPhysicalStock: Math.round(totalPhysicalStock),
      totalStockValueBRL,
      outOfStockCount,
      lowStockCount,
      healthyStockCount,
      avgUnitPrice,
      topManufacturers,
      byCategoryData,
      stockHealthData,
      priceRangeData,
      topValueItems,
    };
  }, [rawData.catalogProducts]);

  // 16. Memoized Mercado Livre & E-commerce Analytics
  const mercadoLivreAnalytics = useMemo(() => {
    const items = rawData.mercadoLivreItems || [];
    const totalAds = items.length;
    let totalStock = 0;
    let totalSales6m = 0;
    let estGrossRevenue6m = 0;
    let estNetRevenue6m = 0;
    let cheaperOrEqualCompetitor = 0;
    let moreExpensiveCompetitor = 0;
    let noCompetitorMapped = 0;

    const bySegment: Record<string, { ads: number; sales6m: number; stock: number; grossRev: number }> = {};

    const detailedAds = items.map((item: any) => {
      const stock = Number(item.estoque || 0);
      const sales6m = Number(item.vds_6m || 0);
      const cashStore = Number(item.a_vista_cp || 0);
      const netEnvios = Number(item.liq_ml_envios || 0);
      const priceMl = Number(item.pr_cp_ml || 0);
      const compBest = Number(item.pr_vende_mais || 0);
      const seg = (item.segmento_ml || item.nome_fabricante || 'Geral').trim();

      totalStock += stock;
      totalSales6m += sales6m;
      estGrossRevenue6m += sales6m * priceMl;
      estNetRevenue6m += sales6m * (netEnvios > 0 ? netEnvios : priceMl * 0.82);

      let diffVsCompetitorPct: number | null = null;
      if (priceMl > 0 && compBest > 0) {
        diffVsCompetitorPct = parseFloat((((priceMl - compBest) / compBest) * 100).toFixed(1));
        if (priceMl <= compBest) cheaperOrEqualCompetitor++;
        else moreExpensiveCompetitor++;
      } else {
        noCompetitorMapped++;
      }

      if (!bySegment[seg]) {
        bySegment[seg] = { ads: 0, sales6m: 0, stock: 0, grossRev: 0 };
      }
      bySegment[seg].ads += 1;
      bySegment[seg].sales6m += sales6m;
      bySegment[seg].stock += stock;
      bySegment[seg].grossRev += sales6m * priceMl;

      return {
        ...item,
        shortName: (item.nome || item.codigo || 'Anúncio').slice(0, 22),
        stock,
        sales6m,
        cashStore,
        netEnvios,
        priceMl,
        compBest,
        diffVsCompetitorPct,
        estRevenue: sales6m * priceMl,
      };
    });

    const bySegmentData = Object.entries(bySegment)
      .map(([name, d]) => ({
        name,
        anuncios: d.ads,
        vendas6m: d.sales6m,
        estoque: d.stock,
        receitaEstimada: Math.round(d.grossRev),
      }))
      .sort((a, b) => b.vendas6m - a.vendas6m);

    const competitivenessPie = [
      { name: 'Mais Competitivo (≤ Vende Mais)', value: cheaperOrEqualCompetitor, color: '#10b981' },
      { name: 'Acima do Concorrente (> Vende Mais)', value: moreExpensiveCompetitor, color: '#ef4444' },
      { name: 'Sem Concorrente Mapeado', value: noCompetitorMapped, color: '#94a3b8' },
    ].filter((d) => d.value > 0);

    return {
      totalAds,
      totalStock,
      totalSales6m,
      estGrossRevenue6m,
      estNetRevenue6m,
      cheaperOrEqualCompetitor,
      moreExpensiveCompetitor,
      bySegmentData,
      competitivenessPie,
      detailedAds: detailedAds.sort((a, b) => b.sales6m - a.sales6m),
    };
  }, [rawData.mercadoLivreItems]);

  // Exportador CSV Universal para a Aba Ativa
  const handleExportActiveTabCSV = useCallback(() => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    const filename = `relatorio-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;

    if (activeTab === 'fidelidade') {
      headers = ['Codigo Cliente', 'Nome Cliente', 'Ultimo Vendedor', 'Data Ultima Compra', 'Valor Ultima Compra (R$)', 'Total Comprado (R$)', 'Saldo Pontos', 'Bonus Credito (R$)', 'Proximo Vencimento'];
      rows = (rawData.loyaltyClients || []).map((c) => [
        c.codigo,
        `"${(c.nome || '').replace(/"/g, '""')}"`,
        `"${(c.ultimoVendedor || 'Sem Vendedor').replace(/"/g, '""')}"`,
        c.dataUltimaCompra || '-',
        (c.valorUltimaCompra || 0).toFixed(2),
        (c.totalComprado || 0).toFixed(2),
        c.saldoPontos,
        pointsToBRL(c.saldoPontos).toFixed(2),
        c.proximoVencimento || '-',
      ]);
    } else if (activeTab === 'tabela_split') {
      headers = ['Capacidade BTUs', 'Modelos', 'Media Inverter 1x (R$)', 'Media On-Off 1x (R$)', 'Menor Preco 1x (R$)', 'Modelo Mais Economico', 'Media 10x Total (R$)', 'Parcela Media 10x (R$)'];
      rows = splitTableAnalytics.byBtuAnalysis.map((b) => [
        b.btu,
        b.count,
        b.avgInverter1x || '-',
        b.avgOnOff1x || '-',
        b.cheapestPrice1x.toFixed(2),
        `"${b.cheapestModel}"`,
        b.avg10x.toFixed(2),
        b.parcelaMedia10x.toFixed(2),
      ]);
    } else if (activeTab === 'catalogo_pecas') {
      headers = ['Codigo', 'Produto', 'Fabricante', 'Categoria', 'Estoque', 'Preco Unitario (R$)', 'Valor em Estoque (R$)'];
      rows = (rawData.catalogProducts || []).map((p) => [
        p.code,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.manufacturer || '').replace(/"/g, '""')}"`,
        `"${inferCategory(p.name, p.manufacturer)}"`,
        p.stock,
        Number(p.price || 0).toFixed(2),
        (Math.max(0, Number(p.stock || 0)) * Number(p.price || 0)).toFixed(2),
      ]);
    } else if (activeTab === 'mercado_livre') {
      headers = ['Codigo', 'Anuncio', 'Segmento', 'Estoque', 'Vendas 6M', 'A Vista Loja (R$)', 'Liquido ML Envios (R$)', 'Preco ML (R$)', 'Concorrente Vende Mais (R$)'];
      rows = mercadoLivreAnalytics.detailedAds.map((a: any) => [
        a.codigo,
        `"${(a.nome || '').replace(/"/g, '""')}"`,
        `"${a.segmento_ml || ''}"`,
        a.stock,
        a.sales6m,
        a.cashStore.toFixed(2),
        a.netEnvios.toFixed(2),
        a.priceMl.toFixed(2),
        a.compBest.toFixed(2),
      ]);
    } else if (activeTab === 'leads') {
      headers = ['Empresa', 'Contato', 'Telefone', 'Segmento', 'Bairro', 'Status', 'Ultimo Vendedor', 'Ultima Compra (R$)', 'Pontos Fidelidade'];
      rows = filteredLeads.map((l: any) => [
        `"${(l.company || '').replace(/"/g, '""')}"`,
        `"${(l.name || '').replace(/"/g, '""')}"`,
        l.phone || '-',
        `"${l.segment || ''}"`,
        `"${l.neighborhood || ''}"`,
        l.status || 'Novo',
        `"${l.last_seller || ''}"`,
        Number(l.last_purchase_value || 0).toFixed(2),
        Number(l.loyalty_points || 0),
      ]);
    } else {
      headers = ['Mes', 'Receita Vendas (R$)', 'Meta Vendas (R$)', 'Ticket Medio (R$)', 'Tarefas Criadas', 'Tarefas Concluidas', 'Leads Captados', 'Leads Convertidos'];
      rows = monthlyConsolidatedData.map((m) => [
        m.monthName,
        m.vendasReceita.toFixed(2),
        m.vendasMeta.toFixed(2),
        m.ticketMedio,
        m.tarefasCriadas,
        m.tarefasConcluidas,
        m.leadsCaptados,
        m.leadsConvertidos,
      ]);
    }

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeTab, rawData.loyaltyClients, rawData.catalogProducts, splitTableAnalytics, mercadoLivreAnalytics, filteredLeads, monthlyConsolidatedData]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const tables = ['tasks', 'task_assignees', 'transfers', 'leads', 'deliveries', 'warranties', 'demands', 'profiles', 'sales_results'];
    const channels = tables.map(table => {
      return supabase
        .channel(`public:${table}-reports-realtime`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => {
            // Refresh all data silently when any relevant table changes
            fetchAllData(true);
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [isAuthenticated, fetchAllData]);

  if (!isAuthenticated) return <LoginForm onLogin={login} />;
  if (!canAccessReports) return <div className="p-4">Acesso negado.</div>;

  const renderChartContainer = (title: string, children: React.ReactNode) => (
    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
      <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        {title}
      </h3>
      <div className="h-64 w-full">
        {children}
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`flex items-center justify-between p-4 border-b sticky top-0 z-10 ${isDarkMode ? 'border-slate-800 bg-slate-900/80 backdrop-blur-md' : 'border-slate-100 bg-white/80 backdrop-blur-md'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Central de Inteligência & Relatórios</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Análises executivas integradas para Comercial, Fidelidade, Climatização, Catálogo, Logística e Operações
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportActiveTabCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <FileSpreadsheet size={15} />
            <span className="hidden sm:inline">Exportar Planilha (CSV)</span>
          </button>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto pb-32 p-4 space-y-6">
        {/* Date Filters */}
        <div className="flex gap-2 p-1 overflow-x-auto no-scrollbar rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {[
            { id: 'today', label: 'Hoje' },
            { id: '7days', label: '7 Dias' },
            { id: '15days', label: '15 Dias' },
            { id: '30days', label: '30 Dias' },
            { id: '3months', label: '3 Meses' },
            { id: '6months', label: '6 Meses' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setDateFilter(filter.id as any)}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                dateFilter === filter.id
                  ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Highlight Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {overallStats.map((stat, i) => (
            <div key={i} className={`p-3.5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl text-white shrink-0" style={{ backgroundColor: stat.color }}>
                  <stat.icon size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">{stat.name}</p>
                  <p className="text-lg font-black">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Categorias de Relatórios (Filtro Inteligente) */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <Layers size={14} className="text-blue-500" />
              Categorias de Análise
            </h2>
          </div>
          
          <div className="flex gap-2 p-1 overflow-x-auto no-scrollbar rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {[
              { id: 'all', label: '✨ Todos os Relatórios' },
              { id: 'core', label: '📊 Core/Gerais' },
              { id: 'sales', label: '📈 Comercial, Fidelidade & Split' },
              { id: 'operations', label: '🚚 Estoque, Catálogo & Logística' },
              { id: 'support', label: '🤝 Suporte & Demandas' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-3.5 py-2 rounded-xl text-[10px] md:text-xs font-bold tracking-tight uppercase whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-md font-extrabold'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid de Seleção de Painéis com Descrições e Ícones em Destaque */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { id: 'consolidado', label: 'Painel Consolidado', icon: Layers, category: 'core', desc: 'Cruzamento tridirecional de faturamento, leads e tarefas.', color: 'from-blue-500 to-indigo-600', visible: true },
              { id: 'fidelidade', label: 'Clientes Fidelidade & Bônus', icon: Award, category: 'sales', desc: 'Pontos ativos, bônus em R$, vencimentos e carteira por vendedor.', color: 'from-pink-500 to-rose-600', visible: canAccessLoyalty, badge: 'Novo' },
              { id: 'tabela_split', label: 'Tabela Split & BTUs', icon: Wind, category: 'sales', desc: 'Análise de preços 1x a 10x, Inverter vs On-Off e marcas de Ar.', color: 'from-sky-500 to-cyan-600', visible: canAccessSplitTable, badge: 'Novo' },
              { id: 'catalogo_pecas', label: 'Catálogo & Estoque', icon: Package, category: 'operations', desc: 'Capital em estoque, saúde de SKUs, fabricantes e categorias.', color: 'from-violet-500 to-purple-600', visible: canAccessProducts, badge: 'Novo' },
              { id: 'mercado_livre', label: 'Mercado Livre & Giro', icon: ShoppingBag, category: 'sales', desc: 'Vendas 6M, margem líquida ML Envios e preço vs Vende Mais.', color: 'from-amber-500 to-yellow-600', visible: canAccessPriceResearch, badge: 'Novo' },
              { id: 'geral', label: 'Visão Geral', icon: LayoutGrid, category: 'core', desc: 'Resumo estatístico unificado das métricas vitais da empresa.', color: 'from-indigo-500 to-purple-600', visible: true },
              { id: 'colaboradores', label: 'Ranking Equipe', icon: Users, category: 'core', desc: 'Desempenho operacional e comercial do time de colaboradores.', color: 'from-purple-500 to-pink-600', visible: true },
              { id: 'vendas', label: 'Resultados de Vendas', icon: TrendingUp, category: 'sales', desc: 'Performance contra metas de faturamento individuais e globais.', color: 'from-emerald-500 to-teal-600', visible: canAccessSales },
              { id: 'leads', label: 'Funil & Leads Importados', icon: Target, category: 'sales', desc: 'Captação, cruzamento com relatórios, bairros e conversão.', color: 'from-teal-500 to-cyan-600', visible: canAccessLeads },
              { id: 'deliveries', label: 'Entregas & SLA', icon: Truck, category: 'operations', desc: 'Análise aprofundada de remessas, rotas, SLA e bairros.', color: 'from-rose-500 to-orange-600', visible: canAccessDeliveries },
              { id: 'tarefas', label: 'Gestão de Tarefas', icon: ClipboardList, category: 'operations', desc: 'Taxa de conclusão, tempo de resposta e prioridades.', color: 'from-amber-500 to-orange-600', visible: canAccessTasks },
              { id: 'transfers', label: 'Transferências', icon: ArrowRightLeft, category: 'operations', desc: 'Logística de distribuição de cargas e status de envio.', color: 'from-sky-500 to-blue-600', visible: canAccessTransfers },
              { id: 'precos', label: 'Pesquisa Concorrência', icon: Tag, category: 'sales', desc: 'Análise comparativa de preços de mercado entre lojas.', color: 'from-amber-500 to-orange-600', visible: canAccessPriceResearch },
              { id: 'social', label: 'Redes Sociais', icon: Share2, category: 'sales', desc: 'Acompanhamento de postagens, reels e SLA de marketing.', color: 'from-fuchsia-500 to-pink-600', visible: canAccessSocialMedia },
              { id: 'warranties', label: 'Garantias', icon: ShieldCheck, category: 'support', desc: 'Controle de sinistros, trocas de peças e produtos afetados.', color: 'from-violet-500 to-indigo-600', visible: canAccessWarranties },
              { id: 'demands', label: 'Demandas Internas', icon: Bell, category: 'support', desc: 'Chamados, requisições internas de suprimentos e status.', color: 'from-cyan-500 to-blue-600', visible: canAccessDemands },
            ]
              .filter(tab => tab.visible !== false && (selectedCategory === 'all' || tab.category === selectedCategory))
              .map((tab: any) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex flex-col items-start p-3 md:p-4 rounded-3xl border text-left transition-all relative overflow-hidden group cursor-pointer h-28 md:h-32 justify-between ${
                      isActive
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
                    }`}
                  >
                    {/* Subtle decorative absolute background gradient and icon for depth */}
                    <div className={`absolute right-0 bottom-0 w-16 h-16 bg-gradient-to-br ${tab.color} opacity-0 group-hover:opacity-10 dark:group-hover:opacity-15 transition-opacity duration-300 rounded-tl-full`} />
                    <tab.icon className={`absolute right-2 -bottom-2 size-12 opacity-[0.05] transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white opacity-[0.12]' : 'text-slate-400'}`} />
                    
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive 
                          ? 'bg-white/15 border border-white/20 text-white shadow-inner' 
                          : 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-100/30 dark:border-slate-700/50'
                      }`}>
                        <tab.icon size={16} />
                      </div>
                      <div className="flex items-center gap-1">
                        {tab.badge && (
                          <span className={`text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded-md ${
                            isActive ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {tab.badge}
                          </span>
                        )}
                        <span className={`text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded-md ${
                          isActive ? 'bg-white/10 text-white/90' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          {tab.category === 'core' ? 'Core' : tab.category === 'operations' ? 'Logística' : tab.category === 'sales' ? 'Comercial' : 'Suporte'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col w-full">
                      <span className="text-xs md:text-sm font-black tracking-tight leading-tight line-clamp-1">
                        {tab.label}
                      </span>
                      <span className={`text-[9px] md:text-[10px] mt-0.5 font-medium leading-tight line-clamp-2 ${
                        isActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {tab.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Activity className="animate-spin mb-4" size={32} />
            <p className="text-sm font-medium">Processando dados...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {activeTab === 'consolidado' && (
                <div className="space-y-6">
                  {/* Top Action Header */}
                  <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border-blue-100 shadow-sm'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                          <Layers3 size={20} />
                        </div>
                        <h2 className="text-lg font-extrabold tracking-tight">
                          Painel Consolidado Mensal (Vendas, Tarefas & Leads)
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Análise de correlação direta e desempenho cruzado mês a mês entre faturamento, engajamento com clientes e execução da equipe.
                      </p>
                    </div>

                    <button
                      onClick={() => exportConsolidatedReportToPDF(monthlyConsolidatedData, consolidatedTotals)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      <Download size={16} />
                      <span>Exportar PDF Consolidado</span>
                    </button>
                  </div>

                  {/* Summary KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Receita Vendas</p>
                      <p className="text-2xl font-black text-emerald-600">
                        R$ {(consolidatedTotals.totalReceita || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Meta Acumulada: R$ {(consolidatedTotals.totalMetas || 0).toLocaleString('pt-BR')}
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tarefas Concluídas</p>
                      <p className="text-2xl font-black text-blue-600">
                        {consolidatedTotals.totalTarefasConcluidas || 0} / {consolidatedTotals.totalTarefasCriadas || 0}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Efetividade Operacional: {consolidatedTotals.avgTaskCompletionRate || 0}%
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Leads Convertidos</p>
                      <p className="text-2xl font-black text-amber-500">
                        {consolidatedTotals.totalLeadsConvertidos || 0} / {consolidatedTotals.totalLeadsCaptados || 0}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Taxa de Conversão: {consolidatedTotals.avgLeadConversionRate || 0}%
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ticket Médio Global</p>
                      <p className="text-2xl font-black text-indigo-600">
                        R$ {(consolidatedTotals.avgTicket || 0).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Média por venda fechada
                      </p>
                    </div>
                  </div>

                  {/* Main Composed Chart (Vendas R$ vs Tarefas & Leads) */}
                  {renderChartContainer("Evolução Trimodular Consolidada (Vendas R$, Leads e Tarefas)", (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={monthlyConsolidatedData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                        <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                        <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#3b82f6' }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#10b981' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                            borderRadius: '16px',
                            border: 'none',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)'
                          }}
                          formatter={(value: any, name: any) => {
                            if (name === 'vendasReceita') return [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita Vendas'];
                            if (name === 'tarefasConcluidas') return [`${value} tarefas`, 'Tarefas Concluídas'];
                            if (name === 'leadsConvertidos') return [`${value} leads`, 'Leads Convertidos'];
                            return [value, name];
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '10px', fontWeight: 'bold' }} />
                        <Bar yAxisId="left" name="vendasReceita" dataKey="vendasReceita" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={28} />
                        <Line yAxisId="right" type="monotone" name="tarefasConcluidas" dataKey="tarefasConcluidas" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                        <Line yAxisId="right" type="monotone" name="leadsConvertidos" dataKey="leadsConvertidos" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ))}

                  {/* 2x2 Grid Específico */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vendas vs Metas */}
                    {renderChartContainer("Vendas (R$) vs Metas Mensais", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyConsolidatedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }}
                            formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, 'Valor']}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar name="Receita Real (R$)" dataKey="vendasReceita" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar name="Meta (R$)" dataKey="vendasMeta" fill="#64748b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}

                    {/* Leads Captados vs Convertidos */}
                    {renderChartContainer("Funil de Leads Mensal (Captados vs Convertidos)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyConsolidatedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar name="Leads Captados" dataKey="leadsCaptados" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          <Bar name="Leads Convertidos" dataKey="leadsConvertidos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tarefas Criadas vs Concluídas */}
                    {renderChartContainer("Volume de Tarefas (Criadas vs Concluídas)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyConsolidatedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar name="Tarefas Criadas" dataKey="tarefasCriadas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar name="Tarefas Concluídas" dataKey="tarefasConcluidas" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}

                    {/* Rates de Eficiência Comparativos */}
                    {renderChartContainer("Indicadores de Eficiência (%) por Mês", (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyConsolidatedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} unit="%" tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }}
                            formatter={(val: any) => [`${val}%`, 'Taxa']}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Line type="monotone" name="Taxa Conversão Leads (%)" dataKey="taxaConversaoLeads" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                          <Line type="monotone" name="Taxa Conclusão Tarefas (%)" dataKey="taxaConclusaoTarefas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  {/* Detailed Consolidated Table */}
                  <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        Tabela Consolidada Mensal de Vendas, Tarefas e Leads
                      </h3>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-1 rounded-full">
                        Visão Anual Integrada
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Mês</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Receita (R$)</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Meta (R$)</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ticket Médio</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Tarefas (C/F)</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Efetividade</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Leads (C/V)</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Conversão</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyConsolidatedData.map((row, idx) => (
                            <tr key={idx} className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                              <td className="p-4 text-sm font-black text-blue-600">{row.monthName}</td>
                              <td className="p-4 text-sm text-right font-black text-emerald-600">
                                R$ {row.vendasReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-4 text-sm text-right font-medium text-slate-500">
                                R$ {row.vendasMeta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-4 text-sm text-right font-bold text-indigo-600">
                                R$ {row.ticketMedio.toLocaleString('pt-BR')}
                              </td>
                              <td className="p-4 text-sm text-center font-bold">
                                {row.tarefasCriadas} / {row.tarefasConcluidas}
                              </td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                  row.taxaConclusaoTarefas >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {row.taxaConclusaoTarefas}%
                                </span>
                              </td>
                              <td className="p-4 text-sm text-center font-bold">
                                {row.leadsCaptados} / {row.leadsConvertidos}
                              </td>
                              <td className="p-4 text-center">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                  row.taxaConversaoLeads >= 20 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {row.taxaConversaoLeads}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* RELATÓRIO 1: CLIENTES FIDELIDADE, BÔNUS & CARTEIRA POR VENDEDOR */}
              {activeTab === 'fidelidade' && (
                <div className="space-y-6">
                  {/* Top Header & Seller Filter */}
                  <div className={`p-6 rounded-3xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gradient-to-r from-pink-50/80 via-rose-50/40 to-amber-50/40 border-pink-100 shadow-sm'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-pink-600 text-white shadow-md shadow-pink-500/20">
                          <Award size={20} />
                        </div>
                        <h2 className="text-lg font-extrabold tracking-tight">
                          Inteligência de Fidelidade, Bônus & Carteira por Vendedor
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Regra oficial ativa: R$ {LOYALTY_CONFIG.valorProdutoPorPonto.toFixed(2)} em produtos = 1 ponto | {LOYALTY_CONFIG.pontosParaUmReal.toFixed(2)} pontos = R$ 1,00 em créditos (R$ {LOYALTY_CONFIG.valorPorPontoBRL.toFixed(2)}/pt) | Validade {LOYALTY_CONFIG.validadeMeses} meses.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <UserCheck size={14} className="text-pink-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Vendedor:</span>
                        <select
                          value={loyaltySellerFilter}
                          onChange={(e) => setLoyaltySellerFilter(e.target.value)}
                          className="text-xs font-bold bg-transparent outline-none cursor-pointer"
                        >
                          <option value="all">Todos os Vendedores ({rawData.loyaltyClients?.length || 0})</option>
                          {loyaltyAnalytics.availableSellers.map((seller) => (
                            <option key={seller} value={seller}>
                              {seller}
                            </option>
                          ))}
                          <option value="sem_vendedor">Sem Vendedor Vinculado</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 6 KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Clientes c/ Saldo</p>
                      <p className="text-2xl font-black text-blue-600">
                        {loyaltyAnalytics.stats.clientsWithBalance.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        de {loyaltyAnalytics.stats.totalClients.toLocaleString('pt-BR')} clientes na base
                      </p>
                    </div>

                    <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Bônus Disponível</p>
                      <p className="text-2xl font-black text-emerald-600">
                        {formatBRL(loyaltyAnalytics.stats.totalBonusBRL)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        {Math.round(loyaltyAnalytics.stats.totalPointsActive).toLocaleString('pt-BR')} pontos ativos
                      </p>
                    </div>

                    <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Risco Vencimento</p>
                      <p className="text-2xl font-black text-amber-500">
                        {formatBRL(loyaltyAnalytics.totalExpiringBRL)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        {loyaltyAnalytics.stats.clientsWithExpiringPoints} clientes c/ pontos a vencer
                      </p>
                    </div>

                    <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Créditos Resgatados</p>
                      <p className="text-2xl font-black text-purple-600">
                        {formatBRL(loyaltyAnalytics.stats.totalConvertedBRL)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Aproveitamento: {loyaltyAnalytics.redemptionRate}%
                      </p>
                    </div>

                    <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Últimas Compras</p>
                      <p className="text-2xl font-black text-indigo-600">
                        {formatBRL(loyaltyAnalytics.stats.totalLastPurchaseBRL)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        {loyaltyAnalytics.stats.clientsWithSellerMatch} clientes c/ vendedor
                      </p>
                    </div>

                    <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Compras Acumuladas</p>
                      <p className="text-2xl font-black text-pink-600">
                        {formatBRL(loyaltyAnalytics.stats.totalPurchasedBRL)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Histórico cruzado ERP
                      </p>
                    </div>
                  </div>

                  {/* 1ª Linha de Gráficos: Carteira por Vendedor & Segmentação VIP */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {renderChartContainer("Desempenho da Carteira por Vendedor (Última Compra R$ vs Clientes)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={loyaltyAnalytics.sellerRanking.filter(s => s.nome !== 'Sem Vendedor Vinculado')} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold' }} />
                          <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#10b981' }} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#ec4899' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '14px', border: 'none' }}
                            formatter={(val: any, name: any) => {
                              if (name === 'somaUltimaCompraRounded') return [formatBRL(Number(val)), 'Soma Últimas Compras'];
                              if (name === 'bonusDisponivelRounded') return [formatBRL(Number(val)), 'Bônus Disponível'];
                              return [`${val} clientes`, 'Clientes Atendidos'];
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar yAxisId="left" name="somaUltimaCompraRounded" dataKey="somaUltimaCompraRounded" fill="#10b981" radius={[6, 6, 0, 0]} />
                          <Line yAxisId="right" type="monotone" name="clientesCount" dataKey="clientesCount" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ))}

                    {renderChartContainer("Segmentação da Carteira por Faixa de Pontos (Tiers VIP)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={loyaltyAnalytics.tierChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            label={({ name, value }) => `${value}`}
                          >
                            {loyaltyAnalytics.tierChartData.map((_, index) => (
                              <Cell key={`tier-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  {/* 2ª Linha de Gráficos: Ciclo de Vida dos Pontos & Cronograma de Vencimentos */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {renderChartContainer("Balanço Financeiro de Bônus (R$ Equivalente por Status)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={loyaltyAnalytics.pointsLifecycleData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '14px', border: 'none' }}
                            formatter={(val: any, name: any) =>
                              name === 'reais' ? [formatBRL(Number(val)), 'Equivalente (R$)'] : [`${Number(val).toLocaleString('pt-BR')} pts`, 'Pontos']
                            }
                          />
                          <Bar dataKey="reais" name="reais" radius={[6, 6, 0, 0]} barSize={36}>
                            {loyaltyAnalytics.pointsLifecycleData.map((_, idx) => (
                              <Cell key={idx} fill={['#10b981', '#8b5cf6', '#f59e0b', '#ef4444'][idx % 4]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ))}

                    {renderChartContainer("Cronograma de Vencimento de Créditos por Mês (R$ a Vencer)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={loyaltyAnalytics.expirationTimelineData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '14px', border: 'none' }}
                            formatter={(val: any, name: any) =>
                              name === 'reais' ? [formatBRL(Number(val)), 'Bônus a Vencer'] : [`${val} clientes`, 'Clientes']
                            }
                          />
                          <Bar dataKey="reais" name="reais" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  {/* Tabela 1: Consolidado por Vendedor */}
                  <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Relatório Cruzado: Carteira de Fidelidade & Faturamento por Vendedor
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Cruzamento oficial do código do cliente com o último vendedor que realizou atendimento e saldo de bônus disponível para recompra.
                        </p>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400">
                        {loyaltyAnalytics.sellerRanking.length} carteiras
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendedor</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Clientes (Últ. Atendimento)</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Com Bônus Ativo</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Soma Últimas Compras</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ticket Médio (Últ. Compra)</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total Histórico Comprado</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Saldo Pontos Carteira</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Bônus p/ Recompra (R$)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loyaltyAnalytics.sellerRanking.map((row, idx) => (
                            <tr key={idx} className={`border-t ${isDarkMode ? 'border-slate-800 hover:bg-slate-800/30' : 'border-slate-50 hover:bg-slate-50/70'}`}>
                              <td className="p-4 text-sm font-bold flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-pink-500/10 text-pink-600 dark:text-pink-400">
                                  {row.codigo}
                                </span>
                                <span>{row.nome}</span>
                              </td>
                              <td className="p-4 text-sm text-center font-black">{row.clientesCount}</td>
                              <td className="p-4 text-sm text-center font-bold text-blue-600">{row.clientesComBonus}</td>
                              <td className="p-4 text-sm text-right font-black text-emerald-600">{formatBRL(row.somaUltimaCompraBRL)}</td>
                              <td className="p-4 text-sm text-right font-medium text-slate-500">{formatBRL(row.ticketMedioUltima)}</td>
                              <td className="p-4 text-sm text-right font-bold text-indigo-600">{formatBRL(row.totalHistoricoBRL)}</td>
                              <td className="p-4 text-sm text-right font-bold">{Math.round(row.pontosAtivos).toLocaleString('pt-BR')} pts</td>
                              <td className="p-4 text-sm text-right font-black text-amber-600">{formatBRL(row.bonusDisponivelBRL)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tabela 2: Top 20 Oportunidades de Recompra Ativa */}
                  <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Top 20 Clientes VIP para Ação Comercial Imediata (Maior Bônus em Créditos)
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Clientes com maior potencial de abatimento em novas compras de peças e ar condicionado.
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Código / Cliente</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Último Vendedor</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Última Compra</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Valor Últ. Compra</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total Comprado</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Saldo Pontos</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Crédito (R$)</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Próx. Vencimento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loyaltyAnalytics.topOpportunities.map((c) => (
                            <tr key={c.id} className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                              <td className="p-4 text-xs font-bold">
                                <span className="text-slate-400 mr-1.5">#{c.codigo}</span>
                                {c.nome}
                              </td>
                              <td className="p-4 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                {c.ultimoVendedor || 'Não vinculado'}
                              </td>
                              <td className="p-4 text-xs text-center text-slate-500">
                                {c.dataUltimaCompra || c.ultimaTransacao || '-'}
                              </td>
                              <td className="p-4 text-xs text-right font-bold text-emerald-600">
                                {c.valorUltimaCompra ? formatBRL(c.valorUltimaCompra) : '-'}
                              </td>
                              <td className="p-4 text-xs text-right font-medium">
                                {c.totalComprado ? formatBRL(c.totalComprado) : '-'}
                              </td>
                              <td className="p-4 text-xs text-right font-black text-blue-600">
                                {c.saldoPontos.toLocaleString('pt-BR')} pts
                              </td>
                              <td className="p-4 text-xs text-right font-black text-emerald-600">
                                {formatBRL(pointsToBRL(c.saldoPontos))}
                              </td>
                              <td className="p-4 text-xs text-center">
                                {c.proximoVencimento ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                                    {c.proximoVencimento}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* RELATÓRIO 2: TABELA DE PREÇOS DE SPLIT & CLIMATIZAÇÃO */}
              {activeTab === 'tabela_split' && (
                <div className="space-y-6">
                  {/* Top Header & Brand Filter */}
                  <div className={`p-6 rounded-3xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gradient-to-r from-sky-50/80 via-cyan-50/40 to-blue-50/40 border-sky-100 shadow-sm'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-sky-600 text-white shadow-md shadow-sky-500/20">
                          <Wind size={20} />
                        </div>
                        <h2 className="text-lg font-extrabold tracking-tight">
                          Análise de Preços de Split, Capacidades (BTUs) & Parcelamento (1x a 10x)
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Comparativo comercial entre fabricantes (Agratto, Gree, Elgin), tecnologias (Inverter vs On-Off) e faixas de 9.000 a 60.000 BTUs.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {[
                        { id: 'all', label: 'Todas as Marcas' },
                        { id: 'agratto', label: 'Agratto' },
                        { id: 'gree', label: 'Gree' },
                        { id: 'elgin', label: 'Elgin' },
                      ].map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setSplitBrandFilter(b.id as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            splitBrandFilter === b.id
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4 KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Modelos Analisados</p>
                      <p className="text-2xl font-black text-sky-600">{splitTableAnalytics.totalModels}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        {splitTableAnalytics.inverterCount} Inverter ({splitTableAnalytics.inverterSharePct}%) | {splitTableAnalytics.onOffCount} On-Off
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ticket Médio 1x (À Vista)</p>
                      <p className="text-2xl font-black text-emerald-600">{formatBRL(splitTableAnalytics.avg1x)}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Média geral de tabela em 1x
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ticket Médio 10x Parcelado</p>
                      <p className="text-2xl font-black text-blue-600">{formatBRL(splitTableAnalytics.avg10x)}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Parcela média 10x de {formatBRL(splitTableAnalytics.avgInstallment10x)}
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Variação 1x → 10x</p>
                      <p className="text-2xl font-black text-amber-500">+{splitTableAnalytics.avgFinancingSpreadPct}%</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Acréscimo médio de parcelamento máximo
                      </p>
                    </div>
                  </div>

                  {/* 1ª Linha: Preço Médio por Fabricante & Preço por BTU (Inverter vs On-Off) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {renderChartContainer("Comparativo de Preço Médio por Fabricante (1x vs 10x Total)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={splitTableAnalytics.byBrandData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '14px', border: 'none' }}
                            formatter={(val: any) => [formatBRL(Number(val)), 'Preço Médio']}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar name="Média 1x (R$)" dataKey="media1x" fill="#10b981" radius={[6, 6, 0, 0]} />
                          <Bar name="Média 10x Total (R$)" dataKey="media10x" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}

                    {renderChartContainer("Preço Médio 1x por Capacidade (BTUs) — Inverter vs On-Off", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={splitTableAnalytics.byBtuAnalysis} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="btuLabel" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '14px', border: 'none' }}
                            formatter={(val: any) => (val ? [formatBRL(Number(val)), 'Média 1x'] : ['Não aplicável', ''])}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar name="Inverter (1x)" dataKey="avgInverter1x" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                          <Bar name="On-Off (1x)" dataKey="avgOnOff1x" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  {/* 2ª Linha: Curva de Parcelamento 1x a 10x & Mix por Categoria */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {renderChartContainer("Curva de Parcelamento (1x a 10x): Valor Total Médio vs Valor da Parcela", (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={splitTableAnalytics.installmentCurveData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="parcela" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#3b82f6' }} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#10b981' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '14px', border: 'none' }}
                            formatter={(val: any, name: any) => [
                              formatBRL(Number(val)),
                              name === 'totalMedio' ? 'Total Financiado' : 'Valor da Parcela',
                            ]}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar yAxisId="left" name="totalMedio" dataKey="totalMedio" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
                          <Line yAxisId="right" type="monotone" name="valorParcela" dataKey="valorParcela" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ))}

                    {renderChartContainer("Distribuição do Catálogo Split por Linha (Hi-Wall, Piso Teto, Cassete)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={splitTableAnalytics.byCategoryData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {splitTableAnalytics.byCategoryData.map((_, idx) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  {/* Tabela Analítica por Faixa de Capacidade BTU */}
                  <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Matriz Analítica por Capacidade (BTUs) — Competitividade & Melhores Opções
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Resumo estratégico por faixa de BTUs indicando o modelo de entrada mais competitivo e o ticket médio de parcelamento.
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Capacidade</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qtd. Modelos</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Modelo Mais Econômico (1x)</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Menor Preço 1x</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Média Inverter 1x</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Média On-Off 1x</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Média Total 10x</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Parcela Média 10x</th>
                          </tr>
                        </thead>
                        <tbody>
                          {splitTableAnalytics.byBtuAnalysis.map((row) => (
                            <tr key={row.btu} className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                              <td className="p-4 text-sm font-black text-sky-600">{row.btu.toLocaleString('pt-BR')} BTUs</td>
                              <td className="p-4 text-sm text-center font-bold">{row.count}</td>
                              <td className="p-4 text-xs font-bold">{row.cheapestModel}</td>
                              <td className="p-4 text-sm text-right font-black text-emerald-600">{formatBRL(row.cheapestPrice1x)}</td>
                              <td className="p-4 text-sm text-right font-medium text-blue-600">
                                {row.avgInverter1x ? formatBRL(row.avgInverter1x) : '-'}
                              </td>
                              <td className="p-4 text-sm text-right font-medium text-amber-600">
                                {row.avgOnOff1x ? formatBRL(row.avgOnOff1x) : '-'}
                              </td>
                              <td className="p-4 text-sm text-right font-bold">{formatBRL(row.avg10x)}</td>
                              <td className="p-4 text-sm text-right font-black text-indigo-600">10x {formatBRL(row.parcelaMedia10x)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* RELATÓRIO 3: CATÁLOGO DE PEÇAS, PRODUTOS & SAÚDE DE ESTOQUE */}
              {activeTab === 'catalogo_pecas' && (
                <div className="space-y-6">
                  <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gradient-to-r from-violet-50/80 to-purple-50/50 border-violet-100 shadow-sm'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
                          <Package size={20} />
                        </div>
                        <h2 className="text-lg font-extrabold tracking-tight">
                          Análise de Catálogo de Peças, Capital em Estoque & Cobertura por Fabricante
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Visão financeira e física do inventário de peças, equipamentos comerciais, ferramentas e insumos de refrigeração.
                      </p>
                    </div>
                  </div>

                  {/* 4 KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total de SKUs</p>
                      <p className="text-2xl font-black text-violet-600">{catalogAnalytics.totalSkus.toLocaleString('pt-BR')}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Distribuídos em {catalogAnalytics.manufacturersCount} fabricantes
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Valor em Estoque</p>
                      <p className="text-2xl font-black text-emerald-600">{formatBRL(catalogAnalytics.totalStockValueBRL)}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        {catalogAnalytics.totalPhysicalStock.toLocaleString('pt-BR')} un./m em estoque físico
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Preço Médio Unitário</p>
                      <p className="text-2xl font-black text-blue-600">{formatBRL(catalogAnalytics.avgUnitPrice)}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Média aritmética do catálogo
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Estoque Crítico / Ruptura</p>
                      <p className="text-2xl font-black text-amber-500">
                        {catalogAnalytics.lowStockCount + catalogAnalytics.outOfStockCount} SKUs
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        {catalogAnalytics.outOfStockCount} zerados | {catalogAnalytics.lowStockCount} com ≤ 2 un.
                      </p>
                    </div>
                  </div>

                  {/* 1ª Linha: Top 10 Fabricantes por Capital em Estoque & Categorias */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {renderChartContainer("Top 10 Fabricantes por Valor Financeiro em Estoque (R$)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={catalogAnalytics.topManufacturers} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8b5cf6' }} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#10b981' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '14px', border: 'none' }}
                            formatter={(val: any, name: any) =>
                              name === 'valorEstoque' ? [formatBRL(Number(val)), 'Valor em Estoque'] : [`${val} SKUs`, 'Qtd. Itens']
                            }
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar yAxisId="left" name="valorEstoque" dataKey="valorEstoque" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                          <Line yAxisId="right" type="monotone" name="skus" dataKey="skus" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ))}

                    {renderChartContainer("Distribuição de SKUs por Categoria Técnica", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={catalogAnalytics.byCategoryData.slice(0, 8)} layout="vertical" margin={{ left: 25, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={125} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '14px', border: 'none' }}
                            formatter={(val: any) => [`${val} SKUs`, 'Itens']}
                          />
                          <Bar dataKey="skus" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={16}>
                            {catalogAnalytics.byCategoryData.slice(0, 8).map((_, idx) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  {/* 2ª Linha: Saúde de Estoque & Faixas de Preço */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {renderChartContainer("Saúde de Cobertura do Estoque (Disponibilidade)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={catalogAnalytics.stockHealthData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            label={({ value }) => `${value}`}
                          >
                            {catalogAnalytics.stockHealthData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ))}

                    {renderChartContainer("Distribuição do Catálogo por Faixa de Preço Unitário", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={catalogAnalytics.priceRangeData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip />
                          <Bar dataKey="value" name="Quantidade de SKUs" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  {/* Tabela Top 15 Produtos por Capital Imobilizado */}
                  <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                      <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Top 15 Itens por Capital Imobilizado em Estoque (Curva A Financeira)
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Código</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Descrição do Produto</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Fabricante</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Categoria</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Estoque</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Preço Unit.</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total em Estoque</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catalogAnalytics.topValueItems.map((item) => (
                            <tr key={item.id} className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                              <td className="p-4 text-xs font-black text-violet-600">#{item.code}</td>
                              <td className="p-4 text-xs font-bold">{item.name}</td>
                              <td className="p-4 text-xs font-semibold text-slate-500">{item.manufacturer}</td>
                              <td className="p-4 text-xs text-slate-500">{item.categoryName}</td>
                              <td className="p-4 text-xs text-right font-bold">{Number(item.stock).toLocaleString('pt-BR')}</td>
                              <td className="p-4 text-xs text-right font-medium">{formatBRL(item.price)}</td>
                              <td className="p-4 text-xs text-right font-black text-emerald-600">{formatBRL(item.totalValue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* RELATÓRIO 4: MERCADO LIVRE, GIRO 6 MESES & COMPETITIVIDADE */}
              {activeTab === 'mercado_livre' && (
                <div className="space-y-6">
                  <div className={`p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gradient-to-r from-amber-50/80 to-yellow-50/50 border-amber-100 shadow-sm'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                          <ShoppingBag size={20} />
                        </div>
                        <h2 className="text-lg font-extrabold tracking-tight">
                          Inteligência de Mercado Livre — Giro 6 Meses, Repasse Líquido &amp; &ldquo;Vende Mais&rdquo;
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Comparativo entre Preço À Vista Loja, Líquido ML Envios, Preço ML e Preço do Concorrente de Maior Giro (&ldquo;Vende Mais&rdquo;).
                      </p>
                    </div>
                  </div>

                  {/* 4 KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Anúncios Monitorados</p>
                      <p className="text-2xl font-black text-amber-500">{mercadoLivreAnalytics.totalAds}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        {mercadoLivreAnalytics.totalStock} un. em estoque vinculado
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Giro Acumulado (6M)</p>
                      <p className="text-2xl font-black text-blue-600">{mercadoLivreAnalytics.totalSales6m} vendas</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Volume vendido nos últimos 6 meses
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Receita Bruta Estimada (6M)</p>
                      <p className="text-2xl font-black text-emerald-600">{formatBRL(mercadoLivreAnalytics.estGrossRevenue6m)}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Líquido Envios: {formatBRL(mercadoLivreAnalytics.estNetRevenue6m)}
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Competitividade ML</p>
                      <p className="text-2xl font-black text-indigo-600">
                        {mercadoLivreAnalytics.cheaperOrEqualCompetitor} / {mercadoLivreAnalytics.totalAds}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Anúncios c/ preço ≤ Concorrente Vende Mais
                      </p>
                    </div>
                  </div>

                  {/* Gráficos Mercado Livre */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {renderChartContainer("Comparativo de Preços por Anúncio (À Vista Loja vs Preço ML vs Vende Mais)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mercadoLivreAnalytics.detailedAds.slice(0, 10)} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="codigo" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '14px', border: 'none' }}
                            formatter={(val: any) => [formatBRL(Number(val)), 'Valor']}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar name="À Vista Loja" dataKey="cashStore" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar name="Preço ML" dataKey="priceMl" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar name="Concorrente Vende Mais" dataKey="compBest" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}

                    {renderChartContainer("Vendas (6M) e Estoque por Segmento / Fabricante", (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={mercadoLivreAnalytics.bySegmentData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '14px', border: 'none' }} />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar name="Vendas 6 Meses" dataKey="vendas6m" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                          <Bar name="Estoque Atual" dataKey="estoque" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  {/* Tabela Analítica de Anúncios ML */}
                  <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                      <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Matriz de Rentabilidade & Posicionamento de Anúncios no Mercado Livre
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cód. / Produto</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Segmento</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Estoque</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Vendas 6M</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">À Vista Loja</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Líq. ML Envios</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Nosso Preço ML</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Vende Mais (Conc.)</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Diferença</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mercadoLivreAnalytics.detailedAds.map((ad: any, idx: number) => (
                            <tr key={ad.id || idx} className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                              <td className="p-4 text-xs font-bold">
                                <span className="text-amber-500 mr-1.5">#{ad.codigo}</span>
                                {ad.nome}
                              </td>
                              <td className="p-4 text-xs font-semibold text-slate-500">{ad.segmento_ml || '-'}</td>
                              <td className="p-4 text-xs text-center font-bold">{ad.stock}</td>
                              <td className="p-4 text-xs text-center font-black text-blue-600">{ad.sales6m}</td>
                              <td className="p-4 text-xs text-right font-medium">{formatBRL(ad.cashStore)}</td>
                              <td className="p-4 text-xs text-right font-bold text-emerald-600">{formatBRL(ad.netEnvios)}</td>
                              <td className="p-4 text-xs text-right font-black text-blue-600">{formatBRL(ad.priceMl)}</td>
                              <td className="p-4 text-xs text-right font-bold text-amber-600">
                                {ad.compBest > 0 ? formatBRL(ad.compBest) : '-'}
                              </td>
                              <td className="p-4 text-xs text-center">
                                {ad.diffVsCompetitorPct !== null ? (
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                    ad.diffVsCompetitorPct <= 0
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  }`}>
                                    {ad.diffVsCompetitorPct > 0 ? '+' : ''}{ad.diffVsCompetitorPct}%
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'geral' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Distribuição de Atividades Geral", (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={overallStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                          >
                            {overallStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    ))}
                    {renderChartContainer("Engajamento da Equipe (Atividades)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teamRanking.slice(0, 5)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip />
                          <Bar dataKey="activities" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {renderChartContainer("Leads Convertidos (%)", (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="relative size-32">
                          <svg className="size-full -rotate-90">
                            <circle
                              cx="64"
                              cy="64"
                              r="58"
                              stroke="currentColor"
                              strokeWidth="12"
                              fill="transparent"
                              className="text-slate-100 dark:text-slate-800"
                            />
                            <circle
                              cx="64"
                              cy="64"
                              r="58"
                              stroke="currentColor"
                              strokeWidth="12"
                              fill="transparent"
                              strokeDasharray={364.4}
                              strokeDashoffset={364.4 - (364.4 * (leadsData.statusDist?.find((s:any) => s.name === 'Convertido')?.value || 0) / (leadsData.overTime?.reduce((acc:any, curr:any) => acc + curr.value, 0) || 1))}
                              className="text-emerald-500"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-2xl font-black">
                              {Math.round(((leadsData.statusDist?.find((s:any) => s.name === 'Convertido')?.value || 0) / (leadsData.overTime?.reduce((acc:any, curr:any) => acc + curr.value, 0) || 1)) * 100)}%
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-500">Taxa</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {renderChartContainer("Tarefas Concluídas (%)", (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="relative size-32">
                          <svg className="size-full -rotate-90">
                            <circle
                              cx="64"
                              cy="64"
                              r="58"
                              stroke="currentColor"
                              strokeWidth="12"
                              fill="transparent"
                              className="text-slate-100 dark:text-slate-800"
                            />
                            <circle
                              cx="64"
                              cy="64"
                              r="58"
                              stroke="currentColor"
                              strokeWidth="12"
                              fill="transparent"
                              strokeDasharray={364.4}
                              strokeDashoffset={364.4 - (364.4 * (tasksData.statusDist?.find((s:any) => s.name === 'Concluída')?.value || 0) / (tasksData.totalByCollab?.reduce((acc:any, curr:any) => acc + curr.value, 0) || 1))}
                              className="text-blue-500"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-2xl font-black">
                              {Math.round(((tasksData.statusDist?.find((s:any) => s.name === 'Concluída')?.value || 0) / (tasksData.totalByCollab?.reduce((acc:any, curr:any) => acc + curr.value, 0) || 1)) * 100)}%
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-500">Conclusão</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {renderChartContainer("SLA de Vendas Mensal", (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="relative size-32">
                          <svg className="size-full -rotate-90">
                            <circle
                              cx="64"
                              cy="64"
                              r="58"
                              stroke="currentColor"
                              strokeWidth="12"
                              fill="transparent"
                              className="text-slate-100 dark:text-slate-800"
                            />
                            <circle
                              cx="64"
                              cy="64"
                              r="58"
                              stroke="currentColor"
                              strokeWidth="12"
                              fill="transparent"
                              strokeDasharray={364.4}
                              strokeDashoffset={364.4 - (364.4 * (dynamicSalesTotals.res2026 / (dynamicSalesTotals.meta2026 || 1)))}
                              className="text-amber-500"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-2xl font-black">
                              {Math.round((dynamicSalesTotals.res2026 / (dynamicSalesTotals.meta2026 || 1)) * 100)}%
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-500">Meta</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* New Social Media Section in General */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Engajamento Redes Sociais (%)", (
                      <div className="flex flex-col items-center justify-center h-full">
                         <div className="flex gap-8">
                            <div className="text-center">
                              <p className="text-3xl font-black text-pink-500">8.4k</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Alcance</p>
                            </div>
                            <div className="text-center">
                              <p className="text-3xl font-black text-blue-500">1.2k</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Cliques</p>
                            </div>
                            <div className="text-center">
                              <p className="text-3xl font-black text-emerald-500">4.2%</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Taxa</p>
                            </div>
                         </div>
                      </div>
                    ))}
                    {renderChartContainer("Taxa de Conversão por Lead", (
                      <div className="flex flex-col items-center justify-center h-full">
                        <p className="text-5xl font-black text-indigo-600">
                          {Math.round(((leadsData.statusDist?.find((s:any) => s.name === 'Convertido')?.value || 0) / (leadsData.overTime?.reduce((acc:any, curr:any) => acc + curr.value, 0) || 1)) * 100)}%
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 text-center">Leads Transformados em Clientes</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("SLA de Entregas", (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="text-center">
                           <p className="text-5xl font-black text-blue-600">{deliverySLA}%</p>
                           <p className="text-xs font-bold text-slate-400 uppercase mt-2">Eficiência Logística</p>
                        </div>
                      </div>
                    ))}
                    {renderChartContainer("Qualidade de Transferências", (
                       <div className="flex flex-col items-center justify-center h-full">
                         <p className="text-5xl font-black text-emerald-600">98.5%</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Sem Avarias / Perdas</p>
                       </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'social' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Posts Totais</p>
                        <p className="text-3xl font-black">{socialMediaData.total || 0}</p>
                     </div>
                     <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>Crescimento</p>
                        <p className="text-3xl font-black text-emerald-500">+12.4%</p>
                     </div>
                     <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Impressões</p>
                        <p className="text-3xl font-black text-blue-600">42.5k</p>
                     </div>
                     <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Engajamento</p>
                        <p className="text-3xl font-black text-pink-500">5.8%</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Status de Produção Social", (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={socialMediaData.statusDist || []} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={60} 
                            outerRadius={80} 
                            paddingAngle={5}
                          >
                            {(socialMediaData.statusDist || []).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ))}
                    {renderChartContainer("Alcance por Formato", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Reels', value: 15400, color: '#ec4899' },
                          { name: 'Posts', value: 8900, color: '#3b82f6' },
                          { name: 'Stories', value: 12100, color: '#8b5cf6' },
                          { name: 'Review', value: 3400, color: '#f59e0b' }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {[
                              { name: 'Reels', color: '#ec4899' },
                              { name: 'Posts', color: '#3b82f6' },
                              { name: 'Stories', color: '#8b5cf6' },
                              { name: 'Review', color: '#f59e0b' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {renderChartContainer("SLA de Produção Social", (
                        <div className="flex flex-col items-center justify-center h-full p-4">
                          <p className={`text-4xl font-black ${socialSLA >= 90 ? 'text-emerald-600' : socialSLA >= 70 ? 'text-amber-500' : 'text-rose-600'}`}>
                            {socialSLA}%
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Postagens no Prazo</p>
                        </div>
                      ))}
                      {renderChartContainer("Top Horário Post", (
                        <div className="flex flex-col items-center justify-center h-full p-4">
                          <p className="text-4xl font-black text-amber-500">18:00</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Maior Pico de Alcance</p>
                        </div>
                      ))}
                      {renderChartContainer("Melhor Dia", (
                        <div className="flex flex-col items-center justify-center h-full p-4">
                          <p className="text-4xl font-black text-emerald-500">Quinta</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Volume de Interações</p>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {activeTab === 'colaboradores' && (
                <div className="space-y-4">
                  {renderChartContainer("Top 10 Colaboradores mais Ativos", (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={teamRanking.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                        <Tooltip 
                           contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }}
                           formatter={(value: any) => [`${value} Atividades`, 'Atividade']}
                        />
                        <Bar dataKey="activities" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                           {teamRanking.slice(0, 10).map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#3b82f6'} />
                           ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ))}

                  <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Colaborador</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Tarefas</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Leads</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Entregas</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Vendas</th>
                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamRanking.map((item, idx) => (
                            <tr key={idx} className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                              <td className="p-4 text-sm font-bold flex items-center gap-2">
                                <span className={`size-6 rounded-full flex items-center justify-center text-[10px] text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                                  {idx + 1}
                                </span>
                                {item.name}
                              </td>
                              <td className="p-4 text-sm text-center font-medium">{item.completedTasks} / {item.tasks}</td>
                              <td className="p-4 text-sm text-center font-medium">{item.leads}</td>
                              <td className="p-4 text-sm text-center font-medium">{item.deliveries}</td>
                              <td className="p-4 text-sm text-right font-bold text-emerald-600">R$ {item.sales.toLocaleString('pt-BR')}</td>
                              <td className="p-4 text-sm text-center font-black text-blue-600">{item.activities}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tarefas' && (
                <div className="space-y-6">
                  {/* Avisos de Origem dos Dados */}
                  {!tasksData.hasRealTasks && (
                    <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-2.5 shadow-xs">
                      <span className="animate-pulse size-2 rounded-full bg-amber-500 shrink-0" />
                      <span>Sem tarefas registradas no período selecionado. Exibindo dados demonstrativos para simulação completa dos novos relatórios.</span>
                    </div>
                  )}

                  {/* Cards de Resumo Executivo das Tarefas */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tarefas Analisadas</p>
                      <p className="text-2xl font-black text-blue-500">
                        {filteredTasks?.length || 38}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Total de tarefas no período
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Taxa de Conclusão</p>
                      <p className="text-2xl font-black text-emerald-500">
                        {tasksData.completionRate || 0}%
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        {tasksData.totalCompletedInPeriod || 0} de {tasksData.totalPlannedInPeriod || 0} concluídas
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">SLA de Prazos</p>
                      <p className="text-2xl font-black text-indigo-500">
                        {tasksData.onTimeSLAPercent}%
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Percentual de conclusões no prazo
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${tasksData.overdueActiveCount > 0 ? (isDarkMode ? 'bg-rose-950/40 border-rose-900/50' : 'bg-rose-50 border-rose-100') : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm')}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 dark:text-rose-400 mb-1">Atrasadas Ativas</p>
                      <div className="flex items-baseline gap-2">
                        <p className={`text-2xl font-black ${tasksData.overdueActiveCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {tasksData.overdueActiveCount || 0}
                        </p>
                        {tasksData.overdueActiveCount > 0 && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold uppercase animate-pulse">Atenção</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Tarefas em aberto e fora do prazo
                      </p>
                    </div>
                  </div>

                  {/* 1ª Linha: Tendência de Conclusão de Tarefas (S-Curve) */}
                  <div className={`p-6 rounded-3xl border space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                            <TrendingUp size={18} />
                          </div>
                          <h3 className="text-base font-extrabold tracking-tight">
                            Tendência de Conclusão de Tarefas (Prazos vs Entregas)
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Comparativo cronológico entre datas limites estimadas e entregas finalizadas.
                        </p>
                      </div>

                      {/* Toggle View Mode: Diário vs Acumulado */}
                      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setTrendViewMode('daily')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                            trendViewMode === 'daily'
                              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                        >
                          Fluxo Diário
                        </button>
                        <button
                          type="button"
                          onClick={() => setTrendViewMode('cumulative')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                            trendViewMode === 'cumulative'
                              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                        >
                          Acumulado (Curva-S)
                        </button>
                      </div>
                    </div>

                    {/* Recharts AreaChart Component */}
                    <div className="h-72 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={tasksData.completionTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPlanejado" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                            </linearGradient>
                            <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis
                            dataKey="dateLabel"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                              borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                              borderRadius: '16px',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                              fontSize: '12px'
                            }}
                            formatter={(value: any, name: any) => [
                              value,
                              name === 'planejado' || name === 'cumPlanejado' ? 'Planejadas (Meta)' : 'Concluídas (Real)'
                            ]}
                            labelFormatter={(label: any) => `Data: ${label}`}
                          />
                          <Legend
                            verticalAlign="top"
                            align="right"
                            height={36}
                            iconType="circle"
                            formatter={(value: string) => (
                              <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                {value === 'planejado' || value === 'cumPlanejado' ? 'Prazos Planejados' : 'Tarefas Concluídas'}
                              </span>
                            )}
                          />
                          <Area
                            type="monotone"
                            dataKey={trendViewMode === 'daily' ? 'planejado' : 'cumPlanejado'}
                            name={trendViewMode === 'daily' ? 'planejado' : 'cumPlanejado'}
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorPlanejado)"
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                          <Area
                            type="monotone"
                            dataKey={trendViewMode === 'daily' ? 'realizado' : 'cumRealizado'}
                            name={trendViewMode === 'daily' ? 'realizado' : 'cumRealizado'}
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRealizado)"
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 2ª Linha: Carga de Trabalho & SLA por Colaborador */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Carga de Trabalho Ativa (Gargalo de Pendências)", (
                      tasksData.activeWorkloadData?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={tasksData.activeWorkloadData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold' }} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                            <Bar dataKey="value" name="Tarefas Ativas" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={16}>
                              {tasksData.activeWorkloadData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem pendências ativas no momento</div>
                      )
                    ))}

                    {renderChartContainer("SLA de Conclusão por Colaborador (No Prazo vs Atrasada)", (
                      tasksData.collabSLAData?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={tasksData.collabSLAData} margin={{ top: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                            <Bar dataKey="No Prazo" stackId="a" fill="#10b981" />
                            <Bar dataKey="Atrasadas" stackId="a" fill="#ef4444" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem dados históricos de prazos</div>
                      )
                    ))}
                  </div>

                  {/* 3ª Linha: Classificações de Categorias & Dia da Semana de Criação */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Distribuição por Tipo de Atividade", (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={tasksData.byCategoryData} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={80} 
                            innerRadius={45} 
                            paddingAngle={3}
                            label={({ name, percent }) => `${(name || '').split(' ')[0]} (${((percent || 0) * 100).toFixed(0)}%)`}
                          >
                            {tasksData.byCategoryData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ))}

                    {renderChartContainer("Volume de Criação de Tarefas por Dia da Semana", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tasksData.byDayOfWeekData} margin={{ top: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                          <Bar dataKey="value" name="Volume" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={24}>
                            {tasksData.byDayOfWeekData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  {/* 4ª Linha: Tempos de Resolução & Status / Prioridades Clássicos */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {renderChartContainer("Tempo Médio de Resolução por Prioridade (Horas)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tasksData.resolutionPriorityData} margin={{ top: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val}h`} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }}
                            formatter={(val: any) => [`${val} h`, 'Tempo Médio']}
                          />
                          <Bar dataKey="value" name="Tempo" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32}>
                            {tasksData.resolutionPriorityData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.name === 'Alta' ? '#ef4444' : entry.name === 'Média' ? '#f59e0b' : '#3b82f6'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ))}

                    {renderChartContainer("Tarefas por Prioridade", (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={tasksData.priorityDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4}>
                            {tasksData.priorityDist?.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.name === 'Alta' ? '#ef4444' : entry.name === 'Média' ? '#f59e0b' : '#3b82f6'} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ))}

                    {renderChartContainer("Tarefas por Status", (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={tasksData.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4}>
                            {tasksData.statusDist?.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  {/* 5ª Linha: Produtividade por Colaborador Clássico */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Tarefas Concluídas por Colaborador", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tasksData.completedByCollab}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}

                    {renderChartContainer("Tempo Médio de Resposta (Minutos)", (
                      tasksData?.avgResponseTime?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={tasksData.avgResponseTime} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-4">
                          <p className="text-sm font-medium">Sem dados suficientes.</p>
                          <p className="text-xs mt-1">O tempo médio será calculado para novas tarefas concluídas a partir de agora.</p>
                        </div>
                      )
                    ))}
                  </div>

                  {/* 6ª Linha: Novas Análises de Gestão - Sobrecarga & Atrasos por Categoria */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Índice de Sobrecarga da Equipe (Alocação de Esforço)", (
                      tasksData.overloadIndexData?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={tasksData.overloadIndexData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis type="number" tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }}
                              formatter={(value: any, name: any, props: any) => [`Score: ${value} (${props.payload.status})`, 'Sobrecarga']}
                            />
                            <Bar dataKey="value" name="Índice" radius={[0, 6, 6, 0]} barSize={16}>
                              {tasksData.overloadIndexData.map((entry: any, index: number) => {
                                const color = entry.status === 'Crítico' ? '#ef4444' : entry.status === 'Moderado' ? '#f59e0b' : '#10b981';
                                return <Cell key={`cell-${index}`} fill={color} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem dados de sobrecargas ativas</div>
                      )
                    ))}

                    {renderChartContainer("Taxa de Atrasos por Tipo de Atividade (%)", (
                      tasksData.delayRateByCategoryData?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={tasksData.delayRateByCategoryData} margin={{ top: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} unit="%" tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }}
                              formatter={(value: any) => [`${value}%`, 'Taxa de Atraso']}
                            />
                            <Bar dataKey="value" name="Fator Atraso" fill="#f97316" radius={[6, 6, 0, 0]} barSize={32}>
                              {tasksData.delayRateByCategoryData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.value > 30 ? '#ef4444' : entry.value > 15 ? '#f59e0b' : '#3b82f6'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem métricas de atraso por categoria</div>
                      )
                    ))}
                  </div>

                  {/* 7ª Linha: Novas Análises de Gestão - Horários & Progresso */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Picos de Produtividade (Horário de Conclusão)", (
                      tasksData.completionHourData?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={tasksData.completionHourData}>
                            <defs>
                              <linearGradient id="colorProdHours" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                            <Area type="monotone" dataKey="value" name="Conclusões" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProdHours)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem dados de conclusão de horário</div>
                      )
                    ))}

                    {renderChartContainer("Distribuição de Progresso das Tarefas Ativas", (
                      tasksData.progressDistributionData?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={tasksData.progressDistributionData} 
                              dataKey="value" 
                              nameKey="name" 
                              cx="50%" 
                              cy="50%" 
                              outerRadius={80} 
                              innerRadius={45} 
                              paddingAngle={3}
                              label={({ name, value }) => `${value}`}
                            >
                              {tasksData.progressDistributionData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem tarefas ativas com progresso</div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'transfers' && (
                <div className="space-y-4">
                  {renderChartContainer("Evolução do Volume de Transferências", (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={transfersData.overTime}>
                        <defs>
                          <linearGradient id="colorTrans" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTrans)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ))}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Distribuição por Status", (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={transfersData.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                            {transfersData.statusDist?.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ))}
                    {renderChartContainer("Distribuição por Tipo", (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={transfersData.typeDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                            {transfersData.typeDist?.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Origens mais Frequentes", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transfersData.originDist} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                    {renderChartContainer("Destinos mais Frequentes", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transfersData.destinationDist} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                  </div>
                  
                  {renderChartContainer("Responsáveis por Transferências", (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transfersData.responsibleDist}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ))}
                </div>
              )}

              {activeTab === 'precos' && (
                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {renderChartContainer("Preços Médios por Produto (Cheio)", (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={priceResearchData.summary}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis dataKey="code" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Preço']} />
                            <Bar dataKey="avgFull" name="Preço Médio Cheio" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ))}
                      {renderChartContainer("Preços Médios por Produto (À Vista)", (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={priceResearchData.summary}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis dataKey="code" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Preço']} />
                            <Bar dataKey="avgCash" name="Preço Médio À Vista" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ))}
                      {renderChartContainer("Comparativo de Preços por Loja", (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={priceResearchData.storeComparison}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Valor']} />
                            <Legend verticalAlign="top" height={36}/>
                            <Bar dataKey="avgFull" name="Média Cheio" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Line type="monotone" dataKey="avgCash" name="Média À Vista" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      ))}
                      {renderChartContainer("Top 10 Produtos com Mais Coletas", (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={priceResearchData.byProduct} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip />
                            <Bar dataKey="value" name="Coletas" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ))}
                      {renderChartContainer("Volume de Pesquisas por Loja", (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={priceResearchData.byStore}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {priceResearchData.byStore?.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ))}
                      {renderChartContainer("Lojas Monitoradas por Produto", (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={priceResearchData.summary}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis dataKey="code" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip />
                            <Bar dataKey="storeCount" name="Lojas Monitoradas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ))}
                   </div>
                </div>
              )}

              {activeTab === 'leads' && (
                <div className="space-y-6">
                  {/* Cards Executivos de Leads & Cruzamento de Relatórios Importados */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Leads Enriquecidos (Vendedor)</p>
                      <p className="text-2xl font-black text-emerald-500">
                        {leadsData.enrichedWithSellerCount || 0}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Com histórico de compras vinculado
                      </p>
                    </div>
                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Volume Últimas Compras</p>
                      <p className="text-2xl font-black text-blue-500">
                        {formatBRL(leadsData.totalLastPurchasesBRL || 0)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Soma das últimas compras registradas
                      </p>
                    </div>
                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Faturamento Histórico (Leads)</p>
                      <p className="text-2xl font-black text-indigo-500">
                        {formatBRL(leadsData.totalHistoricalPurchasesBRL || 0)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Total acumulado dos clientes em Leads
                      </p>
                    </div>
                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Bônus Fidelidade em Leads</p>
                      <p className="text-2xl font-black text-amber-500">
                        {formatBRL(leadsData.totalLeadsBonusBRL || 0)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        {leadsData.enrichedWithLoyaltyCount || 0} leads com saldo de pontos ativo
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Novos Leads por Dia", (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={leadsData.overTime}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ))}
                    {renderChartContainer("Funil de Conversão", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { name: 'Total', value: leadsData.overTime?.reduce((acc:any, curr:any) => acc + curr.value, 0) || 0, color: '#3b82f6' },
                          { name: 'Ativos', value: (leadsData.overTime?.reduce((acc:any, curr:any) => acc + curr.value, 0) || 0) - (leadsData.statusDist?.find((s:any) => s.name === 'Perdido')?.value || 0), color: '#8b5cf6' },
                          { name: 'Convertidos', value: leadsData.statusDist?.find((s:any) => s.name === 'Convertido')?.value || 0, color: '#10b981' }
                        ]} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {[0, 1, 2].map((i) => (
                              <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#10b981'][i]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {renderChartContainer("Leads por Segmento", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leadsData.segmentDist}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                    {renderChartContainer("Origem dos Leads", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leadsData.sourceDist}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                    {renderChartContainer("Leads por Responsável", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leadsData.responsibleDist}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  {/* Novos Gráficos: Top Bairros Importados e Cruzamento por Vendedor */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Top 10 Bairros / Regiões (Relatório de Endereços)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leadsData.topNeighborhoods || []} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip />
                          <Bar dataKey="value" name="Clientes / Leads" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                    {renderChartContainer("Faturamento Cruzado por Vendedor nos Leads (R$)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={leadsData.sellerEnrichmentData || []}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip formatter={(val: any) => formatBRL(Number(val) || 0)} />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
                          <Bar dataKey="totalComprado" name="Total Histórico (R$)" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="ultimaCompra" name="Última Compra (R$)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                  </div>

                  {renderChartContainer("Velocidade de Conversão por Responsável (Dias)", (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leadsData.avgVelocityByResponsible} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ))}
                </div>
              )}

              {activeTab === 'deliveries' && (
                <div className="space-y-6">
                  {/* Cards de Resumo Executivo das Entregas */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total de Entregas</p>
                      <p className="text-2xl font-black text-rose-500">
                        {filteredDeliveries?.length || 0}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Remessas registradas no período
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Entregas Finalizadas</p>
                      <p className="text-2xl font-black text-emerald-500">
                        {filteredDeliveries?.filter((d: any) => d.status === 'Finalizada')?.length || 0}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Concluídas com sucesso
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">SLA de Conclusão</p>
                      <p className="text-2xl font-black text-blue-500">
                        {deliverySLA}%
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Taxa de eficiência logística
                      </p>
                    </div>

                    <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Faturamento Logístico</p>
                      <p className="text-2xl font-black text-indigo-500">
                        R$ {(filteredDeliveries?.reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Valor total das mercadorias
                      </p>
                    </div>
                  </div>

                  {/* 1ª Linha: Localidades (Bairros e Cidades) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Bairros com Maior Volume de Entregas (Top 8)", (
                      deliveriesData.topNeighborhoods?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deliveriesData.topNeighborhoods} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold' }} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                            <Bar dataKey="value" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={16}>
                              {deliveriesData.topNeighborhoods.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem dados de bairros</div>
                      )
                    ))}

                    {renderChartContainer("Distribuição Geográfica por Cidade", (
                      deliveriesData.topCities?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={deliveriesData.topCities} 
                              dataKey="value" 
                              nameKey="name" 
                              cx="50%" 
                              cy="50%" 
                              outerRadius={80} 
                              innerRadius={45} 
                              paddingAngle={3}
                              label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                            >
                              {deliveriesData.topCities.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem dados de cidades</div>
                      )
                    ))}
                  </div>

                  {/* 2ª Linha: Equipe & Tempo de Resposta */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Desempenho por Motorista (Entregas Realizadas)", (
                      deliveriesData.topDrivers?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deliveriesData.topDrivers} margin={{ top: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem dados de motoristas</div>
                      )
                    ))}

                    {renderChartContainer("Tempo Médio de Entrega (Horas)", (
                      deliveriesData.avgDeliveryTimes?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deliveriesData.avgDeliveryTimes} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis type="number" tickFormatter={(val) => `${val}h`} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold' }} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }}
                              formatter={(val: any) => [`${val} h`, 'Tempo Médio']}
                            />
                            <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem dados de SLA</div>
                      )
                    ))}
                  </div>

                  {/* 3ª Linha: Produtos & Quantidade de Itens por Entrega */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Produtos Mais Entregues (Top 8)", (
                      deliveriesData.topProducts?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deliveriesData.topProducts} layout="vertical" margin={{ left: 20, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: 'bold' }} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                            <Bar dataKey="value" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={16}>
                              {deliveriesData.topProducts.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem dados de produtos</div>
                      )
                    ))}

                    {renderChartContainer("Quantidade de Itens por Entrega", (
                      deliveriesData.itemsCountData?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={deliveriesData.itemsCountData} 
                              dataKey="value" 
                              nameKey="name" 
                              cx="50%" 
                              cy="50%" 
                              outerRadius={80} 
                              innerRadius={45} 
                              paddingAngle={3}
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {deliveriesData.itemsCountData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem dados de itens</div>
                      )
                    ))}
                  </div>

                  {/* 4ª Linha: Fluxo e Turno */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Evolução do Volume de Entregas", (
                      deliveriesData.overTime?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={deliveriesData.overTime}>
                            <defs>
                              <linearGradient id="colorDeliveriesGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                            <Area type="monotone" dataKey="value" name="Volume" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorDeliveriesGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem dados históricos</div>
                      )
                    ))}

                    {renderChartContainer("Entregas por Turno (Período)", (
                      deliveriesData.shiftData?.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deliveriesData.shiftData} margin={{ top: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none' }} />
                            <Bar dataKey="value" name="Entregas" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={32}>
                              {deliveriesData.shiftData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 5) % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Sem dados de turnos</div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'warranties' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderChartContainer("Garantias por Produto", (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={warrantiesData.productDist} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ))}
                  {renderChartContainer("Volume de Garantias", (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={warrantiesData.overTime}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  ))}
                </div>
              )}

              {activeTab === 'demands' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Status das Demandas (Resolvidas vs Pendentes)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={demandsData.statusGroup} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={80} 
                            innerRadius={40}
                            paddingAngle={5}
                          >
                            {demandsData.statusGroup?.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.name === 'Resolvido' ? '#10b981' : '#f59e0b'} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ))}
                    {renderChartContainer("Distribuição por Prioridade", (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={demandsData.priorityDist} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={80}
                          >
                            {demandsData.priorityDist?.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.name === 'Alta' ? '#ef4444' : entry.name === 'Média' ? '#f59e0b' : '#3b82f6'} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderChartContainer("Demandas por Categoria", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={demandsData.categoryDist} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                    {renderChartContainer("Velocidade de Resolução por Categoria (Dias)", (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={demandsData.avgVelocityByCategory} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ))}
                  </div>
                  
                  {renderChartContainer("Volume de Demandas no Tempo", (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={demandsData.overTime}>
                        <defs>
                          <linearGradient id="colorDemands" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorDemands)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ))}
                </div>
              )}

              {activeTab === 'vendas' && (
                <div className="space-y-6">
                  {(dynamicSalesData?.length || 0) > 0 ? (
                    <>
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Resultado 2026</p>
                          <p className="text-2xl font-black text-blue-600">R$ {dynamicSalesTotals.res2026.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Meta 2026</p>
                          <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>R$ {dynamicSalesTotals.meta2026.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Diferença</p>
                          <p className={`text-2xl font-black ${dynamicSalesTotals.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            R$ {Math.abs(dynamicSalesTotals.diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Performance Meta</p>
                          <div className="flex items-center gap-2">
                            <p className={`text-2xl font-black ${dynamicSalesTotals.percent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {dynamicSalesTotals.percent >= 0 ? '+' : ''}{dynamicSalesTotals.percent}%
                            </p>
                            <TrendingUp size={20} className={dynamicSalesTotals.percent >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
                          </div>
                        </div>
                        <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Crescimento Anual</p>
                          <div className="flex items-center gap-2">
                            <p className={`text-2xl font-black ${dynamicSalesTotals.growth >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                              {dynamicSalesTotals.growth >= 0 ? '+' : ''}{dynamicSalesTotals.growth}%
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium mt-1">vs Resultado 2025</p>
                        </div>
                      </div>

                      {/* Analysis Charts */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderChartContainer("Comparativo de Resultados por Colaborador", (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dynamicSalesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                              />
                              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                              <Bar name="Res. 2025" dataKey="res2025" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                              <Bar name="Meta 2026" dataKey="meta2026" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                              <Bar name="Res. 2026" dataKey="res2026" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ))}
                        {renderChartContainer("Crescimento vs Atingimento de Meta por Colaborador", (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dynamicSalesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                              <Tooltip />
                              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                              <Bar name="Crescimento (%)" dataKey="growth" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                              <Bar name="Atingimento (%)" dataKey="achievement" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ))}
                      </div>

                      {/* Detailed Table */}
                      <div className={`overflow-hidden rounded-3xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                          <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Detalhamento por Colaborador
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className={isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Colaborador</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Res. 2025</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Meta 2026</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Res. 2026</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Cresc.</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ating.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dynamicSalesData.map((item, idx) => (
                                <tr key={idx} className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                                  <td className="p-4 text-sm font-bold">{item.name}</td>
                                  <td className="p-4 text-sm text-right text-slate-500">R$ {item.res2025.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                  <td className="p-4 text-sm text-right font-medium">R$ {item.meta2026.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                  <td className="p-4 text-sm text-right font-bold text-blue-600">R$ {item.res2026.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                  <td className="p-4 text-right">
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${item.growth >= 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                                      {item.growth >= 0 ? '+' : ''}{item.growth}%
                                    </span>
                                  </td>
                                  <td className="p-4 text-right">
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${item.achievement >= 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                      {item.achievement.toFixed(1)}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <TrendingUp size={48} className="mb-4 opacity-20" />
                      <p className="font-medium">Nenhum dado de vendas disponível para este período</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
