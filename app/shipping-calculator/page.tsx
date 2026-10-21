'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Calculator, MapPin, Search, AlertCircle, CheckCircle2, 
  Truck, RefreshCw, Copy, Check, DollarSign, Settings, Plus, Trash2, 
  X, ShieldAlert, Navigation, FileText, Info, Store, Building, Compass,
  ChevronRight, Hash, AlertTriangle
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface SystemSettings {
  shipping_km_rate: string;
  shipping_base_fee: string;
  shipping_origin_cep: string;
  shipping_origin_city: string;
  shipping_restricted_cities: string;
}

const BRAZIL_STATES = [
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'AC', name: 'Acre' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'TO', name: 'Tocantins' },
];

const DEFAULT_RESTRICTED = ['Manaus - AM', 'Boa Vista - RR', 'Macapá - AP', 'Cruzeiro do Sul - AC'];

// Expressão regular rigorosa para validação do padrão brasileiro 00000-000
const CEP_STRICT_REGEX = /^\d{5}-\d{3}$/;

export default function ShippingCalculatorPage() {
  const { isDarkMode } = useTheme();
  
  // Modo de Busca: 'cep' ou 'address'
  const [searchMode, setSearchMode] = useState<'cep' | 'address'>('cep');

  // Configurações do Sistema
  const [settings, setSettings] = useState<SystemSettings>({
    shipping_km_rate: '4.50',
    shipping_base_fee: '15.00',
    shipping_origin_cep: '58000-000',
    shipping_origin_city: 'João Pessoa - PB',
    shipping_restricted_cities: JSON.stringify(DEFAULT_RESTRICTED)
  });
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Estados do Formulário - Modo CEP
  const [cep, setCep] = useState('');
  const [cepTouched, setCepTouched] = useState(false);
  const [cepImmediateError, setCepImmediateError] = useState<string | null>(null);

  // Estados do Formulário - Modo Rua e Cidade
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [selectedUf, setSelectedUf] = useState('PB');

  // Sugestões de endereços caso ViaCEP retorne múltiplos
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);

  // Estados de Execução & Resultado
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Estados do Modal / Painel de Configuração do Admin
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [adminKmRate, setAdminKmRate] = useState('4.50');
  const [adminBaseFee, setAdminBaseFee] = useState('15.00');
  const [adminOriginCep, setAdminOriginCep] = useState('58000-000');
  const [adminOriginCity, setAdminOriginCity] = useState('João Pessoa - PB');
  const [restrictedCitiesList, setRestrictedCitiesList] = useState<string[]>(DEFAULT_RESTRICTED);
  const [newRestrictedCity, setNewRestrictedCity] = useState('');

  // Carregar Configurações
  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch('/api/system/settings');
      if (res.ok) {
        const json = await res.json();
        setSettings(json);
        setAdminKmRate(json.shipping_km_rate || '4.50');
        setAdminBaseFee(json.shipping_base_fee || '15.00');
        setAdminOriginCep(json.shipping_origin_cep || '58000-000');
        setAdminOriginCity(json.shipping_origin_city || 'João Pessoa - PB');
        
        try {
          if (json.shipping_restricted_cities) {
            const parsed = typeof json.shipping_restricted_cities === 'string'
              ? JSON.parse(json.shipping_restricted_cities)
              : json.shipping_restricted_cities;
            if (Array.isArray(parsed)) setRestrictedCitiesList(parsed);
          }
        } catch (e) {
          if (typeof json.shipping_restricted_cities === 'string') {
            setRestrictedCitiesList(json.shipping_restricted_cities.split(',').map((s: string) => s.trim()).filter(Boolean));
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar configurações de frete:', err);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Lista parsed de cidades restritas
  const activeRestrictedCities = useMemo(() => {
    return restrictedCitiesList.map(c => c.trim().toLowerCase());
  }, [restrictedCitiesList]);

  // Validação instantânea e rigorosa do CEP (exatamente 00000-000)
  const isCepStrictlyValid = useMemo(() => {
    return CEP_STRICT_REGEX.test(cep.trim());
  }, [cep]);

  // Determina classes de borda e validação em tempo real para o campo de CEP
  const cepValidationState = useMemo(() => {
    if (isCepStrictlyValid) return 'success';
    if (cep.length > 0 || cepTouched) return 'error';
    return 'idle';
  }, [isCepStrictlyValid, cep.length, cepTouched]);

  const cepBorderClass = useMemo(() => {
    if (cepValidationState === 'success') {
      return 'border-success border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20';
    }
    if (cepValidationState === 'error') {
      return 'border-error border-red-500 bg-red-500/10 text-red-800 dark:text-rose-200 ring-2 ring-red-500/20';
    }
    return isDarkMode
      ? 'border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500'
      : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500';
  }, [cepValidationState, isDarkMode]);

  // Função para aplicar a máscara 00000-000 automaticamente enquanto o usuário digita
  const applyCepMask = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return digits;
  };

  // Função para validar e gerar mensagem de erro visual imediata
  const validateCepImmediately = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setCepImmediateError(null);
      return;
    }

    const digitsOnly = trimmed.replace(/\D/g, '');

    if (!CEP_STRICT_REGEX.test(trimmed)) {
      if (digitsOnly.length < 8) {
        const remaining = 8 - digitsOnly.length;
        setCepImmediateError(`Formato incompleto: faltam ${remaining} dígito${remaining > 1 ? 's' : ''}. O CEP deve ser exatamente 00000-000.`);
      } else {
        setCepImmediateError('Formato inválido! O CEP deve conter exatamente 8 números no formato 00000-000.');
      }
    } else {
      setCepImmediateError(null);
    }
  };

  // Manipulador de digitação do CEP com máscara inteligente e validação imediata
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = applyCepMask(e.target.value);
    setCep(formatted);
    setCepTouched(true);
    validateCepImmediately(formatted);
    if (errorMessage) setErrorMessage('');
  };

  // Intercepta teclas para garantir entrada puramente numérica e deleção fluida do hífen
  const handleCepKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir teclas de navegação, edição e atalhos de teclado (Ctrl/Cmd)
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      // Se apagar quando estiver logo após o hífen (ex: '12345-'), apaga o 5º dígito para não travar
      if (e.key === 'Backspace' && cep.length === 6 && cep.endsWith('-')) {
        e.preventDefault();
        const updated = cep.slice(0, 4);
        setCep(updated);
        validateCepImmediately(updated);
      }
      return;
    }

    // Permitir hífen caso o usuário digite manualmente
    if (e.key === '-') {
      return;
    }

    // Bloquear caracteres que não sejam dígitos numéricos
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      setCepImmediateError('Digite apenas números. O formato 00000-000 é aplicado automaticamente.');
    }
  };

  // Tratar colagem de texto (ex: 58000000 ou 58.000-000)
  const handleCepPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const formatted = applyCepMask(pasted);
    setCep(formatted);
    setCepTouched(true);
    validateCepImmediately(formatted);
    if (errorMessage) setErrorMessage('');
  };

  // Salvar Configurações do Admin
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const payload = {
        shipping_km_rate: adminKmRate,
        shipping_base_fee: adminBaseFee,
        shipping_origin_cep: adminOriginCep,
        shipping_origin_city: adminOriginCity,
        shipping_restricted_cities: JSON.stringify(restrictedCitiesList)
      };

      const res = await fetch('/api/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchSettings();
        setIsAdminModalOpen(false);
        alert('Configurações de frete salvas com sucesso!');
      } else {
        const json = await res.json();
        alert(json.error || 'Erro ao salvar configurações.');
      }
    } catch (err: any) {
      alert('Erro de conexão: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddRestrictedCity = () => {
    if (!newRestrictedCity.trim()) return;
    const formatted = newRestrictedCity.trim();
    if (restrictedCitiesList.some(c => c.toLowerCase() === formatted.toLowerCase())) {
      alert('Esta cidade já consta na lista de cidades sem entrega.');
      return;
    }
    setRestrictedCitiesList(prev => [...prev, formatted]);
    setNewRestrictedCity('');
  };

  const handleRemoveRestrictedCity = (cityName: string) => {
    setRestrictedCitiesList(prev => prev.filter(c => c !== cityName));
  };

  // Cálculo da distância Haversine em KM com fator de rota rodoviária (1.35x)
  const calculateHaversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const directKm = R * c;
    return Math.max(2, Math.round(directKm * 1.35 * 10) / 10);
  };

  // Obter coordenadas de origem configuradas
  const getOriginCoordinates = async () => {
    let origLat = -7.1150;
    let origLng = -34.8631;

    try {
      const origGeoRes = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: settings.shipping_origin_cep || '',
          city: settings.shipping_origin_city || 'João Pessoa - PB'
        })
      });
      if (origGeoRes.ok) {
        const origGeoJson = await origGeoRes.json();
        if (origGeoJson.lat && origGeoJson.lng) {
          origLat = origGeoJson.lat;
          origLng = origGeoJson.lng;
        }
      }
    } catch (e) {
      console.warn('Erro ao obter coordenadas de origem, usando padrão:', e);
    }
    return { origLat, origLng };
  };

  // Finalizar cálculo a partir dos dados consolidados de destino
  const finalizeCalculation = async (params: {
    logradouro: string;
    bairro: string;
    cidade: string;
    uf: string;
    cepFormatted: string;
    destLat: number;
    destLng: number;
  }) => {
    const fullCityState = `${params.cidade} - ${params.uf}`;

    // Verificar se cidade está restrita
    const isRestricted = activeRestrictedCities.some(restricted => {
      const cleanRestricted = restricted.toLowerCase();
      return (
        cleanRestricted.includes(params.cidade.toLowerCase()) ||
        cleanRestricted.includes(fullCityState.toLowerCase())
      );
    });

    if (isRestricted) {
      setCalculationResult({
        isRestricted: true,
        cityName: fullCityState,
        reason: `A cidade de ${fullCityState} está na lista oficial de localidades onde não realizamos entregas.`
      });
      return;
    }

    const { origLat, origLng } = await getOriginCoordinates();
    const distanceKm = calculateHaversineKm(origLat, origLng, params.destLat, params.destLng);
    const kmRate = parseFloat(settings.shipping_km_rate || '4.50');
    const baseFee = parseFloat(settings.shipping_base_fee || '15.00');

    const kmTotalCost = Math.round(distanceKm * kmRate * 100) / 100;
    const totalFreight = Math.round((baseFee + kmTotalCost) * 100) / 100;

    setCalculationResult({
      isRestricted: false,
      cityName: fullCityState,
      logradouro: params.logradouro || 'Endereço Geral',
      bairro: params.bairro || 'Região Central',
      cepFormatted: params.cepFormatted || 'Não especificado',
      distanceKm,
      kmRate,
      baseFee,
      kmTotalCost,
      totalFreight
    });
  };

  // 1. Busca & Cálculo por CEP com validação rigorosa de formato 00000-000
  const handleCalculateByCep = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCepTouched(true);

    const trimmedCep = cep.trim();

    // Validação rigorosa: bloquear se não for exatamente 00000-000
    if (!CEP_STRICT_REGEX.test(trimmedCep)) {
      setCepImmediateError('O CEP deve estar rigorosamente no formato 00000-000 antes de submeter.');
      setErrorMessage('Formato de CEP inválido! Certifique-se de preencher exatamente 8 dígitos no formato 00000-000.');
      return;
    }

    const cleanedCep = trimmedCep.replace(/\D/g, '');

    setIsCalculating(true);
    setErrorMessage('');
    setCepImmediateError(null);
    setAddressSuggestions([]);
    setCalculationResult(null);

    try {
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const viaCepData = await viaCepRes.json();

      if (viaCepData.erro) {
        setErrorMessage('CEP não encontrado na base nacional dos Correios. Por favor, revise o número digitado.');
        setIsCalculating(false);
        return;
      }

      const cityName = (viaCepData.localidade || '').trim();
      const stateUf = (viaCepData.uf || '').trim();

      // Geocodificar para obter latitude e longitude
      let destLat = -7.1150;
      let destLng = -34.8631;

      try {
        const geoRes = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: viaCepData.logradouro,
            neighborhood: viaCepData.bairro,
            city: cityName,
            state: stateUf
          })
        });
        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          if (geoJson.lat && geoJson.lng) {
            destLat = geoJson.lat;
            destLng = geoJson.lng;
          }
        }
      } catch (err) {
        console.warn('Usando estimativa de coordenadas para CEP:', err);
      }

      await finalizeCalculation({
        logradouro: viaCepData.logradouro || 'Endereço Geral',
        bairro: viaCepData.bairro || 'Bairro Central',
        cidade: cityName,
        uf: stateUf,
        cepFormatted: `${cleanedCep.slice(0, 5)}-${cleanedCep.slice(5)}`,
        destLat,
        destLng
      });

    } catch (err: any) {
      setErrorMessage('Erro ao consultar CEP/Frete: ' + err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  // 2. Busca & Cálculo por Rua e Cidade
  const handleCalculateByAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!city.trim()) {
      setErrorMessage('Por favor, informe ao menos a cidade de destino.');
      return;
    }

    setIsCalculating(true);
    setErrorMessage('');
    setAddressSuggestions([]);
    setCalculationResult(null);

    try {
      const trimmedStreet = street.trim();
      const trimmedCity = city.trim();
      const trimmedUf = selectedUf.trim().toUpperCase();

      // Tentar localizar via API de CEP por Logradouro do ViaCEP
      let viaCepMatches: any[] = [];
      if (trimmedStreet.length >= 3 && trimmedCity.length >= 3) {
        try {
          const url = `https://viacep.com.br/ws/${trimmedUf}/${encodeURIComponent(trimmedCity)}/${encodeURIComponent(trimmedStreet)}/json/`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              viaCepMatches = data;
            }
          }
        } catch (e) {
          console.warn('ViaCEP logradouro search error:', e);
        }
      }

      if (viaCepMatches.length > 1) {
        setAddressSuggestions(viaCepMatches);
      }

      const addressQuery = trimmedStreet ? (streetNumber.trim() ? `${trimmedStreet}, ${streetNumber.trim()}` : trimmedStreet) : '';
      const geoRes = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addressQuery,
          neighborhood: neighborhood.trim() || (viaCepMatches[0]?.bairro || ''),
          city: trimmedCity,
          state: trimmedUf
        })
      });

      let destLat = -7.1150;
      let destLng = -34.8631;
      const formattedStreet = addressQuery || 'Região Central / Toda a Cidade';

      if (geoRes.ok) {
        const geoJson = await geoRes.json();
        if (geoJson.lat && geoJson.lng) {
          destLat = geoJson.lat;
          destLng = geoJson.lng;
        }
      }

      const bestCep = viaCepMatches[0]?.cep || 'CEP Geral da Cidade';

      await finalizeCalculation({
        logradouro: formattedStreet,
        bairro: neighborhood.trim() || (viaCepMatches[0]?.bairro || 'Bairro Comercial/Residencial'),
        cidade: trimmedCity,
        uf: trimmedUf,
        cepFormatted: bestCep,
        destLat,
        destLng
      });

    } catch (err: any) {
      setErrorMessage('Erro ao calcular frete por endereço: ' + err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  // Selecionar uma das sugestões retornadas pelo ViaCEP
  const handleSelectSuggestion = async (item: any) => {
    setIsCalculating(true);
    setAddressSuggestions([]);

    try {
      const addressQuery = streetNumber ? `${item.logradouro}, ${streetNumber.trim()}` : item.logradouro;
      const geoRes = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addressQuery,
          neighborhood: item.bairro,
          city: item.localidade,
          state: item.uf
        })
      });

      let destLat = -7.1150;
      let destLng = -34.8631;
      if (geoRes.ok) {
        const geoJson = await geoRes.json();
        if (geoJson.lat && geoJson.lng) {
          destLat = geoJson.lat;
          destLng = geoJson.lng;
        }
      }

      await finalizeCalculation({
        logradouro: addressQuery,
        bairro: item.bairro || 'Bairro Central',
        cidade: item.localidade,
        uf: item.uf,
        cepFormatted: item.cep,
        destLat,
        destLng
      });
    } catch (err: any) {
      setErrorMessage('Erro ao processar endereço selecionado: ' + err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  // Copiar Resumo para o Cliente
  const handleCopyQuote = () => {
    if (!calculationResult || calculationResult.isRestricted) return;

    const text = `🚚 *Cotação de Frete - AgenteX Logistics*
📍 *Destino:* ${calculationResult.logradouro}, ${calculationResult.bairro} - ${calculationResult.cityName} (CEP: ${calculationResult.cepFormatted})
📏 *Distância Estimada:* ${calculationResult.distanceKm} km
💵 *Taxa Base:* R$ ${calculationResult.baseFee.toFixed(2)}
🛣️ *Valor/KM (${calculationResult.kmRate.toFixed(2)}/km):* R$ ${calculationResult.kmTotalCost.toFixed(2)}
💰 *VALOR TOTAL DO FRETE:* R$ ${calculationResult.totalFreight.toFixed(2)}

_Validade da cotação: 3 dias úteis. Sujeito a alteração caso o endereço de entrega seja modificado._`;

    navigator.clipboard.writeText(text);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 3000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 space-y-6 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Header Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 uppercase">
                OPERAÇÕES & LOGÍSTICA
              </span>
              <h1 className="text-xl font-extrabold tracking-tight">Cálculo de Frete</h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Consulte pelo CEP (máscara automática 00000-000) ou pelo nome da Rua e Cidade para simular a rota e calcular o valor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold border border-slate-700 shadow-xs transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Configurações de Frete</span>
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form de Busca */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`p-6 rounded-2xl border shadow-xs ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            
            {/* Tabs de Seleção de Modo: CEP vs Rua & Cidade */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => {
                  setSearchMode('cep');
                  setErrorMessage('');
                  setAddressSuggestions([]);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  searchMode === 'cep'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Hash className="w-4 h-4" />
                <span>Buscar por CEP</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchMode('address');
                  setErrorMessage('');
                  setAddressSuggestions([]);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  searchMode === 'address'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Rua e Cidade</span>
              </button>
            </div>

            {/* FORMULÁRIO 1: BUSCA POR CEP COM MÁSCARA AUTOMÁTICA E VALIDAÇÃO VISUAL EM TEMPO REAL */}
            {searchMode === 'cep' && (
              <form id="shipping-calculator-form" onSubmit={handleCalculateByCep} className="space-y-4 cep-input">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="cep-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      CEP de Destino *
                    </label>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded transition-colors ${
                      cepValidationState === 'success'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : cepValidationState === 'error'
                        ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {cepValidationState === 'success' ? 'Válido: 00000-000' : 'Máscara: 00000-000'}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id="cep-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={cep}
                      onChange={handleCepChange}
                      onKeyDown={handleCepKeyDown}
                      onPaste={handleCepPaste}
                      onBlur={() => setCepTouched(true)}
                      placeholder="00000-000"
                      maxLength={9}
                      data-status={cepValidationState}
                      className={`cep-input w-full pl-10 pr-10 py-3 text-sm font-mono font-bold tracking-wider rounded-xl border-2 transition-all duration-150 focus:outline-none ${cepBorderClass}`}
                    />
                    <MapPin className={`w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-150 ${
                      cepValidationState === 'error'
                        ? 'text-red-500'
                        : cepValidationState === 'success'
                        ? 'text-emerald-500'
                        : 'text-slate-400'
                    }`} />
                    
                    {/* Indicador visual interno no input */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {cepValidationState === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-in zoom-in-50 duration-150" />
                      ) : cepValidationState === 'error' ? (
                        <AlertCircle className="w-5 h-5 text-red-500 animate-in zoom-in-50 duration-150" />
                      ) : null}
                    </div>
                  </div>

                  {/* Detalhe dinâmico com contagem e dica enquanto digita */}
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    {cepValidationState === 'error' ? (
                      <span className="text-red-500 font-medium">
                        Faltam {8 - cep.replace(/\D/g, '').length} dígitos para completar 00000-000
                      </span>
                    ) : cepValidationState === 'success' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Formato completo 00000-000
                      </span>
                    ) : (
                      <span className="text-slate-400">Digite apenas os números (o hífen é inserido automaticamente)</span>
                    )}
                    <span className="font-mono text-[10px] text-slate-400">
                      {cep.replace(/\D/g, '').length}/8 dígitos
                    </span>
                  </div>

                  {/* MENSAGEM DE ERRO VISUAL IMEDIATA ANTES DA SUBMISSÃO */}
                  {cepValidationState === 'error' && (
                    <div className="mt-2 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-extrabold block">Formato Incompleto</span>
                        <span className="text-[11px] font-normal leading-tight opacity-90">
                          {cepImmediateError || 'O CEP precisa ter exatamente 8 dígitos no formato 00000-000 (ex: 58000-000).'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* MENSAGEM DE SUCESSO VISUAL IMEDIATA QUANDO FORMATA CORRETO */}
                  {cepValidationState === 'success' && (
                    <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Formato <strong>{cep}</strong> validado com sucesso (00000-000). Pronto para o cálculo!</span>
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCalculating || !isCepStrictlyValid}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCalculating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Calculando Rota e Valores...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>{isCepStrictlyValid ? 'Calcular Frete por CEP' : 'Informe o CEP Completo (00000-000)'}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* FORMULÁRIO 2: BUSCA POR RUA E CIDADE */}
            {searchMode === 'address' && (
              <form onSubmit={handleCalculateByAddress} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    Nome da Rua / Avenida / Logradouro (Opcional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Ex: Av. Epitácio Pessoa (deixe em branco para calcular pela cidade)"
                      className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <Navigation className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                      Cidade *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Ex: João Pessoa, Cabedelo..."
                        className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                      <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                      Estado (UF) *
                    </label>
                    <select
                      value={selectedUf}
                      onChange={(e) => setSelectedUf(e.target.value)}
                      className={`w-full px-3 py-2.5 text-sm font-bold rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      {BRAZIL_STATES.map(s => (
                        <option key={s.uf} value={s.uf}>
                          {s.uf} - {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                      Número (Opcional)
                    </label>
                    <input
                      type="text"
                      value={streetNumber}
                      onChange={(e) => setStreetNumber(e.target.value)}
                      placeholder="Ex: 120"
                      className={`w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                      Bairro (Opcional)
                    </label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Ex: Tambaú, Manaíra..."
                      className={`w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCalculating}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCalculating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Buscando Rota por Endereço...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Calcular Frete por Cidade / Endereço</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Se houver múltiplas sugestões de ruas encontradas */}
            {addressSuggestions.length > 0 && (
              <div className="mt-4 p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block">
                  Encontramos mais de um trecho para essa rua. Clique para refinar:
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {addressSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs hover:border-blue-500 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold">{item.logradouro}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {item.bairro} - {item.localidade}/{item.uf} (CEP: {item.cep})
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Informações da Origem Configurada */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Depósito/Origem Configurado:</span>
                <span className="font-bold text-slate-900 dark:text-white">{settings.shipping_origin_city || 'João Pessoa - PB'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Valor por KM Rodado:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">R$ {parseFloat(settings.shipping_km_rate || '4.50').toFixed(2)}/km</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Taxa Base Fixo:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">R$ {parseFloat(settings.shipping_base_fee || '15.00').toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Resultado do Cálculo & Alertas */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Se a cidade estiver na Lista de Restrição */}
          {calculationResult?.isRestricted && (
            <div className="p-6 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-800 dark:text-rose-200 space-y-4 shadow-md animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl bg-rose-600 text-white shrink-0 shadow-sm">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white tracking-wide">
                    ENTREGA NÃO REALIZADA
                  </span>
                  <h3 className="text-lg font-bold mt-1 text-rose-900 dark:text-rose-100">
                    Não fazemos entregas para {calculationResult.cityName}
                  </h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                    Esta localidade consta na lista oficial de cidades com restrição de entrega da empresa.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs space-y-2 font-mono">
                <p>📍 <strong>Localidade consultada:</strong> {calculationResult.cityName}</p>
                <p>⚠️ <strong>Instrução ao Vendedor:</strong> Informe ao cliente que a entrega própria não está disponível para esta região. Sugira retirada no depósito ou despacho via transportadora externa.</p>
              </div>
            </div>
          )}

          {/* Resultado de Cálculo Bem Sucedido */}
          {calculationResult && !calculationResult.isRestricted && (
            <div className={`p-6 rounded-2xl border shadow-md space-y-6 animate-in fade-in duration-200 ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      ENTREGA DISPONÍVEL
                    </span>
                    <h3 className="text-lg font-bold mt-0.5">Cotação de Frete Calculada</h3>
                  </div>
                </div>

                <button
                  onClick={handleCopyQuote}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold border border-slate-700 shadow-xs transition-colors flex items-center gap-2"
                >
                  {copiedQuote ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
                  <span>{copiedQuote ? 'Cotação Copiada!' : 'Copiar para o Cliente'}</span>
                </button>
              </div>

              {/* Endereço Identificado */}
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  <MapPin className="w-4 h-4" />
                  <span>Endereço de Destino</span>
                </div>
                <p className="text-sm font-bold">
                  {calculationResult.logradouro}, {calculationResult.bairro}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cidade/UF: <strong>{calculationResult.cityName}</strong> | CEP: <strong>{calculationResult.cepFormatted}</strong>
                </p>
              </div>

              {/* Breakdown de Cálculo */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-1 dark:border-slate-800">
                  Detalhamento de Valores
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Distância Estimada
                    </span>
                    <span className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                      <Navigation className="w-4 h-4 text-purple-500" />
                      {calculationResult.distanceKm} km
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Taxa Base de Saída
                    </span>
                    <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                      R$ {calculationResult.baseFee.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Valor por KM ({calculationResult.kmRate.toFixed(2)}/km)
                    </span>
                    <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                      R$ {calculationResult.kmTotalCost.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Banner Total Grande */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-200 block">
                      Valor Total do Frete
                    </span>
                    <span className="text-2xl sm:text-3xl font-black">
                      {formatCurrency(calculationResult.totalFreight)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md">
                    <Truck className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder Inicial sem Cálculo */}
          {!calculationResult && (
            <div className={`p-12 rounded-2xl border text-center space-y-4 ${
              isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Truck className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold">Aguardando Consulta de Destino</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                  Selecione se deseja buscar pelo <strong>CEP (máscara 00000-000)</strong> ou pelo <strong>Nome da Rua e Cidade</strong>. O sistema valida os formatos, calcula a distância real em KM e verifica restrições de cidades cadastradas.
                </p>
              </div>
            </div>
          )}

          {/* Lista de Cidades Restritas em Exibição Rápida */}
          <div className={`p-5 rounded-2xl border space-y-3 ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Cidades Sem Entrega Cadastradas ({restrictedCitiesList.length})
                </h3>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Gerenciar Lista
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {restrictedCitiesList.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Nenhuma cidade restrita cadastrada.</span>
              ) : (
                restrictedCitiesList.map((city) => (
                  <span
                    key={city}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5"
                  >
                    <span>{city}</span>
                  </span>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modal de Configuração do Administrador */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-3xl shadow-2xl border p-6 my-8 ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Configurações de Frete (Administrador)</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Defina o valor do KM rodado e as cidades sem entrega</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              
              {/* Seção 1: Tarifas de Frete */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-1 dark:border-slate-800">
                  Tarifas e Valores Base
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Valor do KM Rodado (R$/km) *
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      value={adminKmRate}
                      onChange={e => setAdminKmRate(e.target.value)}
                      placeholder="Ex: 4.50"
                      required
                      className={`w-full px-3 py-2 text-sm rounded-xl border font-bold ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Taxa Base de Saída (R$) *
                    </label>
                    <input
                      type="number"
                      step="1.00"
                      value={adminBaseFee}
                      onChange={e => setAdminBaseFee(e.target.value)}
                      placeholder="Ex: 15.00"
                      required
                      className={`w-full px-3 py-2 text-sm rounded-xl border font-bold ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Cidade/UF de Origem do Depósito
                    </label>
                    <input
                      type="text"
                      value={adminOriginCity}
                      onChange={e => setAdminOriginCity(e.target.value)}
                      placeholder="Ex: João Pessoa - PB"
                      className={`w-full px-3 py-2 text-sm rounded-xl border ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      CEP do Depósito de Origem
                    </label>
                    <input
                      type="text"
                      value={adminOriginCep}
                      onChange={e => setAdminOriginCep(e.target.value)}
                      placeholder="Ex: 58000-000"
                      className={`w-full px-3 py-2 text-sm rounded-xl border font-mono ${
                        isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Lista de Cidades sem Entrega */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-1 dark:border-slate-800">
                  Cidades Onde Não Fazemos Entrega (Cidades Bloqueadas)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Adicione as cidades ou regiões que não são atendidas pela frota de entrega própria.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newRestrictedCity}
                    onChange={e => setNewRestrictedCity(e.target.value)}
                    placeholder="Ex: Curitiba - PR"
                    className={`flex-1 px-3 py-2 text-sm rounded-xl border ${
                      isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddRestrictedCity}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 max-h-48 overflow-y-auto p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-500/5">
                  {restrictedCitiesList.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Nenhuma cidade restrita adicionada.</span>
                  ) : (
                    restrictedCitiesList.map(city => (
                      <span
                        key={city}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-2"
                      >
                        <span>{city}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRestrictedCity(city)}
                          className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 p-0.5 rounded"
                          title="Remover cidade"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Salvar Configurações</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
