'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Wind,
  Search,
  FileText,
  Download,
  Copy,
  Check,
  X,
  Eye,
  Calculator,
  Snowflake,
  ChevronRight,
  Building2,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useRole } from '@/hooks/useRole';
import {
  SPLIT_BRAND_TABLES,
  SplitBrandId,
  SplitCategory,
  SplitTechnology,
  SplitModelItem,
  AVAILABLE_BTUS,
  formatSplitBRL,
} from '@/lib/splitPriceTables';

const INSTALLMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const normalizeSearchText = (str: string) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bon\s*[-/_]?\s*off\b/g, 'on-off')
    .replace(/\b(\d{1,2})\.(\d{3})\b/g, '$1$2')
    .replace(/\b(\d{1,2})\s*mil\b/g, '$1000')
    .replace(/\b(\d{1,2})k\b/g, '$1000');

const AVAILABLE_BTUS_SET = new Set<number>(AVAILABLE_BTUS);

export default function TabelaSplitPage() {
  const { isDarkMode } = useTheme();
  const { hasSubmoduleAccess } = useRole();

  const canAccessAgratto = hasSubmoduleAccess('split_table_agratto');
  const canAccessGree = hasSubmoduleAccess('split_table_gree');
  const canAccessElgin = hasSubmoduleAccess('split_table_elgin');
  const canDownloadPdf = hasSubmoduleAccess('split_table_download');

  // Filter brands according to user's submodule permissions
  const allowedBrandTables = useMemo(() => {
    return SPLIT_BRAND_TABLES.filter((brand) => {
      if (brand.id === 'agratto') return canAccessAgratto;
      if (brand.id === 'gree') return canAccessGree;
      if (brand.id === 'elgin') return canAccessElgin;
      return true;
    });
  }, [canAccessAgratto, canAccessGree, canAccessElgin]);

  // Unified, simple filter states
  const [selectedBrands, setSelectedBrands] = useState<SplitBrandId[]>([]);
  const [selectedBtus, setSelectedBtus] = useState<number[]>([]);
  const [selectedTech, setSelectedTech] = useState<'all' | SplitTechnology>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | SplitCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedInstallment, setHighlightedInstallment] = useState<number | null>(10);

  // Interactive simulator / quote modal
  const [selectedModel, setSelectedModel] = useState<SplitModelItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut "/" or Ctrl+K to focus the real-time search input
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // PDF Preview Modal
  const [previewPdf, setPreviewPdf] = useState<{
    title: string;
    url: string;
    fileName: string;
  } | null>(null);

  // Pre-indexed searchable text per item ID for O(1) real-time query performance
  const searchableIndexMap = useMemo(() => {
    const map = new Map<string, string>();
    allowedBrandTables.forEach((brand) => {
      brand.sections.forEach((section) => {
        section.items.forEach((item) => {
          const techKeywords =
            item.technology === 'Inverter'
              ? 'inverter inv'
              : 'on-off onoff convencional fixo';
          map.set(
            item.id,
            normalizeSearchText(
              `${item.model} ${item.code} cod${item.code} ${item.brandLabel} ${item.brand} ${item.btus} ${item.btus.toLocaleString('pt-BR')} ${item.btus / 1000}k ${item.category} ${techKeywords} ${item.condenserType || ''} ${section.title}`
            )
          );
        });
      });
    });
    return map;
  }, [allowedBrandTables]);

  // Pre-tokenized query tokens for instantaneous filtering across all items
  const queryTokens = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return [];
    return normalizeSearchText(trimmed)
      .split(/\s+/)
      .filter((t) => t.length > 0 && t !== 'btu' && t !== 'btus' && t !== 'split' && t !== 'ar');
  }, [searchQuery]);

  // Fast O(tokens) check using pre-computed index
  const matchesRealTimeSearch = React.useCallback(
    (item: SplitModelItem): boolean => {
      if (queryTokens.length === 0) return true;
      const indexedText = searchableIndexMap.get(item.id) || '';

      for (let i = 0; i < queryTokens.length; i++) {
        const token = queryTokens[i];
        const numericToken = Number(token);
        if (!Number.isNaN(numericToken) && AVAILABLE_BTUS_SET.has(numericToken)) {
          if (item.btus !== numericToken && !item.code.includes(token)) return false;
          continue;
        }
        if (token === 'inverter') {
          if (item.technology !== 'Inverter') return false;
          continue;
        }
        if (token === 'on-off' || token === 'onoff' || token === 'convencional') {
          if (item.technology !== 'On-Off') return false;
          continue;
        }
        if (!indexedText.includes(token)) return false;
      }
      return true;
    },
    [queryTokens, searchableIndexMap]
  );

  const activeBtuFilterSet = useMemo(() => {
    if (selectedBtus.length === 0) return null;
    return new Set<number>(selectedBtus);
  }, [selectedBtus]);

  const activeBrandFilterSet = useMemo(() => {
    if (selectedBrands.length === 0) return null;
    return new Set<SplitBrandId>(selectedBrands);
  }, [selectedBrands]);

  const toggleBrand = (brandId: SplitBrandId) => {
    setSelectedBrands((prev) => {
      const next = prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId];
      // If user selected all available brands, reset to empty (= Todas)
      if (next.length === allowedBrandTables.length) return [];
      return next;
    });
  };

  const toggleBtu = (btu: number) => {
    setSelectedBtus((prev) =>
      prev.includes(btu) ? prev.filter((b) => b !== btu) : [...prev, btu]
    );
  };

  // Filter brand tables and their sections/items
  const filteredBrandTables = useMemo(() => {
    return allowedBrandTables
      .filter((brand) => !activeBrandFilterSet || activeBrandFilterSet.has(brand.id))
      .map((brand) => {
        const filteredSections = brand.sections
          .map((section) => {
            const filteredItems = section.items.filter((item) => {
              if (selectedCategory !== 'all' && item.category !== selectedCategory) {
                return false;
              }
              if (selectedTech !== 'all' && item.technology !== selectedTech) {
                return false;
              }
              if (activeBtuFilterSet && !activeBtuFilterSet.has(item.btus)) {
                return false;
              }
              if (!matchesRealTimeSearch(item)) {
                return false;
              }
              return true;
            });

            return {
              ...section,
              items: filteredItems,
            };
          })
          .filter((section) => section.items.length > 0);

        return {
          ...brand,
          sections: filteredSections,
        };
      })
      .filter((brand) => brand.sections.length > 0);
  }, [
    allowedBrandTables,
    activeBrandFilterSet,
    selectedCategory,
    selectedTech,
    activeBtuFilterSet,
    matchesRealTimeSearch,
  ]);

  const totalMatchingModels = useMemo(() => {
    return filteredBrandTables.reduce(
      (acc, brand) =>
        acc + brand.sections.reduce((secAcc, sec) => secAcc + sec.items.length, 0),
      0
    );
  }, [filteredBrandTables]);

  // Calculate available counts per technology, BTU, and brand for real-time feedback
  const filterCounts = useMemo(() => {
    const byTech: Record<'all' | SplitTechnology, number> = {
      all: 0,
      Inverter: 0,
      'On-Off': 0,
    };
    const byBtu: Record<number, number> = {};
    AVAILABLE_BTUS.forEach((b) => {
      byBtu[b] = 0;
    });
    const byBrand: Record<SplitBrandId, number> = {
      agratto: 0,
      gree: 0,
      elgin: 0,
    };

    allowedBrandTables.forEach((brand) => {
      const brandMatches = !activeBrandFilterSet || activeBrandFilterSet.has(brand.id);

      brand.sections.forEach((section) => {
        section.items.forEach((item) => {
          if (selectedCategory !== 'all' && item.category !== selectedCategory) return;
          if (!matchesRealTimeSearch(item)) return;

          const btuMatches = !activeBtuFilterSet || activeBtuFilterSet.has(item.btus);
          const techMatches = selectedTech === 'all' || item.technology === selectedTech;

          if (btuMatches && techMatches) {
            byBrand[brand.id] = (byBrand[brand.id] || 0) + 1;
          }

          if (!brandMatches) return;

          if (btuMatches) {
            byTech.all += 1;
            byTech[item.technology] += 1;
          }
          if (techMatches) {
            byBtu[item.btus] = (byBtu[item.btus] || 0) + 1;
          }
        });
      });
    });

    return { byTech, byBtu, byBrand };
  }, [
    allowedBrandTables,
    activeBrandFilterSet,
    selectedCategory,
    activeBtuFilterSet,
    selectedTech,
    matchesRealTimeSearch,
  ]);

  const handleCopyQuote = (item: SplitModelItem, installmentFocus?: number) => {
    const inst = installmentFocus || highlightedInstallment || 10;
    const idx = inst - 1;
    const aVista = formatSplitBRL(item.total[0]);
    const parceladoTotal = formatSplitBRL(item.total[idx]);
    const parceladoValor = formatSplitBRL(item.prestacao[idx]);

    const text = [
      `*ORÇAMENTO AR CONDICIONADO - ${item.brandLabel.toUpperCase()}*`,
      `📌 *Modelo:* ${item.model} (${item.btus.toLocaleString('pt-BR')} BTUs - ${item.technology})`,
      `🏷️ *Código:* ${item.code}`,
      `❄️ *Linha:* ${item.category}${item.condenserType ? ` • ${item.condenserType}` : ''}`,
      ``,
      `💰 *À Vista (1x):* R$ ${aVista}`,
      `💳 *Em ${inst}x:* ${inst}x de *R$ ${parceladoValor}* (Total: R$ ${parceladoTotal})`,
      inst !== 10
        ? `💳 *Em 10x:* 10x de *R$ ${formatSplitBRL(item.prestacao[9])}* (Total: R$ ${formatSplitBRL(item.total[9])})`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === item.id ? null : prev));
    }, 2200);
  };

  const resetFilters = () => {
    setSelectedBrands([]);
    setSelectedBtus([]);
    setSelectedCategory('all');
    setSelectedTech('all');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedBtus.length > 0 ||
    selectedCategory !== 'all' ||
    selectedTech !== 'all' ||
    searchQuery.trim() !== '';

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-200 ${
        isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Sticky Header */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
          isDarkMode
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-white/90 border-slate-200'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left: Title & Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Wind size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <Link href="/" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  Início
                </Link>
                <ChevronRight size={12} />
                <Link href="/products" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                  Catálogo de Peças
                </Link>
                <ChevronRight size={12} />
                <span className="text-sky-600 dark:text-sky-400 font-bold">Tabela de Split</span>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Tabela de Preços Split — Ar Condicionado
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 tabular-nums">
                  {totalMatchingModels} {totalMatchingModels === 1 ? 'modelo encontrado' : 'modelos encontrados'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Direct PDF Buttons for the Official Tables (respecting split_table_download) */}
          <div className="flex items-center flex-wrap gap-2">
            {canDownloadPdf &&
              allowedBrandTables.map((brand) => (
                <div
                  key={brand.id}
                  className={`inline-flex items-center rounded-xl border text-xs font-bold overflow-hidden ${
                    isDarkMode
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                      : 'bg-slate-100/80 border-slate-200 text-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewPdf({
                        title: brand.fullTitle,
                        url: brand.pdfUrl,
                        fileName: brand.pdfFileName,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-sky-600 hover:text-white transition-colors cursor-pointer"
                    title={`Visualizar PDF original ${brand.name}`}
                  >
                    <FileText size={13} className="shrink-0" />
                    <span>PDF {brand.name}</span>
                  </button>
                  <a
                    href={brand.pdfUrl}
                    download={brand.pdfFileName}
                    className={`px-2 py-1.5 border-l hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                      isDarkMode ? 'border-slate-700' : 'border-slate-200'
                    }`}
                    title={`Baixar PDF ${brand.name}`}
                  >
                    <Download size={13} />
                  </a>
                </div>
              ))}

            {canDownloadPdf && (
              <button
                type="button"
                onClick={() => window.print()}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title="Imprimir tabela filtrada"
              >
                <Printer size={14} />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Simplified, Easy-to-Use Filter Panel */}
        <section
          id="split-advanced-search-filter"
          className={`p-4 sm:p-5 rounded-2xl border shadow-xs space-y-4 ${
            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {/* 1. Search Bar + Clear All Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 flex items-center">
              <Search
                size={18}
                className="absolute left-3.5 text-sky-600 dark:text-sky-400 pointer-events-none"
              />
              <input
                id="split-realtime-search"
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por código (ex: 37909), modelo (ex: Liv Top), BTUs (ex: 12000) ou Inverter..."
                className={`w-full pl-10 pr-28 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold outline-none transition-all ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-400 focus:border-sky-500'
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-600'
                }`}
              />
              <div className="absolute right-2.5 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                    title="Limpar texto da busca"
                  >
                    <X size={14} />
                  </button>
                )}
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg tabular-nums ${
                    totalMatchingModels > 0
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {totalMatchingModels} {totalMatchingModels === 1 ? 'item' : 'itens'}
                </span>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw size={14} />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>

          {/* 2. Main Filter Row: Marca + Tecnologia + Linha */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
            {/* Marca (Fabricante) */}
            <div
              className={`lg:col-span-5 p-3 rounded-xl border ${
                isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Building2 size={13} className="text-sky-500" />
                  <span>1. Marca (Fabricante)</span>
                </span>
                {selectedBrands.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedBrands([])}
                    className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    Mostrar todas
                  </button>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedBrands([])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    selectedBrands.length === 0
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : isDarkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Todas
                </button>
                {allowedBrandTables.map((brand) => {
                  const isSelected = selectedBrands.includes(brand.id);
                  const count = filterCounts.byBrand[brand.id] || 0;
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => toggleBrand(brand.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{brand.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded tabular-nums ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : isDarkMode
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tecnologia (Inverter / On-Off) */}
            <div
              className={`lg:col-span-3 p-3 rounded-xl border ${
                isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  2. Tecnologia
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-1.5">
                {(['all', 'Inverter', 'On-Off'] as const).map((tech) => {
                  const active = selectedTech === tech;
                  const count = filterCounts.byTech[tech];
                  return (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => setSelectedTech(active && tech !== 'all' ? 'all' : tech)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        active
                          ? tech === 'Inverter'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : tech === 'On-Off'
                            ? 'bg-amber-500 text-slate-950 shadow-2xs'
                            : 'bg-sky-600 text-white shadow-2xs'
                          : isDarkMode
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{tech === 'all' ? 'Todas' : tech}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded tabular-nums ${
                          active
                            ? 'bg-black/15 text-current'
                            : isDarkMode
                            ? 'bg-slate-700 text-slate-400'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Linha / Tipo de Aparelho */}
            <div
              className={`lg:col-span-4 p-3 rounded-xl border ${
                isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  3. Tipo / Linha
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-1.5">
                {(['all', 'Hi-Wall', 'Piso Teto', 'Cassete', 'Cassete 1 Via'] as const).map(
                  (cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(active && cat !== 'all' ? 'all' : cat)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          active
                            ? 'bg-sky-600 text-white shadow-2xs'
                            : isDarkMode
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cat === 'all' ? 'Todas' : cat}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          {/* 3. Capacidade em BTUs (Single Unified Row - 1 Click or Multi-Select) */}
          <div
            className={`p-3 rounded-xl border ${
              isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/70 border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Snowflake size={13} className="text-sky-500" />
                <span>4. Capacidade em BTUs (Clique em 1 ou mais capacidades)</span>
              </span>
              {selectedBtus.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedBtus([])}
                  className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                >
                  Mostrar todos os BTUs
                </button>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedBtus([])}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  selectedBtus.length === 0
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Todos
              </button>

              {AVAILABLE_BTUS.map((btu) => {
                const active = selectedBtus.includes(btu);
                const count = filterCounts.byBtu[btu] || 0;
                return (
                  <button
                    key={btu}
                    type="button"
                    onClick={() => toggleBtu(btu)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tabular-nums transition-all cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : count === 0
                        ? isDarkMode
                          ? 'bg-slate-900 text-slate-600 border border-slate-800'
                          : 'bg-slate-100/70 text-slate-400 border border-slate-200/60'
                        : isDarkMode
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                    title={`Filtrar por ${btu.toLocaleString('pt-BR')} BTUs (${count} modelos)`}
                  >
                    <span>{btu.toLocaleString('pt-BR')}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded ${
                        active
                          ? 'bg-white/20 text-white'
                          : isDarkMode
                          ? 'bg-slate-700 text-slate-400'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Bottom Bar: Active Filter Summary Chips + Highlight Installment Selector */}
          <div className="pt-1 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Active Filters Summary */}
            <div className="flex items-center flex-wrap gap-1.5 min-h-[28px]">
              {hasActiveFilters ? (
                <>
                  <span className="text-[11px] font-bold text-slate-400 mr-1">
                    Filtros ativos:
                  </span>
                  {selectedBrands.map((brandId) => {
                    const b = allowedBrandTables.find((item) => item.id === brandId);
                    return (
                      <button
                        key={`chip-brand-${brandId}`}
                        type="button"
                        onClick={() => toggleBrand(brandId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 cursor-pointer"
                      >
                        <span>Marca: {b?.name || brandId}</span>
                        <X size={12} />
                      </button>
                    );
                  })}
                  {selectedTech !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedTech('all')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer"
                    >
                      <span>Tecnologia: {selectedTech}</span>
                      <X size={12} />
                    </button>
                  )}
                  {selectedCategory !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 cursor-pointer"
                    >
                      <span>Linha: {selectedCategory}</span>
                      <X size={12} />
                    </button>
                  )}
                  {selectedBtus.map((btu) => (
                    <button
                      key={`chip-btu-${btu}`}
                      type="button"
                      onClick={() => toggleBtu(btu)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 hover:bg-sky-500/25 cursor-pointer"
                    >
                      <span>{btu.toLocaleString('pt-BR')} BTUs</span>
                      <X size={12} />
                    </button>
                  ))}
                  {searchQuery.trim() !== '' && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer"
                    >
                      <span>Busca: &quot;{searchQuery.trim()}&quot;</span>
                      <X size={12} />
                    </button>
                  )}
                </>
              ) : (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Exibindo todos os <strong>{totalMatchingModels} modelos</strong> disponíveis. Clique em qualquer filtro acima para refinar.
                </span>
              )}
            </div>

            {/* Installment Column Highlighter */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Destacar Parcela:
              </span>
              <div className="flex items-center gap-1">
                {INSTALLMENTS.map((inst) => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() =>
                      setHighlightedInstallment((prev) => (prev === inst ? null : inst))
                    }
                    className={`w-7 h-7 rounded-lg text-[11px] font-black tabular-nums transition-all cursor-pointer ${
                      highlightedInstallment === inst
                        ? 'bg-amber-500 text-slate-950 shadow-xs scale-105'
                        : isDarkMode
                        ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                    title={`Destacar coluna de ${inst}x`}
                  >
                    {inst}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Empty State */}
        {filteredBrandTables.length === 0 ? (
          <div
            className={`p-12 rounded-2xl border text-center space-y-3 ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto">
              <Wind size={24} />
            </div>
            <h3 className="text-base font-bold">Nenhum aparelho encontrado com estes filtros</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Tente buscar por outro código, capacidade em BTUs ou limpe os filtros selecionados para visualizar todas as tabelas da Agratto, Gree e Elgin.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-500 transition-colors cursor-pointer"
            >
              Mostrar Todas as Tabelas
            </button>
          </div>
        ) : (
          /* Brand Tables List */
          <div className="space-y-8">
            {filteredBrandTables.map((brand) => (
              <section
                key={brand.id}
                className={`rounded-2xl border overflow-hidden shadow-xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                {/* Brand Banner Header */}
                <div
                  className={`px-4 sm:px-6 py-3.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    isDarkMode
                      ? 'bg-slate-800/90 border-slate-700'
                      : 'bg-slate-900 text-white border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-black uppercase tracking-wider">
                      {brand.name}
                    </span>
                    <div>
                      <h2 className="text-sm sm:text-base font-black tracking-wide uppercase text-white">
                        {brand.fullTitle}
                      </h2>
                      <p className="text-[11px] text-slate-300">
                        Vigência: {brand.referenceMonth} • Valores Totais e Prestações de 1x a 10x
                      </p>
                    </div>
                  </div>

                  {canDownloadPdf && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPdf({
                            title: brand.fullTitle,
                            url: brand.pdfUrl,
                            fileName: brand.pdfFileName,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Eye size={14} />
                        <span>Ver PDF Original</span>
                      </button>
                      <a
                        href={brand.pdfUrl}
                        download={brand.pdfFileName}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors"
                      >
                        <Download size={14} />
                        <span>Baixar PDF</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Sections inside Brand */}
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {brand.sections.map((section) => (
                    <div key={section.id} className="p-3 sm:p-5 space-y-3">
                      {/* Optional group banner (e.g. PISO TETO E CASSETE ON-OFF) */}
                      {section.subtitle && (
                        <div className="py-1.5 px-3 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-center font-black text-xs tracking-wider uppercase text-slate-800 dark:text-slate-200">
                          {section.subtitle}
                        </div>
                      )}

                      {/* Section Title Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            {section.title}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              section.technology === 'Inverter'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {section.technology}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {section.category}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          Clique em qualquer modelo para simular ou copiar orçamento
                        </span>
                      </div>

                      {/* Responsive Data Grid faithful to PDF layout */}
                      <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr
                              className={`border-b border-slate-300 dark:border-slate-700 ${
                                isDarkMode
                                  ? 'bg-slate-800/90 text-slate-200'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              <th className="py-2.5 px-3 text-left font-black uppercase tracking-wider border-r border-slate-300 dark:border-slate-700 min-w-[180px]">
                                {section.columnHeaderLabel}
                              </th>
                              <th className="py-2.5 px-2.5 text-center font-black uppercase tracking-wider border-r border-slate-300 dark:border-slate-700 w-24">
                                Parcelas
                              </th>
                              {INSTALLMENTS.map((inst) => {
                                const isHighlighted = highlightedInstallment === inst;
                                return (
                                  <th
                                    key={inst}
                                    onClick={() =>
                                      setHighlightedInstallment((prev) =>
                                        prev === inst ? null : inst
                                      )
                                    }
                                    className={`py-2.5 px-2.5 text-right font-black tabular-nums border-r border-slate-300 dark:border-slate-700 cursor-pointer select-none transition-colors min-w-[92px] ${
                                      isHighlighted
                                        ? 'bg-amber-400/25 dark:bg-amber-500/25 text-amber-900 dark:text-amber-300'
                                        : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                                    }`}
                                    title="Clique para destacar esta coluna"
                                  >
                                    {inst}x
                                  </th>
                                );
                              })}
                              <th className="py-2.5 px-2.5 text-center font-black uppercase tracking-wider w-24">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300 dark:divide-slate-700">
                            {section.items.map((item, itemIdx) => {
                              const isCopied = copiedId === item.id;
                              const zebraBg =
                                itemIdx % 2 === 0
                                  ? isDarkMode
                                    ? 'bg-slate-900'
                                    : 'bg-white'
                                  : isDarkMode
                                  ? 'bg-slate-900/50'
                                  : 'bg-slate-50/70';

                              return (
                                <React.Fragment key={item.id}>
                                  {/* Row 1: Model Name + TOTAL values (1x to 10x) */}
                                  <tr
                                    onClick={() => setSelectedModel(item)}
                                    className={`${zebraBg} hover:bg-sky-50/60 dark:hover:bg-sky-950/30 transition-colors cursor-pointer`}
                                  >
                                    <td className="py-2 px-3 font-black text-slate-900 dark:text-white border-r border-slate-300 dark:border-slate-700 whitespace-nowrap">
                                      <div className="flex items-center justify-between gap-2">
                                        <span>{item.model}</span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 tabular-nums">
                                          {item.btus.toLocaleString('pt-BR')} BTUs
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-1.5 px-2.5 text-center font-medium text-slate-500 dark:text-slate-400 border-r border-slate-300 dark:border-slate-700">
                                      Total
                                    </td>
                                    {item.total.map((val, idx) => {
                                      const inst = idx + 1;
                                      const isHighlighted = highlightedInstallment === inst;
                                      return (
                                        <td
                                          key={`total-${inst}`}
                                          className={`py-1.5 px-2.5 text-right tabular-nums border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 ${
                                            isHighlighted
                                              ? 'bg-amber-400/10 dark:bg-amber-500/10 font-semibold'
                                              : ''
                                          }`}
                                        >
                                          {formatSplitBRL(val)}
                                        </td>
                                      );
                                    })}
                                    <td
                                      rowSpan={2}
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-2 text-center align-middle bg-slate-50/50 dark:bg-slate-800/40"
                                    >
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleCopyQuote(item)}
                                          className={`p-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                            isCopied
                                              ? 'bg-emerald-600 border-emerald-600 text-white'
                                              : isDarkMode
                                              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-sky-600 hover:border-sky-600 hover:text-white'
                                              : 'bg-white border-slate-200 text-slate-700 hover:bg-sky-600 hover:border-sky-600 hover:text-white'
                                          }`}
                                          title="Copiar orçamento formatado para WhatsApp"
                                        >
                                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setSelectedModel(item)}
                                          className={`p-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                            isDarkMode
                                              ? 'bg-slate-800 border-slate-700 text-sky-400 hover:bg-sky-600 hover:text-white'
                                              : 'bg-white border-slate-200 text-sky-600 hover:bg-sky-600 hover:text-white'
                                          }`}
                                          title="Abrir simulador de parcelas deste aparelho"
                                        >
                                          <Calculator size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Row 2: Code + Technology badge + PRESTAÇÃO values (1x to 10x in Bold) */}
                                  <tr
                                    onClick={() => setSelectedModel(item)}
                                    className={`${zebraBg} border-b-2 border-slate-300 dark:border-slate-700 hover:bg-sky-50/60 dark:hover:bg-sky-950/30 transition-colors cursor-pointer`}
                                  >
                                    <td
                                      className={`py-2 px-3 font-black border-r border-slate-300 dark:border-slate-700 whitespace-nowrap ${
                                        item.highlightCode
                                          ? 'bg-amber-300/80 dark:bg-amber-500/30 text-slate-950 dark:text-amber-200'
                                          : 'text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span>Cod {item.code}</span>
                                        <span
                                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                            item.technology === 'Inverter'
                                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                          }`}
                                        >
                                          {item.technology}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-1.5 px-2.5 text-center font-bold text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/60">
                                      Prestação
                                    </td>
                                    {item.prestacao.map((val, idx) => {
                                      const inst = idx + 1;
                                      const isHighlighted = highlightedInstallment === inst;
                                      return (
                                        <td
                                          key={`prest-${inst}`}
                                          className={`py-1.5 px-2.5 text-right tabular-nums font-black border-r border-slate-200 dark:border-slate-800 ${
                                            isHighlighted
                                              ? 'bg-amber-400/25 dark:bg-amber-500/25 text-amber-950 dark:text-amber-300'
                                              : inst === 1
                                              ? 'text-emerald-700 dark:text-emerald-400'
                                              : inst === 10
                                              ? 'text-sky-700 dark:text-sky-400'
                                              : 'text-slate-900 dark:text-white'
                                          }`}
                                        >
                                          {formatSplitBRL(val)}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Modal: Quick Installment Simulator & Quote Copier for a Selected Model */}
      {selectedModel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setSelectedModel(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/20">
                    {selectedModel.brandLabel}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/20">
                    {selectedModel.category} • {selectedModel.technology}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                    Cod {selectedModel.code}
                  </span>
                </div>
                <h3 className="text-lg font-black mt-1">
                  {selectedModel.model} — {selectedModel.btus.toLocaleString('pt-BR')} BTUs
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedModel(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Highlight Cards: À Vista (1x) vs 10x */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className={`p-4 rounded-2xl border ${
                    isDarkMode
                      ? 'bg-emerald-950/30 border-emerald-800/60'
                      : 'bg-emerald-50/80 border-emerald-200'
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    Preço à Vista (1x)
                  </span>
                  <p className="text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-300 mt-0.5">
                    R$ {formatSplitBRL(selectedModel.total[0])}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Parcela única de R$ {formatSplitBRL(selectedModel.prestacao[0])}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    isDarkMode
                      ? 'bg-sky-950/30 border-sky-800/60'
                      : 'bg-sky-50/80 border-sky-200'
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase text-sky-600 dark:text-sky-400">
                    Parcelamento em 10x
                  </span>
                  <p className="text-2xl font-black tabular-nums text-sky-700 dark:text-sky-300 mt-0.5">
                    10x de R$ {formatSplitBRL(selectedModel.prestacao[9])}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Total a prazo (10x): R$ {formatSplitBRL(selectedModel.total[9])}
                  </p>
                </div>
              </div>

              {/* Full 1x to 10x Breakdown Grid */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr
                      className={
                        isDarkMode
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-slate-100 text-slate-700'
                      }
                    >
                      <th className="py-2 px-3 text-left font-bold">Parcelas</th>
                      <th className="py-2 px-3 text-right font-bold">Valor da Prestação</th>
                      <th className="py-2 px-3 text-right font-bold">Valor Total</th>
                      <th className="py-2 px-3 text-center font-bold">Cotação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {INSTALLMENTS.map((inst, idx) => (
                      <tr
                        key={inst}
                        className="hover:bg-sky-500/5 transition-colors"
                      >
                        <td className="py-2 px-3 font-black tabular-nums">{inst}x</td>
                        <td className="py-2 px-3 text-right font-black tabular-nums text-sky-600 dark:text-sky-400">
                          {inst}x de R$ {formatSplitBRL(selectedModel.prestacao[idx])}
                        </td>
                        <td className="py-2 px-3 text-right font-medium tabular-nums text-slate-600 dark:text-slate-300">
                          R$ {formatSplitBRL(selectedModel.total[idx])}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleCopyQuote(selectedModel, inst)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600/10 hover:bg-sky-600 text-sky-600 hover:text-white text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <Copy size={12} />
                            <span>Copiar {inst}x</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCopyQuote(selectedModel, 10)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer"
                >
                  {copiedId === selectedModel.id ? <Check size={15} /> : <Copy size={15} />}
                  <span>
                    {copiedId === selectedModel.id
                      ? 'Orçamento Copiado!'
                      : 'Copiar Orçamento Completo (WhatsApp)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Original PDF Viewer */}
      {previewPdf && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs"
          onClick={() => setPreviewPdf(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-6xl h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText size={18} className="text-sky-600 shrink-0" />
                <h3 className="text-sm font-black truncate">{previewPdf.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewPdf.url}
                  download={previewPdf.fileName}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors"
                >
                  <Download size={14} />
                  <span>Baixar PDF</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdf(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-950">
              <iframe
                src={previewPdf.url}
                title={previewPdf.title}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
