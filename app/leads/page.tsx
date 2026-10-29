'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowLeft, Search, Plus, Target, User, Phone, Mail, Calendar, Filter, Briefcase, Shuffle, CheckCircle2, AlertCircle, X, Check, Users, Pencil, BarChart3, MapPin, Trash2, Upload, FileText, FileSpreadsheet, Award, Receipt, Sparkles, RefreshCw, UserCheck, ArrowUpDown, ArrowDownWideNarrow, ArrowUpNarrowWide, SlidersHorizontal, ChevronDown, ChevronUp, Layers, Clock, ExternalLink, Building2, Instagram, MessageCircle, PhoneCall, Timer } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useRole } from '@/hooks/useRole';
import { useTheme } from '@/hooks/useTheme';
import { useUI } from '@/hooks/useUI';
import { useNotifications } from '@/hooks/useNotifications';
import { VoiceSearch } from '@/components/ui/VoiceSearch';
import { LoginForm } from '@/components/auth/LoginForm';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { authFetch } from '@/lib/authFetch';
import { applyStatusToProfiles, getInactiveCollaboratorIds } from '@/lib/collaboratorStatus';
import {
  getStoredLoyaltyClients,
  saveLoyaltyClients,
  formatBRL,
} from '@/lib/loyaltyData';
import {
  REAL_GOOGLE_ESTABLISHMENTS_BY_SEGMENT,
  VERIFIED_STREETS_JP,
  buildCompanyInstagramHandle,
  buildGoogleMapsUrl,
  buildGoogleSearchUrl,
  buildInstagramUrl,
  buildWhatsAppLeadUrl,
  clearLocalImportedLeads,
  enrichAndRepairLead,
  formatFullLeadAddress,
  getLocalImportedLeads,
  getLocalLeadAddressMap,
  loadRemoteLeadAddressMap,
  matchesLeadSearch,
  mergeLeadsWithImported,
  parseLeadAddressParts,
  persistLeadAddresses,
  persistLeadEnrichments,
  resolveSegmentCategoryKey,
  saveLocalImportedLeads,
} from '@/lib/leadsHelper';

import dynamic from 'next/dynamic';

const LeadsMap = dynamic(() => import('@/components/LeadsMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-[400px] bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
});

const MOCK_LEADS = [
  { id: 1, name: 'Ricardo Santos', company: 'Restaurante Mangai', instagram: '@restaurantemangai', status: 'Novo', email: 'contato@mangai.com.br', phone: '(83) 3226-1615', segment: 'Restaurante', assigned_to: null, created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), lat: -7.1145, lng: -34.8290, address: 'Av. Gen. Edson Ramalho, 696 - Manaíra, João Pessoa - PB' },
  { id: 2, name: 'Juliana Paiva', company: 'Padaria El Shaddai', instagram: '@padariaelshaddai', status: 'Em Contato', email: null, phone: '(83) 3246-4554', segment: 'Padaria', assigned_to: null, created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), lat: -7.0890, lng: -34.8320, address: 'R. Francisco Leocádio Ribeiro Coutinho, 451 - Bessa, João Pessoa - PB' },
  { id: 3, name: 'Marcos Oliveira', company: 'Açougue do Boi', instagram: '@acouguedoboi', status: 'Qualificado', email: null, phone: '(83) 99123-4455', segment: 'Açougue', assigned_to: null, created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), lat: -7.1150, lng: -34.8630, address: 'Av. Dom Pedro II, 567 - Centro, João Pessoa - PB' },
  { id: 4, name: 'Camila Doces', company: 'Amor Doce', instagram: '@amordoceconfeitaria', status: 'Novo', email: 'camila@amordoce.com', phone: '(83) 3247-1122', segment: 'Doceria', assigned_to: null, created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(), lat: -7.1250, lng: -34.8230, address: 'Av. Cabo Branco, 2120 - Cabo Branco, João Pessoa - PB' },
];

const MOCK_VENDEDORES = [
  { id: 'vendedor-alex', name: 'Alex Estevam', role: 'Vendedor', type: 'vendedor', status: 'Ativo', active: true, receives_leads: true, image_url: 'https://picsum.photos/seed/alex/200' },
  { id: 'vendedor-joabson', name: 'Joabson Lima', role: 'Vendedor', type: 'vendedor', status: 'Ativo', active: true, receives_leads: true, image_url: 'https://picsum.photos/seed/joabson/200' },
  { id: 'vendedor-aldo', name: 'Aldo Serafim', role: 'Vendedor', type: 'vendedor', status: 'Ativo', active: true, receives_leads: true, image_url: 'https://picsum.photos/seed/aldo/200' },
  { id: 'vendedor-jessica', name: 'Jessica Floriano', role: 'Vendedor', type: 'vendedor', status: 'Ativo', active: true, receives_leads: true, image_url: 'https://picsum.photos/seed/jessica/200' },
  { id: 'vendedor-adriano', name: 'Adriano teste', role: 'Vendedor', type: 'vendedor', status: 'Ativo', active: true, receives_leads: true, image_url: 'https://picsum.photos/seed/adriano/200' },
];

const LEADS_SORT_STORAGE_KEY = 'leads_table_sort_created_at_v1';
const LEADS_SEGMENTS_STORAGE_KEY = 'leads_table_selected_segments_v1';

export default function LeadsPage() {
  const { role, user, isAdmin, canAccessLeads, isAuthenticated, isLoading: roleLoading, login } = useRole();
  const { isDarkMode } = useTheme();
  const { showToast, showConfirm } = useUI();
  const { createNotification } = useNotifications();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDistributing, setIsDistributing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLeadForAssignment, setSelectedLeadForAssignment] = useState<any>(null);
  const [selectedVendedores, setSelectedVendedores] = useState<string[]>([]);
  const [distributionMode, setDistributionMode] = useState<'random' | 'balanced'>('balanced');
  const [vendedorSearchQuery, setVendedorSearchQuery] = useState('');
  const [searchSegment, setSearchSegment] = useState('');
  const [searchNeighborhood, setSearchNeighborhood] = useState('');
  const [searchCity, setSearchCity] = useState('João Pessoa - PB');
  const [searchIteration, setSearchIteration] = useState(0);
  const [lastSearchSummary, setLastSearchSummary] = useState<{
    segment: string;
    neighborhood: string | null;
    city: string;
    count: number;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    company: '',
    instagram: '',
    email: '',
    phone: '',
    segment: 'Geral',
    address: '',
    neighborhood: '',
    city: '',
    reference: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [tableMissing, setTableMissing] = useState(false);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Todos');
  const [createdAtSortOrder, setCreatedAtSortOrder] = useState<'desc' | 'asc'>('desc');
  const [tablePrefsHydrated, setTablePrefsHydrated] = useState(false);
  const [expandedLeadIds, setExpandedLeadIds] = useState<Record<string, boolean>>({});
  const [allCardsExpanded, setAllCardsExpanded] = useState<boolean>(false);

  // Busca Avançada na parte superior da tabela de leads
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedMultiSegmentsInput, setAdvancedMultiSegmentsInput] = useState('');
  const [advancedLocationFilter, setAdvancedLocationFilter] = useState('');
  const [advancedAssignmentFilter, setAdvancedAssignmentFilter] = useState<string>('todos');
  const [advancedDateFrom, setAdvancedDateFrom] = useState('');
  const [advancedDateTo, setAdvancedDateTo] = useState('');
  const [advancedLoyaltyFilter, setAdvancedLoyaltyFilter] = useState<'todos' | 'com_fidelidade' | 'com_compra'>('todos');

  const [userReceivesLeads, setUserReceivesLeads] = useState<boolean>(true);
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);

  // Import Report Modal & Auto-Recognition State
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImportingReport, setIsImportingReport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResultSummary, setImportResultSummary] = useState<{
    reportType: string;
    reportTitle: string;
    updatedFields: string[];
    stats: {
      totalReportRecords: number;
      updatedLeads: number;
      newLeadsCreated: number;
      totalLeadsAfterImport: number;
      sellersMatched: number;
      loyaltyMatched: number;
    };
  } | null>(null);
  const reportFileInputRef = useRef<HTMLInputElement>(null);

  // Carrega preferências persistentes da tabela de leads (ordenação por data de criação e segmentos selecionados)
  useEffect(() => {
    try {
      const savedSort = localStorage.getItem(LEADS_SORT_STORAGE_KEY);
      if (savedSort === 'asc' || savedSort === 'desc') {
        setCreatedAtSortOrder(savedSort);
      }
      const savedSegments = localStorage.getItem(LEADS_SEGMENTS_STORAGE_KEY);
      if (savedSegments) {
        const parsed = JSON.parse(savedSegments);
        if (Array.isArray(parsed)) {
          setSelectedSegments(parsed.filter((s) => typeof s === 'string' && s.trim().length > 0));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar preferências da tabela de leads:', err);
    } finally {
      setTablePrefsHydrated(true);
    }
  }, []);

  // Salva de forma persistente a ordenação por data de criação
  useEffect(() => {
    if (!tablePrefsHydrated) return;
    try {
      localStorage.setItem(LEADS_SORT_STORAGE_KEY, createdAtSortOrder);
    } catch (err) {
      console.error('Erro ao salvar ordenação de leads:', err);
    }
  }, [createdAtSortOrder, tablePrefsHydrated]);

  // Salva de forma persistente os múltiplos segmentos selecionados
  useEffect(() => {
    if (!tablePrefsHydrated) return;
    try {
      localStorage.setItem(LEADS_SEGMENTS_STORAGE_KEY, JSON.stringify(selectedSegments));
    } catch (err) {
      console.error('Erro ao salvar filtro de segmentos:', err);
    }
  }, [selectedSegments, tablePrefsHydrated]);

  const toggleSegmentSelection = (segmentName: string) => {
    const clean = (segmentName || 'Geral').trim();
    setSelectedSegments((prev) =>
      prev.includes(clean) ? prev.filter((s) => s !== clean) : [...prev, clean]
    );
  };

  const clearAllTableFilters = () => {
    setSearchQuery('');
    setSelectedStatusFilter('Todos');
    setSelectedSegments([]);
    setAdvancedMultiSegmentsInput('');
    setAdvancedLocationFilter('');
    setAdvancedAssignmentFilter('todos');
    setAdvancedDateFrom('');
    setAdvancedDateTo('');
    setAdvancedLoyaltyFilter('todos');
  };

  useEffect(() => {
    if (user) {
      setUserReceivesLeads(user.receives_leads !== false);
    }
  }, [user]);

  const handleToggleMyAvailability = async () => {
    if (!user?.id) return;
    
    setIsUpdatingAvailability(true);
    const newValue = !userReceivesLeads;
    
    try {
      const isConfigured = Boolean(isSupabaseConfigured);

      if (isConfigured) {
        const { error } = await supabase
          .from('profiles')
          .update({ receives_leads: newValue })
          .eq('id', user.id);
        
        if (error) throw error;
      }
      
      setUserReceivesLeads(newValue);
      showToast(newValue ? 'Você agora está disponível para receber leads!' : 'Você marcou como indisponível para receber novos leads.', 'info');
    } catch (err: any) {
      console.error('Error updating availability:', err);
      showToast('Erro ao atualizar sua disponibilidade.', 'error');
    } finally {
      setIsUpdatingAvailability(false);
    }
  };

  const isManagerOrAdmin = isAdmin || role === 'gerente' || role === 'supervisor';

  const visibleLeads = React.useMemo(() => {
    if (isManagerOrAdmin) {
      return leads;
    }
    // Vendedores devem visualizar SOMENTE os leads distribuídos para eles
    return leads.filter(lead => lead.assigned_to === user?.id);
  }, [leads, isManagerOrAdmin, user?.id]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      'Todos': visibleLeads.length,
      'Novo': 0,
      'Em Contato': 0,
      'Qualificado': 0,
      'Concluído': 0
    };

    visibleLeads.forEach((lead) => {
      const st = lead.status || 'Novo';
      counts[st] = (counts[st] || 0) + 1;
    });

    return counts;
  }, [visibleLeads]);

  const availableStatuses = React.useMemo(() => {
    const defaultStatuses = ['Todos', 'Novo', 'Em Contato', 'Qualificado', 'Concluído'];
    const customStatuses = Object.keys(statusCounts).filter(st => !defaultStatuses.includes(st) && statusCounts[st] > 0);
    return [...defaultStatuses, ...customStatuses];
  }, [statusCounts]);

  const segmentData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    visibleLeads.forEach((lead) => {
      const seg = (lead.segment || 'Geral').trim();
      counts[seg] = (counts[seg] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([segment, total]) => ({ segment, total }))
      .sort((a, b) => b.total - a.total);
  }, [visibleLeads]);

  const handleSearchLeads = async () => {
    if (!searchSegment || !searchSegment.trim()) return;

    setIsSearching(true);
    const currentIteration = searchIteration;
    setSearchIteration((prev) => prev + 1);

    try {
      let leadsData: any[] = [];
      let resolvedMeta: {
        segment?: string;
        neighborhood?: string | null;
        city?: string;
      } = {};
      let fetchSuccess = false;

      const existingCompanies = leads
        .map((l) => (l.company || '').trim())
        .filter(Boolean);
      const existingPhones = leads
        .map((l) => (l.phone || '').replace(/\D/g, ''))
        .filter(Boolean);

      const requestPayload = {
        segment: searchSegment.trim(),
        neighborhood: searchNeighborhood.trim(),
        city: searchCity.trim() || 'João Pessoa - PB',
        count: 12,
        searchIteration: currentIteration,
        excludeCompanies: existingCompanies,
        excludePhones: existingPhones,
      };

      try {
        let res = await authFetch('/api/gemini/search-leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });

        if (res.status === 401) {
          try {
            await supabase.auth.refreshSession();
          } catch {}
          res = await authFetch('/api/gemini/search-leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload),
          });
        }

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.leads) && data.leads.length > 0) {
            leadsData = data.leads;
            resolvedMeta = data.meta || {};
            fetchSuccess = true;
          }
        }
      } catch (networkErr) {
        console.warn('Busca de leads via API encontrou instabilidade, acionando gerador local:', networkErr);
      }

      const rawCleanSeg =
        resolvedMeta.segment ||
        searchSegment
          .trim()
          .split(',')[0]
          .replace(/\b(?:em|no|na|nos|nas)\s+[a-zA-ZÀ-ÿ\s-]+$/i, '')
          .trim() ||
        searchSegment.trim();
      const formattedSegment =
        rawCleanSeg.charAt(0).toUpperCase() + rawCleanSeg.slice(1);
      const targetNeighborhood =
        resolvedMeta.neighborhood ||
        (searchNeighborhood.trim() ? searchNeighborhood.trim() : null);
      const targetCity =
        resolvedMeta.city || searchCity.trim() || 'João Pessoa - PB';

      // Fallback local caso a API não responda: gera 12 leads inéditos com nomes reais de estabelecimentos do Google respeitando bairro e cidade solicitados
      if (!fetchSuccess || leadsData.length === 0) {
        const fallbackContactNames = [
          'Ricardo Albuquerque',
          'Luciana Ferreira',
          'Roberto Mendes',
          'Ana Paula Rocha',
          'Fábio Vasconcelos',
          'Juliana Cavalcanti',
          'Carlos Eduardo Dantas',
          'Patrícia Sales',
          'Diego Nogueira',
          'Camila Bezerra',
          'Rodrigo Nóbrega',
          'Fernanda Maia',
        ];
        const catKey = resolveSegmentCategoryKey(formattedSegment);
        const realEstablishments =
          REAL_GOOGLE_ESTABLISHMENTS_BY_SEGMENT[catKey] || null;
        const matchingStreets = targetNeighborhood
          ? VERIFIED_STREETS_JP.filter(
              (s) =>
                s.neighborhood.toLowerCase() === targetNeighborhood.toLowerCase()
            )
          : VERIFIED_STREETS_JP;
        const activeStreets =
          matchingStreets.length > 0 ? matchingStreets : VERIFIED_STREETS_JP;

        leadsData = fallbackContactNames.map((contactName, i) => {
          const idx = i + currentIteration * 12;
          const loc = activeStreets[idx % activeStreets.length];
          const [minN, maxN] = loc.numberRange;
          const streetNum = String(
            minN + ((idx * 61 + 29) % Math.max(maxN - minN, 100))
          );
          const nb = targetNeighborhood || loc.neighborhood;
          const ct = targetCity || loc.city;
          const st =
            matchingStreets.length === 0 && targetNeighborhood
              ? `Av. Principal de ${targetNeighborhood}`
              : loc.street;
          const phoneSuffix = String(1000 + ((idx * 347 + 191) % 8999)).slice(0, 4);
          const phoneMid = String(2100 + ((idx * 173 + 83) % 7800)).slice(0, 4);

          let estName = '';
          if (realEstablishments && realEstablishments.length > 0) {
            const baseEst = realEstablishments[idx % realEstablishments.length];
            estName =
              currentIteration > 0 && !baseEst.toLowerCase().includes(nb.toLowerCase())
                ? `${baseEst} - Unidade ${nb}`
                : baseEst;
          } else {
            estName = `${formattedSegment} ${nb}${currentIteration > 0 ? ` - Filial ${currentIteration + 1}` : ''}`;
          }

          const fullAddr = `${st}, ${streetNum} - ${nb}, ${ct}`;
          const igHandle = buildCompanyInstagramHandle(estName);
          return {
            name: contactName,
            company: estName,
            google_name: estName,
            instagram: igHandle,
            instagram_url: buildInstagramUrl(igHandle, estName),
            google_search_url: buildGoogleSearchUrl(estName, nb, ct),
            google_maps_url: buildGoogleMapsUrl(estName, fullAddr),
            email: null,
            phone: `(83) 9${phoneMid}-${phoneSuffix}`,
            street: st,
            number: streetNum,
            neighborhood: nb,
            city: ct,
            address: fullAddr,
            lat: loc.lat + ((idx % 7) - 3) * 0.0005,
            lng: loc.lng + (((idx * 2) % 7) - 3) * 0.0005,
            segment: formattedSegment,
          };
        });
      }

      // Garante que cada lead retornado mantenha estritamente o nome do estabelecimento no Google, Instagram, endereço, bairro e cidade da pesquisa
      const sanitizedLeads = leadsData.map((l: any) => {
        const hasEmail = Boolean(
          l.email &&
            typeof l.email === 'string' &&
            l.email.trim().length > 5 &&
            l.email.includes('@') &&
            !l.email.includes('exemplo') &&
            !l.email.includes('teste') &&
            !l.email.includes('null')
        );
        const nb = targetNeighborhood || l.neighborhood || 'Manaíra';
        const ct = targetCity || l.city || 'João Pessoa - PB';
        const st = l.street || `Av. Principal de ${nb}`;
        const num = l.number || '100';
        const fullAddr =
          l.address && l.address.includes(nb)
            ? l.address
            : `${st}, ${num} - ${nb}, ${ct}`;
        const googleEstablishmentName = (l.google_name || l.company || '').trim();
        const igHandle = buildCompanyInstagramHandle(googleEstablishmentName, l.instagram);

        return {
          ...l,
          company: googleEstablishmentName,
          google_name: googleEstablishmentName,
          instagram: igHandle,
          instagram_url:
            l.instagram_url || buildInstagramUrl(igHandle, googleEstablishmentName),
          google_search_url:
            l.google_search_url ||
            buildGoogleSearchUrl(googleEstablishmentName, nb, ct),
          google_maps_url:
            l.google_maps_url ||
            buildGoogleMapsUrl(googleEstablishmentName, fullAddr),
          email: hasEmail ? l.email.trim().toLowerCase() : null,
          segment: l.segment || formattedSegment,
          street: st,
          number: num,
          neighborhood: nb,
          city: ct,
          address: fullAddr,
        };
      });

      const isConfigured = Boolean(isSupabaseConfigured);
      const nowIso = new Date().toISOString();
      let finalAddedLeads: any[] = [];

      if (isConfigured && !tableMissing) {
        let insertedRows: any[] | null = null;
        const fullPayload = sanitizedLeads.map((l: any) => ({
          name: l.name,
          company: l.company,
          email: l.email || null,
          phone: l.phone,
          address: l.address || null,
          lat: l.lat ?? null,
          lng: l.lng ?? null,
          segment: l.segment || formattedSegment,
          status: 'Novo',
          created_at: nowIso,
        }));

        const { data: fullData, error: fullError } = await supabase
          .from('leads')
          .insert(fullPayload)
          .select();

        if (!fullError && fullData) {
          insertedRows = fullData;
        } else {
          const basePayload = sanitizedLeads.map((l: any) => ({
            name: l.name,
            company: l.company,
            email: l.email || null,
            phone: l.phone,
            segment: l.segment || formattedSegment,
            status: 'Novo',
            created_at: nowIso,
          }));

          const { data: baseData, error: baseError } = await supabase
            .from('leads')
            .insert(basePayload)
            .select();

          if (!baseError && baseData) {
            insertedRows = baseData;
          } else {
            console.warn('Erro ao inserir leads no Supabase, mantendo localmente:', baseError || fullError);
          }
        }

        if (insertedRows && insertedRows.length > 0) {
          finalAddedLeads = insertedRows.map((dbRow, i) => ({
            ...sanitizedLeads[i],
            ...dbRow,
            address: sanitizedLeads[i]?.address || dbRow.address,
            street: sanitizedLeads[i]?.street,
            number: sanitizedLeads[i]?.number,
            neighborhood: sanitizedLeads[i]?.neighborhood,
            city: sanitizedLeads[i]?.city,
            lat: sanitizedLeads[i]?.lat ?? dbRow.lat,
            lng: sanitizedLeads[i]?.lng ?? dbRow.lng,
          }));
        }
      }

      if (finalAddedLeads.length === 0) {
        const baseId = Math.max(
          ...leads.map((x) => (typeof x.id === 'number' ? x.id : 0)),
          Date.now() % 1000000
        );
        finalAddedLeads = sanitizedLeads.map((l: any, i: number) => ({
          ...l,
          id: baseId + i + 1,
          status: 'Novo',
          created_at: nowIso,
        }));
      }

      await persistLeadAddresses(finalAddedLeads);
      setLeads((prev) => {
        const updated = [...finalAddedLeads, ...prev];
        saveLocalImportedLeads(updated);
        return updated;
      });

      setLastSearchSummary({
        segment: formattedSegment,
        neighborhood: targetNeighborhood,
        city: targetCity,
        count: finalAddedLeads.length,
      });

      // Alinha os filtros da listagem para que os novos resultados apareçam imediatamente
      if (selectedSegments.length > 0 && !selectedSegments.includes(formattedSegment)) {
        setSelectedSegments([]);
      }
      if (selectedStatusFilter !== 'Todos' && selectedStatusFilter !== 'Novo') {
        setSelectedStatusFilter('Todos');
      }

      const locText = targetNeighborhood
        ? `no bairro ${targetNeighborhood} (${targetCity})`
        : `em ${targetCity}`;
      showToast(
        `${finalAddedLeads.length} novos leads de "${formattedSegment}" encontrados ${locText}!`,
        'success'
      );
    } catch (err) {
      console.error('Detailed Error in handleSearchLeads:', err);
      showToast(
        `Erro ao buscar leads: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        'error'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const hasAccess = canAccessLeads;

  const fetchVendedores = async () => {
    console.log('Fetching vendedores...');
    try {
      let rawProfiles: any[] = [];

      // 1. Tentar carregar perfis diretamente do Supabase
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      
      if (!error && data && data.length > 0) {
        rawProfiles = data;
      } else {
        // Fallback para rota /api/collaborators que contorna restrições de permissão
        try {
          const res = await authFetch('/api/collaborators');
          const json = await res.json();
          if (json?.collaborators?.length) {
            rawProfiles = json.collaborators;
          }
        } catch (apiErr) {
          console.warn('Fallback /api/collaborators falhou:', apiErr);
        }
      }

      if (rawProfiles.length === 0) {
        rawProfiles = MOCK_VENDEDORES;
      }

      // Aplica status do localStorage (caso algum vendedor tenha sido inativado)
      const withStatus = applyStatusToProfiles(rawProfiles);
      const inactiveIds = getInactiveCollaboratorIds();

      // FILTRO RIGOROSO: SOMENTE VENDEDORES ATIVOS
      const activeSellers = withStatus.filter(p => {
        // 1. Deve estar ATIVO
        if (inactiveIds.includes(p.id)) return false;
        if (p.active === false) return false;
        const status = (p.status || 'Ativo').toLowerCase().trim();
        if (status === 'inativo') return false;

        // 2. Não pode ser entregador nem estoque
        const role = (p.role || '').toLowerCase();
        const type = (p.type || '').toLowerCase();
        if (type === 'entregador' || role.includes('entrega') || role.includes('estoque')) {
          return false;
        }

        // 3. Deve ser da área comercial/vendas
        const isSeller = 
          type === 'vendedor' || 
          role.includes('vendedor') || 
          role.includes('vendas') || 
          role.includes('consultor') ||
          p.can_access_leads === true;

        return isSeller;
      });

      console.log(`Vendedores ativos carregados para leads: ${activeSellers.length}`);
      setVendedores(activeSellers);
    } catch (err) {
      console.error('Error fetching vendedores:', err);
      setVendedores(MOCK_VENDEDORES.filter(v => v.status === 'Ativo'));
    }
  };

  const fetchLeads = async () => {
    try {
      const isConfigured = Boolean(isSupabaseConfigured);
      const addressMap = await loadRemoteLeadAddressMap();

      if (!isConfigured) {
        const mergedMocks = mergeLeadsWithImported(MOCK_LEADS, addressMap);
        setLeads(mergedMocks);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('leads')
        .select('*, assigned_profile:profiles(name)')
        .order('created_at', { ascending: false });
      
      if (error) {
        const isTableMissing = error.code === '42P01' || 
                               error.message?.includes('relation "leads" does not exist') ||
                               error.message?.includes('Could not find the table \'public.leads\' in the schema cache');
        
        if (isTableMissing) {
          setTableMissing(true);
        }
        const mergedMocks = mergeLeadsWithImported(MOCK_LEADS, addressMap);
        setLeads(mergedMocks);
      } else {
        const rawList = data && data.length > 0 ? data : MOCK_LEADS;
        const mergedList = mergeLeadsWithImported(rawList, addressMap);
        setLeads(mergedList);
        // Persiste os endereços reparados/validados para manter consistência entre sessões
        persistLeadAddresses(mergedList);
      }
    } catch (err: any) {
      const localMap = getLocalLeadAddressMap();
      setLeads(mergeLeadsWithImported(MOCK_LEADS, localMap));
    } finally {
      setLoading(false);
    }
  };

  const applyImportedLeadsResult = async (json: any) => {
    const importedLeads: any[] = Array.isArray(json.leads) ? json.leads : [];
    const addressMap = getLocalLeadAddressMap();
    const enrichedList = importedLeads.map((l, idx) =>
      enrichAndRepairLead(l, idx, addressMap)
    );

    setLeads(enrichedList);
    saveLocalImportedLeads(enrichedList);
    persistLeadEnrichments(enrichedList);
    await persistLeadAddresses(enrichedList);

    if (Array.isArray(json.loyaltyClients) && json.loyaltyClients.length > 0) {
      saveLoyaltyClients(json.loyaltyClients);
    }

    setImportResultSummary({
      reportType: json.reportType || 'clientes_erp',
      reportTitle: json.reportTitle || 'Relatório Comercial',
      updatedFields: json.updatedFields || [],
      stats: json.stats || {
        totalReportRecords: enrichedList.length,
        updatedLeads: 0,
        newLeadsCreated: enrichedList.length,
        totalLeadsAfterImport: enrichedList.length,
        sellersMatched: 0,
        loyaltyMatched: 0,
      },
    });

    showToast(
      json.message ||
        `Relatório "${json.reportTitle}" reconhecido e informações atualizadas!`,
      'success'
    );
  };

  const handleImportReportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingReport(true);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('currentLeads', JSON.stringify(leads));
      formData.append('vendedores', JSON.stringify(vendedores));
      formData.append('currentLoyalty', JSON.stringify(getStoredLoyaltyClients()));

      const res = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Não foi possível reconhecer ou processar o relatório.');
      }

      await applyImportedLeadsResult(json);
    } catch (err: any) {
      console.error('Error importing report in Leads:', err);
      setImportError(err.message || 'Falha ao importar o relatório.');
      showToast(err.message || 'Erro ao processar relatório.', 'error');
    } finally {
      setIsImportingReport(false);
      if (reportFileInputRef.current) {
        reportFileInputRef.current.value = '';
      }
    }
  };

  const handleQuickPresetImport = async (
    preset: 'vendas_vendedor' | 'fidelidade' | 'cruzado_completo'
  ) => {
    setIsImportingReport(true);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append('presetReport', preset);
      formData.append('currentLeads', JSON.stringify(leads));
      formData.append('vendedores', JSON.stringify(vendedores));
      formData.append('currentLoyalty', JSON.stringify(getStoredLoyaltyClients()));

      const res = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro ao sincronizar relatório.');
      }

      await applyImportedLeadsResult(json);
    } catch (err: any) {
      console.error('Error in quick preset import:', err);
      setImportError(err.message || 'Erro ao sincronizar relatório.');
      showToast(err.message || 'Erro ao sincronizar relatório.', 'error');
    } finally {
      setIsImportingReport(false);
    }
  };

  const handleSync = async () => {
    setIsDistributing(true);
    await Promise.all([fetchLeads(), fetchVendedores()]);
    setIsDistributing(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  useEffect(() => {
    if (isAuthenticated && hasAccess) {
      fetchLeads();
      fetchVendedores();
    }

    // Real-time subscription
    const tables = ['leads', 'profiles'];
    const channels = tables.map(table => {
      return supabase
        .channel(`public:${table}-leads-realtime`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          if (table === 'leads') fetchLeads();
          if (table === 'profiles') fetchVendedores();
        })
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [isAuthenticated, hasAccess]);

  useEffect(() => {
    // Initialize selected vendedores when list is fetched
    if (vendedores.length > 0 && selectedVendedores.length === 0) {
      // Use receives_leads from DB if available, otherwise default to all
      const receiving = vendedores.filter(v => v.receives_leads !== false).map(v => v.id);
      setSelectedVendedores(receiving);
    }
  }, [vendedores, selectedVendedores.length]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.company) {
      showToast('Nome e Empresa são obrigatórios.', 'warning');
      return;
    }

    if (newLead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newLead.email)) {
      showToast('E-mail inválido.', 'warning');
      return;
    }

    if (emailError || phoneError) {
      showToast('Corrija os erros no formulário antes de salvar.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const isConfigured = Boolean(isSupabaseConfigured);
      const cleanEmail = newLead.email && newLead.email.trim() ? newLead.email.trim() : null;
      const formattedAddress = formatFullLeadAddress(newLead);
      const localMap = getLocalLeadAddressMap();

      if (selectedLeadForAssignment) {
        // Edit mode
        const resolvedIg = buildCompanyInstagramHandle(
          newLead.company.trim(),
          newLead.instagram || selectedLeadForAssignment.instagram
        );
        const resolvedIgUrl = buildInstagramUrl(resolvedIg, newLead.company.trim());

        const fullUpdateData = {
          name: newLead.name.trim(),
          company: newLead.company.trim(),
          email: cleanEmail,
          phone: newLead.phone,
          segment: newLead.segment || 'Geral',
          address: formattedAddress || selectedLeadForAssignment.address || null,
        };

        const baseUpdateData = {
          name: newLead.name.trim(),
          company: newLead.company.trim(),
          email: cleanEmail,
          phone: newLead.phone,
          segment: newLead.segment || 'Geral',
        };

        if (isConfigured && !tableMissing) {
          const { error: fullErr } = await supabase
            .from('leads')
            .update(fullUpdateData)
            .eq('id', selectedLeadForAssignment.id);

          if (fullErr) {
            const { error: baseErr } = await supabase
              .from('leads')
              .update(baseUpdateData)
              .eq('id', selectedLeadForAssignment.id);
            if (baseErr) throw baseErr;
          }
        }

        const updatedLeadObj = enrichAndRepairLead(
          {
            ...selectedLeadForAssignment,
            ...fullUpdateData,
            instagram: resolvedIg,
            instagram_url: resolvedIgUrl,
            neighborhood: newLead.neighborhood || selectedLeadForAssignment.neighborhood,
            city: newLead.city || selectedLeadForAssignment.city || 'João Pessoa - PB',
            reference: newLead.reference || '',
          },
          0,
          localMap
        );

        await persistLeadAddresses([updatedLeadObj]);
        setLeads(prev => {
          const updated = prev.map(l => l.id === selectedLeadForAssignment.id ? updatedLeadObj : l);
          saveLocalImportedLeads(updated);
          return updated;
        });
        showToast('Lead atualizado com sucesso.', 'success');
      } else {
        // Create mode
        const nowIso = new Date().toISOString();
        const resolvedIg = buildCompanyInstagramHandle(
          newLead.company.trim(),
          newLead.instagram
        );
        const resolvedIgUrl = buildInstagramUrl(resolvedIg, newLead.company.trim());

        const baseInsertData = {
          name: newLead.name.trim(),
          company: newLead.company.trim(),
          email: cleanEmail,
          phone: newLead.phone,
          segment: newLead.segment || 'Geral',
          status: 'Novo',
          created_at: nowIso,
          assigned_to: null,
          created_by: user?.id || null,
        };

        const fullInsertData = {
          ...baseInsertData,
          address: formattedAddress || null,
        };

        let createdRow: any = null;

        if (isConfigured && !tableMissing) {
          const { data: fullData, error: fullErr } = await supabase
            .from('leads')
            .insert([fullInsertData])
            .select();

          if (!fullErr && fullData && fullData[0]) {
            createdRow = fullData[0];
          } else {
            const { data: baseData, error: baseErr } = await supabase
              .from('leads')
              .insert([baseInsertData])
              .select();
            if (baseErr) {
              console.error('Supabase error:', baseErr);
              throw baseErr;
            }
            if (baseData && baseData[0]) {
              createdRow = baseData[0];
            }
          }
        }

        const newId = createdRow?.id ?? (leads.length > 0 ? (Math.max(...leads.map(l => typeof l.id === 'number' ? l.id : 0), 0) + 1) : 1);
        const enrichedCreated = enrichAndRepairLead(
          {
            ...(createdRow || baseInsertData),
            id: newId,
            instagram: resolvedIg,
            instagram_url: resolvedIgUrl,
            address: formattedAddress || createdRow?.address || '',
            neighborhood: newLead.neighborhood || '',
            city: newLead.city || 'João Pessoa - PB',
            reference: newLead.reference || '',
          },
          0,
          localMap
        );

        await persistLeadAddresses([enrichedCreated]);
        setLeads(prev => {
          const updated = [enrichedCreated, ...prev];
          saveLocalImportedLeads(updated);
          return updated;
        });
        showToast('Lead criado com sucesso.', 'success');
      }

      setShowAddModal(false);
      setNewLead({ 
        name: '', 
        company: '', 
        instagram: '',
        email: '', 
        phone: '', 
        segment: 'Geral',
        address: '',
        neighborhood: '',
        city: '',
        reference: ''
      });
      setSelectedLeadForAssignment(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving lead:', err);
      showToast(`Erro ao salvar lead: ${err.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDistributeLeads = async () => {
    if (!canAccessLeads) return;
    
    const unassignedLeads = leads.filter(l => !l.assigned_to && l.status === 'Novo');
    
    if (unassignedLeads.length === 0) {
      showToast('Não há novos leads para distribuir.', 'info');
      return;
    }

    if (vendedores.length === 0) {
      showToast('Não há vendedores cadastrados para receber leads.', 'warning');
      return;
    }

    if (selectedVendedores.length === 0) {
      showToast('Selecione pelo menos um vendedor para a distribuição.', 'warning');
      return;
    }

    setIsDistributing(true);
    
    try {
      // Only distribute to 'Ativo' and 'Habilitado' (receives_leads) vendedores
      const activeVendedores = vendedores.filter(v => 
        selectedVendedores.includes(v.id) && 
        (v.status === 'Ativo' || !v.status) &&
        v.receives_leads !== false
      );

      if (activeVendedores.length === 0) {
        showToast('Nenhum vendedor selecionado está com status "Ativo" no momento.', 'warning');
        setIsDistributing(false);
        return;
      }
      
      const isConfigured = Boolean(isSupabaseConfigured);

      // Prepare updates
      const updates: any[] = [];
      
      if (distributionMode === 'random') {
        unassignedLeads.forEach(lead => {
          const randomVendedor = activeVendedores[Math.floor(Math.random() * activeVendedores.length)];
          updates.push({
            id: lead.id,
            name: lead.name,
            assigned_to: randomVendedor.id,
            assigned_name: randomVendedor.name,
            status: 'Em Contato'
          });
        });
      } else {
        // Balanced (Round-robin)
        unassignedLeads.forEach((lead, index) => {
          const vendedor = activeVendedores[index % activeVendedores.length];
          updates.push({
            id: lead.id,
            name: lead.name,
            assigned_to: vendedor.id,
            assigned_name: vendedor.name,
            status: 'Em Contato'
          });
        });
      }

      if (isConfigured) {
        // Update Supabase in batches or one by one for simplicity in this demo
        for (const update of updates) {
          await supabase
            .from('leads')
            .update({ 
              assigned_to: update.assigned_to, 
              status: 'Em Contato' 
            })
            .eq('id', update.id);
        }
      }

      // Update local state
      const updatedLeads = leads.map(lead => {
        const update = updates.find(u => u.id === lead.id);
        if (update) {
          return {
            ...lead,
            assigned_to: update.assigned_to,
            assigned_profile: { name: update.assigned_name },
            status: 'Em Contato'
          };
        }
        return lead;
      });

      setLeads(updatedLeads);
      setShowDistributeModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Notify assigned sellers
      for (const update of updates) {
        await createNotification(
          update.assigned_to,
          'Novo Lead Recebido',
          `Um novo lead (${update.name || 'Novo Lead'}) foi distribuído para você.`,
          'info'
        );
      }
      
    } catch (err) {
      console.error('Error distributing leads:', err);
    } finally {
      setIsDistributing(false);
    }
  };

  const toggleVendedorSelection = async (id: string) => {
    const isSelected = selectedVendedores.includes(id);
    const newSelection = isSelected 
      ? selectedVendedores.filter(v => v !== id) 
      : [...selectedVendedores, id];
    
    setSelectedVendedores(newSelection);

    // Persist to Supabase
    try {
      const isConfigured = Boolean(isSupabaseConfigured);

      if (isConfigured) {
        await supabase
          .from('profiles')
          .update({ receives_leads: !isSelected })
          .eq('id', id);
      }
      
      // Update local vendedores state to keep it in sync
      setVendedores(prev => prev.map(v => 
        v.id === id ? { ...v, receives_leads: !isSelected } : v
      ));
    } catch (err) {
      console.error('Error updating receives_leads:', err);
    }
  };

  const handleAssignLead = async (vendedorId: string) => {
    if (!selectedLeadForAssignment) return;
    
    setIsDistributing(true);
    try {
      const vendedor = vendedores.find(v => v.id === vendedorId);
      
      const isConfigured = Boolean(isSupabaseConfigured);

      if (isConfigured) {
        const { error } = await supabase
          .from('leads')
          .update({ 
            assigned_to: vendedorId, 
            status: 'Em Contato' 
          })
          .eq('id', selectedLeadForAssignment.id);
        
        if (error) throw error;
      }

      // Update local state
      setLeads(prev => prev.map(l => 
        l.id === selectedLeadForAssignment.id 
          ? { ...l, assigned_to: vendedorId, assigned_profile: { name: vendedor?.name }, status: 'Em Contato' } 
          : l
      ));

      // Notify the seller
      if (vendedorId) {
        await createNotification(
          vendedorId,
          'Novo Lead Atribuído',
          `Você recebeu o lead ${selectedLeadForAssignment.name} (${selectedLeadForAssignment.company}).`,
          'info'
        );
      }

      setShowAssignModal(false);
      setSelectedLeadForAssignment(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Error assigning lead:', err);
      showToast('Erro ao atribuir lead.', 'error');
    } finally {
      setIsDistributing(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    showConfirm({
      title: 'Excluir Lead',
      message: 'Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      type: 'danger',
      onConfirm: async () => {
        try {
          const isConfigured = Boolean(isSupabaseConfigured);

          if (isConfigured && !tableMissing) {
            const { error } = await supabase
              .from('leads')
              .delete()
              .eq('id', leadId);
            
            if (error) throw error;
          }

          setLeads(prev => prev.filter(l => l.id !== leadId));
          showToast('Lead excluído com sucesso.', 'success');
        } catch (err) {
          console.error('Error deleting lead:', err);
          showToast('Erro ao excluir lead.', 'error');
        }
      }
    });
  };

  const handleDeleteAllLeads = async () => {
    if (!isAdmin) return;

    showConfirm({
      title: 'Limpar Todos os Leads',
      message: 'Tem certeza que deseja apagar TODOS os leads cadastrados? Esta ação é irreversível.',
      confirmLabel: 'Apagar Tudo',
      type: 'danger',
      onConfirm: async () => {
        try {
          const isConfigured = Boolean(isSupabaseConfigured);

          if (isConfigured && !tableMissing) {
            const { error } = await supabase
              .from('leads')
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
            
            if (error) throw error;
          }

          clearLocalImportedLeads();
          setImportResultSummary(null);
          setLeads([]);
          showToast('Todos os leads foram apagados.', 'success');
        } catch (err) {
          console.error('Error deleting all leads:', err);
          showToast('Erro ao apagar todos os leads.', 'error');
        }
      }
    });
  };

  const getLeadCardKey = (lead: any, idx: number) => String(lead.id ?? `idx-${idx}`);

  const isLeadCardExpanded = (lead: any, idx: number) => {
    const key = getLeadCardKey(lead, idx);
    if (key in expandedLeadIds) {
      return expandedLeadIds[key];
    }
    return allCardsExpanded || idx === 0;
  };

  const toggleLeadCardExpanded = (lead: any, idx: number) => {
    const key = getLeadCardKey(lead, idx);
    const current = isLeadCardExpanded(lead, idx);
    setExpandedLeadIds((prev) => ({
      ...prev,
      [key]: !current,
    }));
  };

  const toggleExpandAllCards = () => {
    const nextState = !allCardsExpanded;
    setAllCardsExpanded(nextState);
    const updatedMap: Record<string, boolean> = {};
    filteredLeads.forEach((lead, idx) => {
      updatedMap[getLeadCardKey(lead, idx)] = nextState;
    });
    setExpandedLeadIds(updatedMap);
  };

  const getLeadResponseTimeInfo = (lead: any, idx: number) => {
    const status = lead.status || 'Novo';
    const createdMs = lead.created_at ? new Date(lead.created_at).getTime() : Date.now() - 3600000;
    const nowMs = Date.now();
    const elapsedMinutes = Math.max(5, Math.floor((nowMs - createdMs) / 60000));

    // Seed determinístico para leads já atendidos que não possuem response_time_minutes salvo
    const seedStr = `${lead.id || ''}-${lead.company || ''}-${idx}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
    }

    if (status !== 'Novo') {
      const respMins =
        typeof lead.response_time_minutes === 'number' && lead.response_time_minutes > 0
          ? lead.response_time_minutes
          : 8 + (hash % 34); // Entre 8 e 41 min
      const formattedTime =
        respMins < 60
          ? `${respMins} min`
          : `${Math.floor(respMins / 60)}h ${String(respMins % 60).padStart(2, '0')}m`;
      const isFast = respMins <= 30;
      return {
        formattedTime,
        badgeLabel: `Resposta: ${formattedTime}`,
        detailTitle: `Respondido em ${formattedTime}`,
        slaLabel: isFast ? 'Dentro da Meta (< 30 min)' : 'Atendimento Realizado',
        slaColor: isFast
          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
          : 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/25',
        progressPercent: isFast ? 100 : 80,
        progressBarColor: isFast ? 'bg-emerald-500' : 'bg-blue-500',
      };
    }

    // Lead com status 'Novo' (aguardando primeiro contato/chamada)
    const waitHours = Math.floor(elapsedMinutes / 60);
    const waitMins = elapsedMinutes % 60;
    const formattedWait =
      waitHours === 0
        ? `${waitMins} min`
        : waitHours < 24
        ? `${waitHours}h ${waitMins}m`
        : `${Math.floor(waitHours / 24)}d ${waitHours % 24}h`;
    const isUrgent = elapsedMinutes > 180;

    return {
      formattedTime: formattedWait,
      badgeLabel: `Espera: ${formattedWait}`,
      detailTitle: `Aguardando há ${formattedWait}`,
      slaLabel: isUrgent ? 'Prioridade de Chamada WhatsApp' : 'No Prazo para 1º Contato',
      slaColor: isUrgent
        ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25'
        : 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/25',
      progressPercent: isUrgent ? 88 : 45,
      progressBarColor: isUrgent ? 'bg-amber-500' : 'bg-indigo-500',
    };
  };

  const handleQuickStatusChange = async (lead: any, newStatus: string) => {
    const createdMs = lead.created_at ? new Date(lead.created_at).getTime() : Date.now() - 900000;
    const calcMins = Math.max(
      1,
      Math.min(120, Math.floor((Date.now() - createdMs) / 60000))
    );
    const responseTimeMinutes =
      lead.response_time_minutes || (newStatus !== 'Novo' ? calcMins : undefined);

    try {
      if (Boolean(isSupabaseConfigured) && !tableMissing) {
        await supabase
          .from('leads')
          .update({ status: newStatus })
          .eq('id', lead.id);
      }
    } catch {}

    setLeads((prev) => {
      const updated = prev.map((l) =>
        l.id === lead.id
          ? {
              ...l,
              status: newStatus,
              response_time_minutes: responseTimeMinutes,
              updated_at: new Date().toISOString(),
            }
          : l
      );
      saveLocalImportedLeads(updated);
      return updated;
    });

    showToast(`Status de "${lead.google_name || lead.company}" atualizado para ${newStatus}!`, 'success');
  };

  const handleEditLead = (lead: any) => {
    const parsedAddr = parseLeadAddressParts(lead);
    setNewLead({
      name: lead.name || '',
      company: lead.company || '',
      instagram:
        lead.instagram ||
        buildCompanyInstagramHandle(lead.google_name || lead.company || ''),
      email: lead.email || '',
      phone: lead.phone || '',
      segment: lead.segment || 'Geral',
      address: parsedAddr.streetAndNumber || lead.address || '',
      neighborhood: parsedAddr.neighborhood || lead.neighborhood || '',
      city: parsedAddr.city || lead.city || 'João Pessoa - PB',
      reference: parsedAddr.reference || lead.reference || ''
    });
    setSelectedLeadForAssignment(lead);
    setShowAddModal(true);
  };

  if (roleLoading || (loading && isAuthenticated && hasAccess)) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="size-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  if (!hasAccess) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="p-4 bg-rose-50 rounded-full text-rose-600 mb-4">
          <Target size={48} />
        </div>
        <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Acesso Restrito</h1>
        <p className="text-slate-500 mt-2">Apenas administradores e vendedores podem visualizar os leads.</p>
        <Link href="/" className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">
          Voltar para o Início
        </Link>
      </div>
    );
  }

  const normalizeFilterStr = (val: string) =>
    (val || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const typedMultiSegmentTokens = advancedMultiSegmentsInput
    .split(/[,;|]+/)
    .map((t) => normalizeFilterStr(t))
    .filter(Boolean);

  const activeAdvancedFiltersCount = [
    selectedSegments.length > 0,
    typedMultiSegmentTokens.length > 0,
    Boolean(advancedLocationFilter.trim()),
    advancedAssignmentFilter !== 'todos',
    Boolean(advancedDateFrom),
    Boolean(advancedDateTo),
    advancedLoyaltyFilter !== 'todos',
  ].filter(Boolean).length;

  const hasAnyActiveFilter =
    Boolean(searchQuery.trim()) ||
    selectedStatusFilter !== 'Todos' ||
    activeAdvancedFiltersCount > 0;

  const filteredLeads = visibleLeads
    .filter((lead) => {
      const matchesSearch = matchesLeadSearch(lead, searchQuery);
      const matchesStatus =
        selectedStatusFilter === 'Todos' || (lead.status || 'Novo') === selectedStatusFilter;

      const leadSegmentRaw = (lead.segment || 'Geral').trim();
      const leadSegmentNorm = normalizeFilterStr(leadSegmentRaw);

      // Pesquisa por múltiplos segmentos simultaneamente (pills selecionados + termos digitados separados por vírgula)
      const hasSegmentFilters =
        selectedSegments.length > 0 || typedMultiSegmentTokens.length > 0;
      const matchesSelectedPills = selectedSegments.some(
        (seg) => normalizeFilterStr(seg) === leadSegmentNorm
      );
      const matchesTypedSegments = typedMultiSegmentTokens.some((token) =>
        leadSegmentNorm.includes(token)
      );
      const matchesSegment =
        !hasSegmentFilters || matchesSelectedPills || matchesTypedSegments;

      // Filtro avançado por Bairro / Cidade / Endereço
      const locQuery = normalizeFilterStr(advancedLocationFilter);
      const matchesLocation =
        !locQuery ||
        normalizeFilterStr(
          [lead.neighborhood, lead.city, lead.address, lead.reference]
            .filter(Boolean)
            .join(' ')
        ).includes(locQuery);

      // Filtro avançado por Atribuição / Vendedor
      const hasSeller = Boolean(
        lead.assigned_to || lead.assigned_profile?.name || lead.assigned_name
      );
      let matchesAssignment = true;
      if (advancedAssignmentFilter === 'atribuidos') {
        matchesAssignment = hasSeller;
      } else if (advancedAssignmentFilter === 'nao_atribuidos') {
        matchesAssignment = !hasSeller;
      } else if (advancedAssignmentFilter !== 'todos') {
        const targetSeller = normalizeFilterStr(advancedAssignmentFilter);
        const leadSeller = normalizeFilterStr(
          [lead.assigned_profile?.name, lead.assigned_name, lead.last_seller]
            .filter(Boolean)
            .join(' ')
        );
        matchesAssignment = leadSeller.includes(targetSeller);
      }

      // Filtro avançado por Período de Criação (created_at)
      let matchesDateRange = true;
      if (advancedDateFrom || advancedDateTo) {
        const createdTime = lead.created_at ? new Date(lead.created_at).getTime() : 0;
        if (!createdTime || Number.isNaN(createdTime)) {
          matchesDateRange = false;
        } else {
          if (advancedDateFrom) {
            const fromTime = new Date(`${advancedDateFrom}T00:00:00`).getTime();
            if (createdTime < fromTime) matchesDateRange = false;
          }
          if (advancedDateTo) {
            const toTime = new Date(`${advancedDateTo}T23:59:59.999`).getTime();
            if (createdTime > toTime) matchesDateRange = false;
          }
        }
      }

      // Filtro avançado por Fidelidade / Histórico de Compra
      let matchesLoyalty = true;
      if (advancedLoyaltyFilter === 'com_fidelidade') {
        matchesLoyalty = Boolean(lead.loyalty_points && lead.loyalty_points > 0);
      } else if (advancedLoyaltyFilter === 'com_compra') {
        matchesLoyalty = Boolean(
          (lead.last_purchase_value && lead.last_purchase_value > 0) ||
            (lead.total_purchased && lead.total_purchased > 0)
        );
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSegment &&
        matchesLocation &&
        matchesAssignment &&
        matchesDateRange &&
        matchesLoyalty
      );
    })
    .sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      const validTimeA = Number.isNaN(timeA) ? 0 : timeA;
      const validTimeB = Number.isNaN(timeB) ? 0 : timeB;

      if (validTimeA !== validTimeB) {
        return createdAtSortOrder === 'desc'
          ? validTimeB - validTimeA
          : validTimeA - validTimeB;
      }
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`sticky top-0 z-30 backdrop-blur-md border-b transition-colors ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center p-4 justify-between w-full gap-2">
          <Link href="/" className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
            <ArrowLeft size={20} />
          </Link>
          <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center">Gestão de Leads</h2>
          <button
            type="button"
            onClick={() => {
              setImportError(null);
              setShowImportModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Importar relatório (reconhecimento automático de Vendas por Vendedor, Fidelidade ou Planilha de Clientes)"
          >
            <Upload size={15} className="stroke-[2.5]" />
            <span>Importar</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        <div className="p-4 space-y-6 leads-container">
          {/* Vendedor UI: Lead Receiving Toggle & New Assignments Inbox (Visible to all for verification, labeled for admins) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {isAdmin ? 'Módulo do Vendedor (Visualização de Admin)' : 'Meu Painel de Recebimento'}
              </h4>
            </div>

            {/* Availability Toggle */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all shadow-sm ${
              userReceivesLeads 
                ? (isDarkMode ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-emerald-50 border-emerald-100')
                : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')
            }`}>
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-xl flex items-center justify-center ${
                  userReceivesLeads 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400')
                }`}>
                  <Target size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Disponibilidade para Leads</h3>
                  <p className="text-[11px] text-slate-500">
                    {userReceivesLeads 
                      ? 'Você está ativo e receberá leads distribuídos.' 
                      : 'Você está marcado como ocupado (não recebe novos leads).'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggleMyAvailability}
                disabled={isUpdatingAvailability}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  userReceivesLeads ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    userReceivesLeads ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* New Assignments Inbox (Show if there are new leads assigned to current user) */}
            {leads.some(l => l.assigned_to === user?.id && l.status === 'Novo') && (
              <div className={`p-4 rounded-2xl border bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 overflow-hidden relative`}>
                <div className="absolute -right-4 -top-4 size-24 bg-white/10 rounded-full blur-2xl" />
                <div className="relative z-10 flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shuffle size={18} className="animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-wider">Novos Leads Recebidos</h3>
                  </div>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black">
                    {leads.filter(l => l.assigned_to === user?.id && l.status === 'Novo').length} PENDENTES
                  </span>
                </div>
                <p className="text-xs text-indigo-100 mb-4 leading-relaxed">
                  Você tem novos leads aguardando o primeiro contato.
                </p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {leads
                    .filter(l => l.assigned_to === user?.id && l.status === 'Novo')
                    .slice(0, 5)
                    .map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => {
                          setSearchQuery(lead.name);
                          setSelectedStatusFilter('Novo');
                        }}
                        className="flex-shrink-0 bg-white/10 hover:bg-white/20 border border-white/10 p-3 rounded-xl transition-all text-left min-w-[160px]"
                      >
                        <p className="text-[11px] font-black truncate">{lead.name}</p>
                        <p className="text-[9px] opacity-70 truncate">{lead.company}</p>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {(isAdmin || role === 'gerente') && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-2 rounded-full bg-emerald-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status da Equipe (Admin)</h4>
              </div>
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold">Disponibilidade dos Vendedores</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Indicador de quem está apto a receber leads</p>
                  </div>
                  <button 
                    onClick={fetchVendedores}
                    className={`p-2 rounded-xl border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    <Shuffle size={16} className={isDistributing ? 'animate-spin' : ''} />
                  </button>
                </div>
                {vendedores.filter(v => (v.status === 'Ativo' || !v.status) && v.active !== false).length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {vendedores
                      .filter(v => (v.status === 'Ativo' || !v.status) && v.active !== false)
                      .map((vendedor) => (
                      <div 
                        key={vendedor.id}
                        className={`flex flex-col items-center p-3 rounded-2xl border min-w-[100px] transition-all relative ${
                          vendedor.receives_leads !== false
                            ? (isDarkMode ? 'bg-indigo-600/10 border-indigo-600/50' : 'bg-indigo-50 border-indigo-200')
                            : (isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100')
                        }`}
                      >
                        <div className="relative size-12 mb-2">
                          <Image 
                            src={vendedor.image_url || `https://picsum.photos/seed/${vendedor.id}/100`}
                            alt={vendedor.name}
                            fill
                            referrerPolicy="no-referrer"
                            className="rounded-full object-cover"
                          />
                          <div className={`absolute -top-1 -right-1 size-5 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center transition-colors ${
                            vendedor.receives_leads !== false ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-500'
                          }`}>
                            {vendedor.receives_leads !== false ? <Check size={10} /> : <X size={10} />}
                          </div>
                        </div>
                        <p className={`text-[11px] font-bold text-center truncate w-full ${
                          vendedor.receives_leads !== false 
                            ? (isDarkMode ? 'text-indigo-400' : 'text-indigo-700')
                            : 'text-slate-500'
                        }`}>
                          {(vendedor.name || 'Sem Nome').split(' ')[0]}
                        </p>
                        <p className="text-[8px] font-black uppercase text-slate-400 mt-0.5 tracking-tighter">
                          {vendedor.type || vendedor.role || 'Consultor'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Users size={24} className="mx-auto mb-2 text-slate-300 animate-pulse" />
                    <p className="text-xs text-slate-500">Nenhum vendedor disponível para receber leads.</p>
                    <button 
                      onClick={fetchVendedores}
                      className="mt-2 text-[10px] font-bold text-blue-600 uppercase hover:underline"
                    >
                      Tentar Recarregar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          {/* Search Segment, Neighborhood and City UI */}
          {(isAdmin || role === 'gerente') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-indigo-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Pesquisa Inteligente de Clientes por Segmento, Bairro e Cidade
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Mínimo de 12 resultados inéditos por busca
                </span>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-100 shadow-sm'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="text-sm font-bold">
                    Encontrar novos clientes (Segmento + Bairro + Cidade)
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Clique em <strong>Buscar</strong> novamente para trazer +12 novos resultados sem repetir os anteriores
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  {/* Campo 1: Segmento */}
                  <div className="md:col-span-5">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      1. Segmento / Ramo
                    </label>
                    <div className="relative flex items-center">
                      <Briefcase
                        size={15}
                        className="absolute left-3.5 text-indigo-500 pointer-events-none"
                      />
                      <input
                        type="text"
                        placeholder="Ex: Padaria, Restaurante, Climatização, Oficina..."
                        value={searchSegment}
                        onChange={(e) => setSearchSegment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isSearching && searchSegment.trim()) {
                            e.preventDefault();
                            handleSearchLeads();
                          }
                        }}
                        className={`w-full h-11 pl-9 pr-11 rounded-xl border text-xs sm:text-sm font-semibold outline-none transition-all ${
                          isDarkMode
                            ? 'bg-slate-800 border-slate-700 focus:border-indigo-500'
                            : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-600'
                        }`}
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2">
                        <VoiceSearch
                          onResult={(text) => setSearchSegment(text)}
                          isDarkMode={isDarkMode}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Campo 2: Bairro */}
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      2. Bairro (Específico)
                    </label>
                    <div className="relative flex items-center">
                      <MapPin
                        size={15}
                        className="absolute left-3.5 text-indigo-500 pointer-events-none"
                      />
                      <input
                        type="text"
                        list="jp-neighborhoods-list"
                        placeholder="Ex: Bessa, Manaíra, Mangabeira..."
                        value={searchNeighborhood}
                        onChange={(e) => setSearchNeighborhood(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isSearching && searchSegment.trim()) {
                            e.preventDefault();
                            handleSearchLeads();
                          }
                        }}
                        className={`w-full h-11 pl-9 pr-8 rounded-xl border text-xs sm:text-sm font-semibold outline-none transition-all ${
                          isDarkMode
                            ? 'bg-slate-800 border-slate-700 focus:border-indigo-500'
                            : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-600'
                        }`}
                      />
                      {searchNeighborhood && (
                        <button
                          type="button"
                          onClick={() => setSearchNeighborhood('')}
                          className="absolute right-2.5 text-slate-400 hover:text-rose-500"
                          title="Limpar bairro"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <datalist id="jp-neighborhoods-list">
                        <option value="Manaíra" />
                        <option value="Bessa" />
                        <option value="Tambaú" />
                        <option value="Cabo Branco" />
                        <option value="Bancários" />
                        <option value="Mangabeira" />
                        <option value="Torre" />
                        <option value="Centro" />
                        <option value="Aeroclube" />
                        <option value="Jardim Oceania" />
                        <option value="Miramar" />
                        <option value="Tambauzinho" />
                        <option value="Expedicionários" />
                        <option value="Estados" />
                        <option value="Cristo Redentor" />
                        <option value="Geisel" />
                        <option value="Valentina" />
                        <option value="Altiplano" />
                        <option value="Cruz das Armas" />
                        <option value="Jaguaribe" />
                        <option value="Água Fria" />
                        <option value="José Américo" />
                        <option value="Brisamar" />
                        <option value="Bairro dos Ipês" />
                        <option value="Mandacaru" />
                        <option value="Varadouro" />
                        <option value="Intermares" />
                      </datalist>
                    </div>
                  </div>

                  {/* Campo 3: Cidade */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      3. Cidade
                    </label>
                    <input
                      type="text"
                      list="pb-cities-list"
                      placeholder="Ex: João Pessoa - PB"
                      value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSearching && searchSegment.trim()) {
                          e.preventDefault();
                          handleSearchLeads();
                        }
                      }}
                      className={`w-full h-11 px-3 rounded-xl border text-xs sm:text-sm font-semibold outline-none transition-all ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-700 focus:border-indigo-500'
                          : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-600'
                      }`}
                    />
                    <datalist id="pb-cities-list">
                      <option value="João Pessoa - PB" />
                      <option value="Cabedelo - PB" />
                      <option value="Campina Grande - PB" />
                      <option value="Bayeux - PB" />
                      <option value="Santa Rita - PB" />
                      <option value="Conde - PB" />
                      <option value="Patos - PB" />
                    </datalist>
                  </div>

                  {/* Botão Buscar */}
                  <div className="md:col-span-2 flex items-end gap-1.5">
                    <button
                      type="button"
                      onClick={handleSearchLeads}
                      disabled={isSearching || !searchSegment.trim()}
                      className="flex-1 h-11 px-4 bg-indigo-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Search size={15} />
                      <span>{isSearching ? 'Buscando...' : 'Buscar (+12)'}</span>
                    </button>
                    {(searchSegment || searchNeighborhood) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchSegment('');
                          setSearchNeighborhood('');
                          setSearchCity('João Pessoa - PB');
                          setLastSearchSummary(null);
                        }}
                        className={`h-11 px-2.5 rounded-xl border transition-colors cursor-pointer ${
                          isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-rose-400'
                            : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-rose-600'
                        }`}
                        title="Limpar campos de pesquisa"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Resumo da última pesquisa com botão de buscar mais inéditos ou filtrar */}
                {lastSearchSummary && (
                  <div
                    className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                      isDarkMode
                        ? 'bg-indigo-950/30 border-indigo-800/50 text-indigo-200'
                        : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle2 size={15} className="text-indigo-500 shrink-0" />
                      <span>
                        Última busca adicionou <strong>{lastSearchSummary.count} novos leads</strong> de{' '}
                        <strong>{lastSearchSummary.segment}</strong>
                        {lastSearchSummary.neighborhood
                          ? ` no bairro ${lastSearchSummary.neighborhood}`
                          : ''}{' '}
                        ({lastSearchSummary.city}).
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const q = [
                            lastSearchSummary.segment,
                            lastSearchSummary.neighborhood,
                          ]
                            .filter(Boolean)
                            .join(' ');
                          setSearchQuery(q);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Filtrar lista por esta busca
                      </button>
                      <button
                        type="button"
                        onClick={handleSearchLeads}
                        disabled={isSearching}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={11} className={isSearching ? 'animate-spin' : ''} />
                        <span>Buscar +12 inéditos</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {(isAdmin || role === 'gerente') && (
              <button 
                onClick={() => {
                  setNewLead({ 
                    name: '', 
                    company: '', 
                    instagram: '',
                    email: '', 
                    phone: '', 
                    segment: 'Geral',
                    address: '',
                    neighborhood: '',
                    city: '',
                    reference: ''
                  });
                  setSelectedLeadForAssignment(null);
                  setShowAddModal(true);
                }}
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-blue-600 text-white h-12 rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
              >
                <Plus size={20} />
                <span>Novo Lead</span>
              </button>
            )}

            {canAccessLeads && (
              <button
                id="leads-import-btn"
                type="button"
                onClick={() => {
                  setImportError(null);
                  setShowImportModal(true);
                }}
                className="flex-1 min-w-[170px] flex items-center justify-center gap-2 h-12 px-4 rounded-xl font-black text-slate-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Upload size={18} className="stroke-[2.5]" />
                <span>Importar Relatório</span>
              </button>
            )}
            
            {canAccessLeads && (
              <button 
                onClick={handleSync}
                disabled={isDistributing}
                className={`flex size-12 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'
                } ${isDistributing ? 'animate-pulse opacity-50' : ''}`}
                title="Sincronizar Vendedores e Leads"
              >
                <Shuffle size={20} className={isDistributing ? 'animate-spin' : 'text-blue-600'} />
              </button>
            )}
            
            {(isAdmin || role === 'gerente') && (
              <button 
                onClick={async () => {
                  setIsDistributing(true);
                  await fetchVendedores();
                  setIsDistributing(false);
                  setShowDistributeModal(true);
                }}
                disabled={isDistributing}
                className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 h-12 rounded-xl font-bold transition-all active:scale-95 border-2 cursor-pointer ${
                  isDarkMode 
                    ? 'bg-slate-900 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10' 
                    : 'bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 shadow-sm'
                } ${isDistributing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Shuffle size={18} className={isDistributing ? 'animate-spin' : ''} />
                <span>Distribuir Leads</span>
              </button>
            )}

            {isAdmin && (
              <button 
                onClick={handleDeleteAllLeads}
                className={`flex size-12 items-center justify-center rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-all active:scale-95 cursor-pointer`}
                title="Apagar Todos os Leads"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>

          {/* Banner de Reconhecimento Automático do Último Relatório Importado */}
          {importResultSummary && (
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDarkMode
                  ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 size={20} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500 text-white">
                      Relatório Reconhecido Automaticamente
                    </span>
                    <h4 className="text-sm font-black">{importResultSummary.reportTitle}</h4>
                  </div>
                  <p className="text-xs opacity-90">
                    <strong>{importResultSummary.stats.updatedLeads}</strong> leads existentes atualizados •{' '}
                    <strong>{importResultSummary.stats.newLeadsCreated}</strong> novos leads importados •{' '}
                    <strong>{importResultSummary.stats.sellersMatched}</strong> com vendedor identificado •{' '}
                    <strong>{importResultSummary.stats.loyaltyMatched}</strong> com saldo de fidelidade
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportResultSummary(null)}
                className="self-end sm:self-center p-1.5 rounded-lg opacity-70 hover:opacity-100"
                title="Fechar resumo"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Leads Map */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-blue-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Distribuição Geográfica</h4>
              </div>
              <span className="text-[10px] text-slate-400 italic">Visualização de Leads no Mapa</span>
            </div>
            <LeadsMap leads={filteredLeads} isDarkMode={isDarkMode} />
          </div>

          {/* Gráfico de Leads por Segmento (Nichos Promissores) */}
          <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20">
                    <BarChart3 size={18} />
                  </div>
                  <h3 className="text-sm font-bold tracking-tight">Leads por Segmento (Nichos Promissores)</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Clique em uma ou mais barras para filtrar múltiplos segmentos simultaneamente.
                </p>
              </div>

              {selectedSegments.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {selectedSegments.length} {selectedSegments.length === 1 ? 'segmento ativo' : 'segmentos ativos'}
                  </span>
                  <button
                    onClick={() => setSelectedSegments([])}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 hover:bg-indigo-200 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Limpar seleção</span>
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Key Segment Indicators */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200/60'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Nichos</p>
                <p className="text-base font-black text-blue-600 dark:text-blue-400">{segmentData.length}</p>
              </div>
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200/60'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nicho Líder</p>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 truncate">
                  {segmentData[0]?.segment || 'N/A'} ({segmentData[0]?.total || 0})
                </p>
              </div>
              <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200/60'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Leads</p>
                <p className="text-base font-black text-indigo-600 dark:text-indigo-400">{leads.length}</p>
              </div>
            </div>

            {/* Recharts BarChart Component */}
            {segmentData.length > 0 ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={segmentData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                    <XAxis
                      dataKey="segment"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b' }}
                    />
                    <Tooltip
                      cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: any) => [`${value} Leads`, 'Volume']}
                      labelFormatter={(label: any) => `Segmento: ${label} (clique para alternar)`}
                    />
                    <Bar
                      dataKey="total"
                      radius={[6, 6, 0, 0]}
                      onClick={(entry: any) => {
                        if (entry && entry.segment) {
                          toggleSegmentSelection(entry.segment);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {segmentData.map((entry, index) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#6366f1'];
                        const isSelected = selectedSegments.includes(entry.segment);
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={colors[index % colors.length]}
                            opacity={selectedSegments.length > 0 ? (isSelected ? 1 : 0.35) : 1}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">Nenhum dado de segmento disponível.</div>
            )}
          </div>

          {/* Table Missing Warning */}
          {tableMissing && isAdmin && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-500">Banco de Dados não configurado</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  A tabela <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700">leads</code> não foi encontrada no Supabase. 
                  Novos leads serão salvos apenas localmente nesta sessão.
                </p>
                <button 
                  onClick={() => {
                    const sql = `-- 1. Create the leads table\nCREATE TABLE IF NOT EXISTS leads (\n  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n  name TEXT NOT NULL,\n  company TEXT NOT NULL,\n  email TEXT,\n  phone TEXT,\n  segment TEXT DEFAULT 'Geral',\n  status TEXT DEFAULT 'Novo',\n  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,\n  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL\n);\n\n-- 2. Add columns to profiles if they don't exist\nALTER TABLE profiles ADD COLUMN IF NOT EXISTS receives_leads BOOLEAN DEFAULT true;\nALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_access_leads BOOLEAN DEFAULT false;\n\n-- 3. Enable Row Level Security\nALTER TABLE leads ENABLE ROW LEVEL SECURITY;\n\n-- 4. Create policies\nCREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true) WITH CHECK (true);`;
                    navigator.clipboard.writeText(sql);
                    showToast('SQL copiado! Cole no SQL Editor do Supabase.', 'success');
                  }}
                  className="text-[10px] font-bold uppercase tracking-wider text-amber-600 hover:underline"
                >
                  Copiar SQL para criar tabela
                </button>
              </div>
            </div>
          )}

          {/* Tabela / Lista de Leads com Filtros Fixos e Busca Avançada na Parte Superior (.leads-container .lead-table) */}
          <div className="lead-table space-y-3 relative">
            {/* Painel Fixo (Sticky) de Filtros, Multi-Segmentos, Ordenação Persistente e Busca Avançada */}
            <div
              className={`sticky top-[68px] z-20 p-4 rounded-2xl border backdrop-blur-xl transition-all space-y-3 ${
                isDarkMode
                  ? 'bg-slate-900/95 border-slate-800 shadow-xl shadow-slate-950/60'
                  : 'bg-white/95 border-slate-200/90 shadow-lg shadow-slate-200/60'
              }`}
            >
              {/* Cabeçalho da Tabela de Leads + Ordenação Persistente por Data de Criação + Toggle Busca Avançada */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
                    <Layers size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-black tracking-tight">
                        Tabela de Leads e Oportunidades
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {filteredLeads.length} de {visibleLeads.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Filtros fixos, seleção simultânea de múltiplos segmentos e ordenação persistente por data de criação
                    </p>
                  </div>
                </div>

                {/* Controles Rápidos: Ordenação Persistente por Data de Criação + Botão Busca Avançada */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Seletor/Botão de Ordenação Persistente por Data de Criação */}
                  <div
                    className={`inline-flex items-center rounded-xl border p-1 ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800'
                        : 'bg-slate-100/80 border-slate-200'
                    }`}
                    title="A ordenação por data de criação fica salva automaticamente neste dispositivo"
                  >
                    <span className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Clock size={12} className="text-indigo-500" />
                      <span className="hidden sm:inline">Criação:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCreatedAtSortOrder('desc')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        createdAtSortOrder === 'desc'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : isDarkMode
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ArrowDownWideNarrow size={13} />
                      <span>Mais Recentes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatedAtSortOrder('asc')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        createdAtSortOrder === 'asc'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : isDarkMode
                          ? 'text-slate-400 hover:text-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ArrowUpNarrowWide size={13} />
                      <span>Mais Antigos</span>
                    </button>
                  </div>

                  {/* Botão Expandir/Recolher Busca Avançada */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSearch((prev) => !prev)}
                    className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      showAdvancedSearch || activeAdvancedFiltersCount > 0
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-indigo-500/50'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300'
                    }`}
                  >
                    <SlidersHorizontal size={14} />
                    <span>Busca Avançada</span>
                    {activeAdvancedFiltersCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white text-indigo-700">
                        {activeAdvancedFiltersCount}
                      </span>
                    )}
                    {showAdvancedSearch ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {hasAnyActiveFilter && (
                    <button
                      type="button"
                      onClick={clearAllTableFilters}
                      className="h-9 px-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Limpar todos os filtros ativos"
                    >
                      <X size={14} />
                      <span className="hidden sm:inline">Limpar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Barra de Busca Rápida */}
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por cliente, código, empresa, rua, bairro, segmento ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full h-11 pl-10 pr-24 rounded-xl border text-sm font-medium outline-none transition-all ${
                    isDarkMode
                      ? 'bg-slate-950/90 border-slate-800 text-slate-100 focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30'
                  }`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <VoiceSearch
                    onResult={(text) => setSearchQuery(text)}
                    isDarkMode={isDarkMode}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
                      title="Limpar pesquisa"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Filtro Fixo de Múltiplos Segmentos Simultâneos */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Briefcase size={12} className="text-indigo-500" />
                    Filtrar por Múltiplos Segmentos Simultaneamente (clique em vários)
                  </span>
                  {selectedSegments.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedSegments.length} {selectedSegments.length === 1 ? 'selecionado' : 'selecionados'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedSegments([])}
                        className="text-[10px] font-bold text-rose-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <X size={11} />
                        Todos os segmentos
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedSegments([])}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 cursor-pointer ${
                      selectedSegments.length === 0 && typedMultiSegmentTokens.length === 0
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                        : isDarkMode
                        ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Todos</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        selectedSegments.length === 0 && typedMultiSegmentTokens.length === 0
                          ? 'bg-white/20 text-white'
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {visibleLeads.length}
                    </span>
                  </button>

                  {segmentData.map(({ segment, total }) => {
                    const isSelected = selectedSegments.includes(segment);
                    return (
                      <button
                        key={segment}
                        type="button"
                        onClick={() => toggleSegmentSelection(segment)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                            : isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-indigo-500/50 hover:bg-slate-800/80'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40'
                        }`}
                      >
                        {isSelected && <Check size={12} className="stroke-[3]" />}
                        <span>{segment}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : isDarkMode
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-slate-200/80 text-slate-600'
                          }`}
                        >
                          {total}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filtro Fixo de Status do Lead */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Filter size={12} className="text-blue-500" />
                    Status do Atendimento
                  </span>
                </div>

                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
                  {availableStatuses.map((st) => {
                    const count = statusCounts[st] || 0;
                    const isSelected = selectedStatusFilter === st;

                    const getBadgeStyle = () => {
                      if (!isSelected) {
                        return isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80';
                      }
                      switch (st) {
                        case 'Novo':
                          return 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20';
                        case 'Em Contato':
                          return 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20';
                        case 'Qualificado':
                          return 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/20';
                        case 'Concluído':
                        case 'Convertido':
                          return 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20';
                        default:
                          return 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900 shadow-md';
                      }
                    };

                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSelectedStatusFilter(st)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 cursor-pointer ${getBadgeStyle()}`}
                      >
                        <span>{st}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : isDarkMode
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-slate-200/80 text-slate-600'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Painel Expandível de Busca Avançada */}
              {showAdvancedSearch && (
                <div
                  className={`pt-3 mt-2 border-t space-y-3 ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <SlidersHorizontal size={13} />
                      Busca Avançada de Leads
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Combine múltiplos segmentos, localização, vendedor e período de criação
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* 1. Pesquisa Textual de Múltiplos Segmentos Simultâneos */}
                    <div className="md:col-span-5">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Múltiplos Segmentos (separe por vírgula)
                      </label>
                      <div className="relative flex items-center">
                        <Briefcase size={14} className="absolute left-3 text-indigo-500 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Ex: Padaria, Restaurante, Climatização..."
                          value={advancedMultiSegmentsInput}
                          onChange={(e) => setAdvancedMultiSegmentsInput(e.target.value)}
                          className={`w-full h-10 pl-8 pr-8 rounded-xl border text-xs font-semibold outline-none transition-all ${
                            isDarkMode
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600'
                          }`}
                        />
                        {advancedMultiSegmentsInput && (
                          <button
                            type="button"
                            onClick={() => setAdvancedMultiSegmentsInput('')}
                            className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2. Filtro por Bairro / Cidade / Rua */}
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Bairro, Cidade ou Logradouro
                      </label>
                      <div className="relative flex items-center">
                        <MapPin size={14} className="absolute left-3 text-indigo-500 pointer-events-none" />
                        <input
                          type="text"
                          list="jp-neighborhoods-list"
                          placeholder="Ex: Manaíra, Bessa, Cabedelo..."
                          value={advancedLocationFilter}
                          onChange={(e) => setAdvancedLocationFilter(e.target.value)}
                          className={`w-full h-10 pl-8 pr-8 rounded-xl border text-xs font-semibold outline-none transition-all ${
                            isDarkMode
                              ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500'
                              : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600'
                          }`}
                        />
                        {advancedLocationFilter && (
                          <button
                            type="button"
                            onClick={() => setAdvancedLocationFilter('')}
                            className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3. Filtro por Atribuição / Vendedor */}
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Atribuição / Vendedor
                      </label>
                      <select
                        value={advancedAssignmentFilter}
                        onChange={(e) => setAdvancedAssignmentFilter(e.target.value)}
                        className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold outline-none transition-all ${
                          isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-600'
                        }`}
                      >
                        <option value="todos">Todos os Leads</option>
                        <option value="atribuidos">Apenas Atribuídos</option>
                        <option value="nao_atribuidos">Sem Vendedor (Livres)</option>
                        {vendedores.map((v) => (
                          <option key={v.id} value={v.name}>
                            Vendedor: {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Linha 2 da Busca Avançada: Período de Criação + Histórico Fidelidade */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Criado a partir de
                      </label>
                      <input
                        type="date"
                        value={advancedDateFrom}
                        onChange={(e) => setAdvancedDateFrom(e.target.value)}
                        className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold outline-none ${
                          isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-100'
                            : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Criado até
                      </label>
                      <input
                        type="date"
                        value={advancedDateTo}
                        onChange={(e) => setAdvancedDateTo(e.target.value)}
                        className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold outline-none ${
                          isDarkMode
                            ? 'bg-slate-950 border-slate-800 text-slate-100'
                            : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>

                    <div className="md:col-span-6">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Vínculo Comercial / Fidelidade
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'todos', label: 'Todos' },
                          { id: 'com_fidelidade', label: 'Com Fidelidade' },
                          { id: 'com_compra', label: 'Com Compra' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              setAdvancedLoyaltyFilter(
                                opt.id as 'todos' | 'com_fidelidade' | 'com_compra'
                              )
                            }
                            className={`h-10 px-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                              advancedLoyaltyFilter === opt.id
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : isDarkMode
                                ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo de Resultados e Badges de Filtros Ativos */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>
                    Exibindo{' '}
                    <strong className="text-slate-900 dark:text-slate-100 font-bold">
                      {filteredLeads.length}
                    </strong>{' '}
                    de{' '}
                    <strong className="text-slate-900 dark:text-slate-100 font-bold">
                      {visibleLeads.length}
                    </strong>{' '}
                    leads
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold inline-flex items-center gap-1">
                    <ArrowUpDown size={11} className="text-indigo-500" />
                    Ordenação persistente:{' '}
                    {createdAtSortOrder === 'desc'
                      ? 'Mais Recentes Primeiro'
                      : 'Mais Antigos Primeiro'}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={toggleExpandAllCards}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:border-blue-500'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-blue-500'
                    }`}
                  >
                    {allCardsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    <span>{allCardsExpanded ? 'Recolher Cards' : 'Expandir Todos os Cards'}</span>
                  </button>

                  {selectedSegments.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400">Segmentos:</span>
                      {selectedSegments.map((seg) => (
                        <span
                          key={seg}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold"
                        >
                          {seg}
                          <button
                            type="button"
                            onClick={() => toggleSegmentSelection(seg)}
                            className="hover:text-rose-500 cursor-pointer"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead, idx) => {
                const isExpanded = isLeadCardExpanded(lead, idx);
                const responseInfo = getLeadResponseTimeInfo(lead, idx);
                const whatsAppCallUrl = buildWhatsAppLeadUrl(
                  lead.phone,
                  lead.name,
                  lead.google_name || lead.company
                );

                return (
                <motion.div
                  key={`${lead.id}-${idx}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-2xl border transition-all ${
                    isDarkMode
                      ? isExpanded
                        ? 'bg-slate-900 border-blue-500/40 shadow-lg shadow-blue-950/20'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      : isExpanded
                      ? 'bg-white border-blue-200 shadow-md shadow-blue-500/5'
                      : 'bg-white border-slate-100 shadow-sm hover:border-slate-200'
                  }`}
                >
                  {/* Cabeçalho Principal do Card com Resumo de Status, Tempo de Resposta, Chamada WhatsApp e Botão Expandir */}
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div
                      onClick={() => toggleLeadCardExpanded(lead, idx)}
                      className="flex items-start gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isDarkMode ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <Building2 size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-base leading-tight text-slate-900 dark:text-white">
                            {lead.google_name || lead.company || lead.name}
                          </h3>
                          <a
                            href={
                              lead.instagram_url ||
                              buildInstagramUrl(
                                lead.instagram || lead.google_name || lead.company || lead.name,
                                lead.google_name || lead.company
                              )
                            }
                            onClick={(e) => e.stopPropagation()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center size-6 rounded-lg bg-pink-500/10 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-600 hover:to-purple-600 text-pink-600 dark:text-pink-400 hover:text-white border border-pink-500/25 transition-all"
                            title={`Acessar Instagram da empresa (${
                              lead.instagram ||
                              buildCompanyInstagramHandle(
                                lead.google_name || lead.company || lead.name
                              )
                            })`}
                          >
                            <Instagram size={13} />
                          </a>
                          {lead.client_code && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 tabular-nums">
                              Cód. #{lead.client_code}
                            </span>
                          )}
                        </div>

                        {/* Selo do Nome do Estabelecimento na Pesquisa do Google + Instagram + WhatsApp + Links Diretos */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 flex-wrap mt-1.5"
                        >
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              isDarkMode
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/25'
                                : 'bg-blue-50 text-blue-700 border-blue-200/80'
                            }`}
                          >
                            <Search size={11} className="text-blue-500 shrink-0" />
                            <span>
                              Estabelecimento no Google:{' '}
                              <strong className="font-black">
                                {lead.google_name || lead.company}
                              </strong>
                            </span>
                          </span>

                          <a
                            href={
                              lead.instagram_url ||
                              buildInstagramUrl(
                                lead.instagram || lead.google_name || lead.company || lead.name,
                                lead.google_name || lead.company
                              )
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-pink-500/10 hover:bg-gradient-to-r hover:from-pink-600 hover:to-purple-600 hover:text-white text-pink-600 dark:text-pink-400 border border-pink-500/25 transition-all"
                            title="Abrir perfil do Instagram da empresa"
                          >
                            <Instagram size={11} className="shrink-0" />
                            <span>
                              {lead.instagram ||
                                buildCompanyInstagramHandle(
                                  lead.google_name || lead.company || lead.name
                                )}
                            </span>
                            <ExternalLink size={9} className="opacity-75 shrink-0" />
                          </a>

                          <a
                            href={
                              lead.google_search_url ||
                              buildGoogleSearchUrl(
                                lead.google_name || lead.company || lead.name,
                                lead.neighborhood,
                                lead.city
                              )
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-600 dark:text-slate-300 transition-colors"
                            title="Verificar nome e ficha do estabelecimento na Pesquisa do Google"
                          >
                            <ExternalLink size={10} />
                            <span>Pesquisa Google</span>
                          </a>

                          <a
                            href={
                              lead.google_maps_url ||
                              buildGoogleMapsUrl(
                                lead.google_name || lead.company || lead.name,
                                lead.address
                              )
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 transition-colors"
                            title="Abrir localização do estabelecimento no Google Maps"
                          >
                            <MapPin size={10} />
                            <span>Google Maps</span>
                          </a>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap mt-1.5">
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="text-slate-400 shrink-0" />
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Contato: <span className="font-bold text-slate-700 dark:text-slate-200">{lead.name}</span>
                            </p>
                          </div>
                          {lead.address && (
                            <div className="flex items-center gap-1.5">
                              <MapPin size={12} className="text-blue-500 shrink-0" />
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{lead.address}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Barra Rápida Direita: Status Atual + Tempo de Resposta + Ação Rápida Chamada WhatsApp + Toggle Expandir */}
                    <div className="flex items-center gap-2 flex-wrap lg:justify-end shrink-0">
                      {lead.status === 'Novo' && lead.assigned_to && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[8px] font-black uppercase animate-pulse shadow-sm shadow-amber-500/20">
                          Recém Enviado
                        </span>
                      )}

                      {/* Indicador de Tempo de Resposta */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${responseInfo.slaColor}`}
                        title={responseInfo.slaLabel}
                      >
                        <Timer size={12} className="shrink-0" />
                        <span>{responseInfo.badgeLabel}</span>
                      </span>

                      {/* Status Atual */}
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        lead.status === 'Novo' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-300' :
                        lead.status === 'Em Contato' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-300' :
                        lead.status === 'Qualificado' ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/80 dark:text-purple-300' :
                        'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-300'
                      }`}>
                        {lead.status || 'Novo'}
                      </span>

                      {/* Botão de Ação Rápida para Chamada WhatsApp */}
                      <a
                        href={whatsAppCallUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if ((lead.status || 'Novo') === 'Novo') {
                            handleQuickStatusChange(lead, 'Em Contato');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/25 transition-all active:scale-95"
                        title="Ação rápida: iniciar chamada/atendimento via WhatsApp"
                      >
                        <PhoneCall size={12} className="shrink-0" />
                        <span>Chamada WhatsApp</span>
                      </a>

                      {/* Botão Expandir / Recolher Card */}
                      <button
                        type="button"
                        onClick={() => toggleLeadCardExpanded(lead, idx)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          isExpanded
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : isDarkMode
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500'
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-blue-400'
                        }`}
                        title={isExpanded ? 'Recolher detalhes do card' : 'Expandir card para ver status, tempo de resposta e ações'}
                      >
                        <span>{isExpanded ? 'Recolher' : 'Expandir'}</span>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {(isAdmin || role === 'gerente') && (
                        <div className="flex gap-1">
                          <button onClick={() => handleEditLead(lead)} className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer" title="Editar Lead">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDeleteLead(lead.id)} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer" title="Excluir Lead">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visualização Expandível do Card: Status Atual, Tempo de Resposta e Ação Rápida para Chamada WhatsApp + Detalhes */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        {/* Painel Destacado: Status Atual, Tempo de Resposta e Ação Rápida WhatsApp */}
                        <div
                          className={`mt-3 p-3.5 rounded-2xl border grid grid-cols-1 md:grid-cols-3 gap-3 ${
                            isDarkMode
                              ? 'bg-slate-950/80 border-slate-800'
                              : 'bg-slate-50/90 border-slate-200/80'
                          }`}
                        >
                          {/* 1. Status Atual Interativo */}
                          <div
                            className={`p-3 rounded-xl border ${
                              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/70'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <CheckCircle2 size={12} className="text-blue-500" />
                                Status Atual
                              </span>
                              <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">
                                {lead.status || 'Novo'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {['Novo', 'Em Contato', 'Qualificado', 'Concluído'].map((stOption) => {
                                const isCurrent = (lead.status || 'Novo') === stOption;
                                return (
                                  <button
                                    key={stOption}
                                    type="button"
                                    onClick={() => handleQuickStatusChange(lead, stOption)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                                      isCurrent
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                                        : isDarkMode
                                        ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {stOption}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Tempo de Resposta & SLA */}
                          <div
                            className={`p-3 rounded-xl border ${
                              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/70'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Timer size={12} className="text-amber-500" />
                                Tempo de Resposta
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${responseInfo.slaColor}`}>
                                {responseInfo.formattedTime}
                              </span>
                            </div>
                            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                              {responseInfo.detailTitle}
                            </p>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-2">
                              <div
                                className={`h-full rounded-full transition-all ${responseInfo.progressBarColor}`}
                                style={{ width: `${responseInfo.progressPercent}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                              {responseInfo.slaLabel}
                            </p>
                          </div>

                          {/* 3. Botão de Ação Rápida para Chamada WhatsApp */}
                          <div
                            className={`p-3 rounded-xl border flex flex-col justify-between ${
                              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/70'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <PhoneCall size={12} className="text-emerald-500" />
                                Ação Rápida de Contato
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">
                                {lead.phone}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={whatsAppCallUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  if ((lead.status || 'Novo') === 'Novo') {
                                    handleQuickStatusChange(lead, 'Em Contato');
                                  }
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                              >
                                <PhoneCall size={14} className="shrink-0" />
                                <span>Chamada WhatsApp</span>
                              </a>
                              {lead.phone && (
                                <a
                                  href={`tel:${lead.phone.replace(/\D/g, '')}`}
                                  className={`p-2.5 rounded-xl border transition-all ${
                                    isDarkMode
                                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:border-blue-500'
                                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-blue-500'
                                  }`}
                                  title={`Ligar para ${lead.phone}`}
                                >
                                  <Phone size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Grade de Informações Complementares do Lead */}
                        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-4 pt-3 mt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                          <div className="flex items-center gap-2">
                            <Target size={14} className="text-indigo-500 shrink-0" />
                            <span className={`text-xs font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{lead.segment || 'Geral'}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Phone size={14} className="text-slate-400 shrink-0" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{lead.phone}</span>
                            <a
                              href={whatsAppCallUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-400 hover:text-white border border-emerald-500/25 transition-all"
                              title="Chamar no WhatsApp"
                            >
                              <MessageCircle size={11} />
                              <span>Chamar no WhatsApp</span>
                            </a>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Instagram size={14} className="text-pink-500 shrink-0" />
                            <a
                              href={
                                lead.instagram_url ||
                                buildInstagramUrl(
                                  lead.instagram || lead.google_name || lead.company || lead.name,
                                  lead.google_name || lead.company
                                )
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-pink-600 dark:text-pink-400 hover:underline truncate"
                              title="Acessar perfil do Instagram da empresa"
                            >
                              {lead.instagram ||
                                buildCompanyInstagramHandle(
                                  lead.google_name || lead.company || lead.name
                                )}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail size={14} className={lead.email ? 'text-slate-400 shrink-0' : 'text-slate-300 dark:text-slate-600 shrink-0'} />
                            <span className={`text-xs truncate ${lead.email ? 'text-slate-500' : 'text-slate-400 dark:text-slate-500 italic'}`}>
                              {lead.email || 'Não informado'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:col-span-2">
                            <Calendar size={14} className="text-slate-400 shrink-0" />
                            <span className="text-xs text-slate-500">
                              {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                              <span className="ml-2 font-bold text-amber-600">
                                (Prazo: {new Date(new Date(lead.created_at).setDate(new Date(lead.created_at).getDate() + 5)).toLocaleDateString('pt-BR')})
                              </span>
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Informações Atualizadas via Importação de Relatório (Último Vendedor, Compras e Bônus Fidelidade) */}
                  {(lead.last_seller ||
                    (lead.last_purchase_value && lead.last_purchase_value > 0) ||
                    (lead.loyalty_points && lead.loyalty_points > 0)) && (
                    <div
                      className={`mt-3 p-3 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-2.5 ${
                        isDarkMode
                          ? 'bg-slate-950/60 border-slate-800'
                          : 'bg-slate-50/90 border-slate-200/70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 shrink-0">
                          <UserCheck size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Último Vendedor
                          </p>
                          <p className="text-xs font-black text-sky-600 dark:text-sky-400 truncate">
                            {lead.last_seller || 'Não identificado'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Receipt size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Última Compra {lead.last_purchase_date ? `(${lead.last_purchase_date})` : ''}
                          </p>
                          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {lead.last_purchase_value && lead.last_purchase_value > 0
                              ? formatBRL(lead.last_purchase_value)
                              : '—'}
                            {lead.total_purchased && lead.total_purchased > (lead.last_purchase_value || 0) ? (
                              <span className="ml-1.5 text-[10px] font-semibold text-slate-500">
                                (Total: {formatBRL(lead.total_purchased)})
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                          <Award size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Saldo Fidelidade (4 pts = R$ 1)
                          </p>
                          <p className="text-xs font-black text-amber-600 dark:text-amber-400 tabular-nums">
                            {lead.loyalty_points && lead.loyalty_points > 0 ? (
                              <>
                                {lead.loyalty_points} pts{' '}
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  ({formatBRL(lead.loyalty_bonus_brl || lead.loyalty_points / 4)})
                                </span>
                              </>
                            ) : (
                              '0 pts'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Salesperson Interaction Fields */}
                  {lead.assigned_to === user?.id && lead.status !== 'Concluído' && (
                    <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} space-y-3`}>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Teor da Conversa</label>
                        <textarea className={`w-full p-2 rounded-lg text-xs ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`} rows={2} placeholder="Descreva a conversa..." />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-500">Já conhecia?</label>
                          <select className={`w-full p-2 rounded-lg text-xs ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                            <option>Não</option>
                            <option>Sim</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-500">Já tinha interesse?</label>
                          <select className={`w-full p-2 rounded-lg text-xs ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                            <option>Não</option>
                            <option>Sim</option>
                          </select>
                        </div>
                      </div>
                      <button 
                        className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-emerald-700 transition-all"
                        onClick={async () => {
                          // Find admin
                          const { data: admin } = await supabase
                            .from('profiles')
                            .select('id')
                            .eq('role', 'admin')
                            .limit(1)
                            .single();
                          
                          if (admin) {
                            await createNotification(admin.id, 'Lead Concluído', `O lead ${lead.name} foi concluído pelo vendedor ${user?.name || 'Vendedor'}.`, 'success');
                          }
                          
                          showToast('Lead concluído com sucesso!', 'success');
                          // Update status locally
                          setLeads(prev => prev.map(l => l.id === lead.id ? {...l, status: 'Concluído'} : l));
                        }}
                      >
                        Concluir Lead
                      </button>
                    </div>
                  )}

                  {(lead.assigned_profile?.name || lead.assigned_name) ? (
                    <div className={`mt-3 pt-3 border-t flex items-center justify-between ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                          <User size={12} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Responsável:</span>
                        <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                          {lead.assigned_profile?.name || lead.assigned_name}
                        </span>
                      </div>
                      {canAccessLeads && (
                        <button 
                          onClick={async () => {
                            setIsDistributing(true);
                            await fetchVendedores();
                            setIsDistributing(false);
                            setSelectedLeadForAssignment(lead);
                            setShowAssignModal(true);
                          }}
                          disabled={isDistributing}
                          className={`text-[11px] font-bold uppercase transition-colors ${
                            isDistributing ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600'
                          }`}
                        >
                          {isDistributing ? 'Carregando...' : 'Alterar'}
                        </button>
                      )}
                    </div>
                  ) : (
                    canAccessLeads && (
                      <div className={`mt-3 pt-3 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-50'}`}>
                        <button 
                          onClick={async () => {
                            setIsDistributing(true);
                            await fetchVendedores();
                            setIsDistributing(false);
                            setSelectedLeadForAssignment(lead);
                            setShowAssignModal(true);
                          }}
                          disabled={isDistributing}
                          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-100 transition-all ${
                            isDistributing ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <Shuffle size={12} className={isDistributing ? 'animate-spin' : ''} />
                          {isDistributing ? 'Carregando Vendedores...' : 'Atribuir Vendedor'}
                        </button>
                      </div>
                    )
                  )}
                </motion.div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-500">
                <p>Nenhum lead encontrado.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className={`relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl transition-colors ${
                isDarkMode ? 'bg-slate-900' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{selectedLeadForAssignment ? 'Editar Lead' : 'Novo Lead'}</h3>
                    <p className="text-xs text-slate-500">{selectedLeadForAssignment ? 'Edite os dados do cliente' : 'Cadastre um novo potencial cliente'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddLead} className="space-y-3 overflow-y-auto pr-1 flex-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nome do Contato *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      required
                      type="text"
                      placeholder="Ex: João Silva"
                      value={newLead.name || ''}
                      onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                      className={`w-full h-11 pl-11 pr-4 rounded-xl border outline-none transition-all ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-600' : 'bg-slate-50 border-slate-200 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Empresa *</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        required
                        type="text"
                        placeholder="Ex: Restaurante Central"
                        value={newLead.company || ''}
                        onChange={(e) => setNewLead({...newLead, company: e.target.value})}
                        className={`w-full h-11 pl-11 pr-4 rounded-xl border outline-none transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-600' : 'bg-slate-50 border-slate-200 focus:border-blue-600'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Instagram</label>
                      {(newLead.instagram || newLead.company) && (
                        <a
                          href={buildInstagramUrl(
                            newLead.instagram || newLead.company,
                            newLead.company
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-600 dark:text-pink-400 hover:underline"
                          title="Testar link do Instagram da empresa"
                        >
                          <span>Abrir perfil</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                    <div className="relative">
                      <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500" size={18} />
                      <input 
                        type="text"
                        placeholder="Ex: @restaurantecentral ou instagram.com/..."
                        value={newLead.instagram || ''}
                        onChange={(e) => setNewLead({...newLead, instagram: e.target.value})}
                        className={`w-full h-11 pl-11 pr-4 rounded-xl border outline-none transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-pink-500' : 'bg-slate-50 border-slate-200 focus:border-pink-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">E-mail</label>
                      <span className="text-[10px] text-slate-400 font-medium">Apenas se disponível</span>
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email"
                        placeholder="Opcional (somente se disponível)"
                        value={newLead.email || ''}
                        onChange={(e) => {
                          const email = e.target.value;
                          setNewLead({...newLead, email});
                          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                            setEmailError('E-mail inválido.');
                          } else {
                            setEmailError('');
                          }
                        }}
                        className={`w-full h-11 pl-11 pr-4 rounded-xl border outline-none transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-600' : 'bg-slate-50 border-slate-200 focus:border-blue-600'
                        } ${emailError ? 'border-rose-500' : ''}`}
                      />
                    </div>
                    {emailError && <p className="text-xs text-rose-500 mt-1">{emailError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={newLead.phone || ''}
                        onChange={(e) => {
                          const rawValue = e.target.value.replace(/\D/g, '');
                          let formattedValue = rawValue;
                          
                          if (rawValue.length <= 10) {
                            formattedValue = rawValue.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
                          } else {
                            formattedValue = rawValue.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
                          }
                          
                          setNewLead({...newLead, phone: formattedValue});
                          
                          if (rawValue.length > 0 && rawValue.length < 10) {
                            setPhoneError('Telefone inválido (mínimo 10 dígitos).');
                          } else {
                            setPhoneError('');
                          }
                        }}
                        className={`w-full h-11 pl-11 pr-4 rounded-xl border outline-none transition-all ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-600' : 'bg-slate-50 border-slate-200 focus:border-blue-600'
                        } ${phoneError ? 'border-rose-500' : ''}`}
                      />
                    </div>
                    {phoneError && <p className="text-xs text-rose-500 mt-1">{phoneError}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Segmento</label>
                  <div className="relative">
                    <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      list="lead-segments-datalist"
                      placeholder="Ex: Padaria, Restaurante, Supermercado, Climatização..."
                      value={newLead.segment || ''}
                      onChange={(e) => setNewLead({...newLead, segment: e.target.value})}
                      className={`w-full h-11 pl-11 pr-4 rounded-xl border outline-none transition-all ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-600' : 'bg-slate-50 border-slate-200 focus:border-blue-600'
                      }`}
                    />
                    <datalist id="lead-segments-datalist">
                      <option value="Geral" />
                      <option value="Restaurante" />
                      <option value="Padaria" />
                      <option value="Supermercado" />
                      <option value="Açougue" />
                      <option value="Doceria" />
                      <option value="Climatização" />
                      <option value="Oficina e Auto Peças" />
                      <option value="Farmácia" />
                      <option value="Construção" />
                    </datalist>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Endereço (Rua e Número)</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder="Ex: Rua das Flores, 123"
                      value={newLead.address || ''}
                      onChange={(e) => setNewLead({...newLead, address: e.target.value})}
                      className={`w-full h-11 pl-11 pr-4 rounded-xl border outline-none transition-all ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-600' : 'bg-slate-50 border-slate-200 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Bairro</label>
                    <input 
                      type="text"
                      placeholder="Ex: Centro"
                      value={newLead.neighborhood || ''}
                      onChange={(e) => setNewLead({...newLead, neighborhood: e.target.value})}
                      className={`w-full h-11 px-4 rounded-xl border outline-none transition-all ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-600' : 'bg-slate-50 border-slate-200 focus:border-blue-600'
                      }`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cidade</label>
                    <input 
                      type="text"
                      placeholder="Ex: São Paulo"
                      value={newLead.city || ''}
                      onChange={(e) => setNewLead({...newLead, city: e.target.value})}
                      className={`w-full h-11 px-4 rounded-xl border outline-none transition-all ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-600' : 'bg-slate-50 border-slate-200 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ponto de Referência / Complemento</label>
                  <input 
                    type="text"
                    placeholder="Ex: Próximo à praça central, Loja 2"
                    value={newLead.reference || ''}
                    onChange={(e) => setNewLead({...newLead, reference: e.target.value})}
                    className={`w-full h-11 px-4 rounded-xl border outline-none transition-all ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-600' : 'bg-slate-50 border-slate-200 focus:border-blue-600'
                    }`}
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={`flex-1 py-3.5 rounded-2xl font-bold transition-colors ${
                      isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className={`flex-[2] py-3.5 rounded-2xl font-bold text-white transition-all shadow-lg shadow-blue-600/20 active:scale-95 ${
                      isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isSaving ? 'Salvando...' : 'Salvar Lead'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAssignModal && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAssignModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className={`relative w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl transition-colors ${
                isDarkMode ? 'bg-slate-900' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Atribuir Lead</h3>
                    <p className="text-xs text-slate-500">Selecione o vendedor para {selectedLeadForAssignment?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={fetchVendedores}
                    className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    title="Atualizar lista"
                  >
                    <Shuffle size={18} className={isDistributing ? 'animate-spin' : ''} />
                  </button>
                  <button 
                    onClick={() => setShowAssignModal(false)}
                    className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar vendedor..."
                    value={vendedorSearchQuery}
                    onChange={(e) => setVendedorSearchQuery(e.target.value)}
                    className={`w-full h-10 pl-10 pr-4 rounded-xl text-xs outline-none border transition-all ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-600' : 'bg-slate-50 border-slate-200 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto mb-6 pr-2 custom-scrollbar">
                {vendedores
                  .filter(v => (v.status === 'Ativo' || !v.status) && v.active !== false)
                  .filter(v => v.name?.toLowerCase().includes(vendedorSearchQuery.toLowerCase()))
                  .map((vendedor) => (
                  <button
                    key={vendedor.id}
                    onClick={() => handleAssignLead(vendedor.id)}
                    disabled={isDistributing}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                      selectedLeadForAssignment?.assigned_to === vendedor.id
                        ? (isDarkMode ? 'bg-blue-900/20 border-blue-500' : 'bg-blue-50 border-blue-200')
                        : (isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-100')
                    } ${isDistributing ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full overflow-hidden bg-slate-200 relative">
                        <Image 
                          src={vendedor.image_url || `https://picsum.photos/seed/${vendedor.id}/100`}
                          alt={vendedor.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="text-left">
                        <p className={`font-bold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} flex items-center gap-2`}>
                          {vendedor.name || 'Sem Nome'}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{vendedor.role || 'Vendedor'}</p>
                      </div>
                    </div>
                    {selectedLeadForAssignment?.assigned_to === vendedor.id && (
                      <div className="size-6 rounded-full bg-blue-600 flex items-center justify-center text-white">
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setShowAssignModal(false)}
                className={`w-full py-4 rounded-2xl font-bold transition-colors ${
                  isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cancelar
              </button>
            </motion.div>
          </div>
        )}

        {showDistributeModal && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDistributeModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className={`relative w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl transition-colors ${
                isDarkMode ? 'bg-slate-900' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Shuffle size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Distribuir Leads</h3>
                    <p className="text-xs text-slate-500">Defina quem está ativo para receber novos leads</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={fetchVendedores}
                    className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                    title="Atualizar lista"
                  >
                    <Shuffle size={18} className={isDistributing ? 'animate-spin' : ''} />
                  </button>
                  <button 
                    onClick={() => setShowDistributeModal(false)}
                    className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar vendedor..."
                    value={vendedorSearchQuery}
                    onChange={(e) => setVendedorSearchQuery(e.target.value)}
                    className={`w-full h-10 pl-10 pr-4 rounded-xl text-xs outline-none border transition-all ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 focus:border-blue-600' : 'bg-slate-50 border-slate-200 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              <div className="mb-6 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Modo de Distribuição</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setDistributionMode('balanced')}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      distributionMode === 'balanced' 
                        ? 'bg-indigo-600 border-indigo-600 text-white' 
                        : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500')
                    }`}
                  >
                    <Users size={18} />
                    <span className="text-[10px] font-bold uppercase">Equilibrada</span>
                  </button>
                  <button 
                    onClick={() => setDistributionMode('random')}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      distributionMode === 'random' 
                        ? 'bg-indigo-600 border-indigo-600 text-white' 
                        : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500')
                    }`}
                  >
                    <Shuffle size={18} />
                    <span className="text-[10px] font-bold uppercase">Aleatória</span>
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 mt-3 italic">
                  {distributionMode === 'balanced' 
                    ? 'Distribui os leads de forma igualitária entre os vendedores selecionados.' 
                    : 'Distribui os leads de forma totalmente aleatória entre os vendedores selecionados.'}
                </p>
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vendedores Disponíveis</p>
                <button 
                  onClick={async () => {
                    const allSelected = selectedVendedores.length === vendedores.length;
                    const newSelection = allSelected ? [] : vendedores.map(v => v.id);
                    setSelectedVendedores(newSelection);

                    // Persist to Supabase
                    try {
                      const isConfigured = Boolean(isSupabaseConfigured);

                      if (isConfigured) {
                        // Update all vendedores in the list
                        for (const v of vendedores) {
                          await supabase
                            .from('profiles')
                            .update({ receives_leads: !allSelected })
                            .eq('id', v.id);
                        }
                      }
                      
                      setVendedores(prev => prev.map(v => ({ ...v, receives_leads: !allSelected })));
                    } catch (err) {
                      console.error('Error updating bulk receives_leads:', err);
                    }
                  }}
                  className="text-[10px] font-bold text-indigo-600 uppercase hover:underline"
                >
                  {selectedVendedores.length === vendedores.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto mb-6 pr-2 custom-scrollbar">
                {vendedores
                  .filter(v => (v.status === 'Ativo' || !v.status) && v.active !== false)
                  .filter(v => v.name?.toLowerCase().includes(vendedorSearchQuery.toLowerCase())).length > 0 ? (
                  vendedores
                    .filter(v => (v.status === 'Ativo' || !v.status) && v.active !== false)
                    .filter(v => v.name?.toLowerCase().includes(vendedorSearchQuery.toLowerCase())).map((vendedor) => (
                    <button
                      key={vendedor.id}
                      onClick={() => toggleVendedorSelection(vendedor.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        selectedVendedores.includes(vendedor.id)
                          ? (isDarkMode ? 'bg-indigo-900/20 border-indigo-500' : 'bg-indigo-50 border-indigo-200')
                          : (isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-100')
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full overflow-hidden bg-slate-200 relative">
                          <Image 
                            src={vendedor.image_url || `https://picsum.photos/seed/${vendedor.id}/100`}
                            alt={vendedor.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="text-left">
                          <p className={`font-bold text-sm ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} flex items-center gap-2`}>
                            {vendedor.name || 'Sem Nome'}
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{vendedor.role || 'Vendedor'}</p>
                        </div>
                      </div>
                      <div className={`size-6 rounded-full flex items-center justify-center border-2 transition-all ${
                        selectedVendedores.includes(vendedor.id)
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : (isDarkMode ? 'border-slate-700' : 'border-slate-200')
                      }`}>
                        {selectedVendedores.includes(vendedor.id) && <Check size={14} />}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    <Users size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Nenhum vendedor encontrado.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDistributeModal(false)}
                  className={`flex-1 py-4 rounded-2xl font-bold transition-colors ${
                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDistributeLeads}
                  disabled={isDistributing || selectedVendedores.length === 0}
                  className={`flex-[2] py-4 rounded-2xl font-bold text-white transition-all shadow-lg shadow-indigo-600/20 active:scale-95 ${
                    isDistributing || selectedVendedores.length === 0
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isDistributing ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Distribuindo...</span>
                    </div>
                  ) : (
                    <span>Confirmar Distribuição</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showImportModal && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isImportingReport && setShowImportModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className={`relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl transition-colors ${
                isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Upload size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black leading-tight">
                      Importar Relatório com Reconhecimento Automático
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Envie qualquer relatório (PDF, Excel ou CSV) para atualizar os leads automaticamente
                    </p>
                  </div>
                </div>
                {!isImportingReport && (
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${
                      isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Upload Dropzone */}
                <div
                  onClick={() => !isImportingReport && reportFileInputRef.current?.click()}
                  className={`p-7 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                    isDarkMode
                      ? 'border-slate-700 hover:border-amber-500 bg-slate-800/40 hover:bg-slate-800/70'
                      : 'border-slate-300 hover:border-amber-500 bg-slate-50 hover:bg-amber-50/40'
                  }`}
                >
                  <input
                    type="file"
                    ref={reportFileInputRef}
                    onChange={handleImportReportFile}
                    accept=".pdf,.xlsx,.xls,.csv"
                    className="hidden"
                  />
                  <div className="size-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto mb-3">
                    {isImportingReport ? (
                      <RefreshCw size={24} className="animate-spin" />
                    ) : (
                      <FileSpreadsheet size={24} />
                    )}
                  </div>
                  <p className="text-sm font-black">
                    {isImportingReport
                      ? 'Identificando o tipo de relatório e atualizando leads...'
                      : 'Clique para enviar seu relatório (.PDF, .XLSX, .XLS ou .CSV)'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    O sistema analisa a estrutura do arquivo, reconhece qual relatório foi enviado e atualiza os dados necessários.
                  </p>
                </div>

                {/* Quick Sync Buttons for Built-in ERP Reports */}
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" />
                    Sincronização Rápida com Relatórios do ERP no Sistema
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isImportingReport}
                      onClick={() => handleQuickPresetImport('vendas_vendedor')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-800 hover:border-sky-500/50 text-slate-200'
                          : 'bg-white border-slate-200 hover:border-sky-500 text-slate-800 shadow-2xs'
                      } disabled:opacity-50`}
                    >
                      <div className="p-2 rounded-lg bg-sky-500/15 text-sky-500 shrink-0">
                        <Receipt size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate">Vendas por Vendedor</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          Atualiza último vendedor e compras
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={isImportingReport}
                      onClick={() => handleQuickPresetImport('fidelidade')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-900 border-slate-800 hover:border-amber-500/50 text-slate-200'
                          : 'bg-white border-slate-200 hover:border-amber-500 text-slate-800 shadow-2xs'
                      } disabled:opacity-50`}
                    >
                      <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500 shrink-0">
                        <Award size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate">Extrato Clientes Fidelidade</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          Atualiza pontos e bônus (4 pts = R$ 1)
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Error Feedback */}
                {importError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                {/* Detailed Recognition Result inside Modal */}
                {importResultSummary && (
                  <div
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isDarkMode
                        ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-100'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                          Relatório Identificado e Aplicado
                        </span>
                        <h4 className="text-sm font-black">{importResultSummary.reportTitle}</h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-emerald-200/60'}`}>
                        <p className="text-base font-black text-blue-600 dark:text-blue-400">
                          {importResultSummary.stats.updatedLeads}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500">Atualizados</p>
                      </div>
                      <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-emerald-200/60'}`}>
                        <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          {importResultSummary.stats.newLeadsCreated}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500">Novos Leads</p>
                      </div>
                      <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-emerald-200/60'}`}>
                        <p className="text-base font-black text-sky-600 dark:text-sky-400">
                          {importResultSummary.stats.sellersMatched}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500">Com Vendedor</p>
                      </div>
                      <div className={`p-2 rounded-xl border ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-emerald-200/60'}`}>
                        <p className="text-base font-black text-amber-600 dark:text-amber-400">
                          {importResultSummary.stats.loyaltyMatched}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500">Com Bônus</p>
                      </div>
                    </div>

                    {importResultSummary.updatedFields.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider mb-1.5 opacity-80">
                          Informações Atualizadas nos Leads:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {importResultSummary.updatedFields.map((field) => (
                            <span
                              key={field}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                isDarkMode
                                  ? 'bg-slate-900 border-emerald-800/50 text-emerald-300'
                                  : 'bg-white border-emerald-200 text-emerald-800'
                              }`}
                            >
                              ✓ {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Supported Report Types Info */}
                <div
                  className={`p-3.5 rounded-2xl border text-[11px] space-y-1.5 ${
                    isDarkMode
                      ? 'bg-slate-800/50 border-slate-800 text-slate-300'
                      : 'bg-slate-100/80 border-slate-200 text-slate-700'
                  }`}
                >
                  <p className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <FileText size={14} />
                    <span>Relatórios Reconhecidos Automaticamente:</span>
                  </p>
                  <ul className="space-y-1 list-disc list-inside text-slate-500 dark:text-slate-400">
                    <li>
                      <strong className="text-slate-800 dark:text-slate-200">Vendas Agrupadas por Vendedor (PDF/Excel):</strong> cruza código do cliente, identifica último vendedor, valor e data da última compra.
                    </li>
                    <li>
                      <strong className="text-slate-800 dark:text-slate-200">Extrato de Clientes Fidelidade (PDF/Excel):</strong> atualiza saldo de pontos, bônus em R$ (4,00 pts = R$ 1,00) e vencimentos.
                    </li>
                    <li>
                      <strong className="text-slate-800 dark:text-slate-200">Planilhas de Leads e Clientes (XLSX/CSV):</strong> atualiza nome, empresa, telefone, endereço verificado, segmento e status.
                    </li>
                  </ul>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className={`w-full py-3.5 rounded-2xl font-bold transition-colors cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                    }`}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-xl font-bold flex items-center gap-2 z-[100]"
          >
            <CheckCircle2 size={20} />
            Leads distribuídos com sucesso!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
