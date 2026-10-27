'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, User, Mail, Phone, Briefcase, MapPin, Send, Check, X, ShieldCheck, Users, CheckSquare, Square, Target, Package, Truck, MessageCircle, BarChart3, Trash2, DollarSign, Home, ClipboardList, ListTodo, ArrowRightLeft, Wrench, Tag, TrendingUp, Radio, Settings, ShoppingBag, LayoutGrid, Eye, EyeOff, RotateCcw, Wind, Award, Gift, Download, ChevronDown, ChevronUp, FileSpreadsheet, Sparkles } from 'lucide-react';
import { SkillSelector } from '@/components/SkillSelector';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter, useParams } from 'next/navigation';
import { supabase, isSupabaseConfigured, handleSupabaseAuthError } from '@/lib/supabase';
import { getInactiveCollaboratorIds, saveCollaboratorStatusLocal } from '@/lib/collaboratorStatus';
import { useTheme } from '@/hooks/useTheme';
import { useRole, HOME_PAGE_CARDS, getDefaultHomeCardsForRole } from '@/hooks/useRole';
import { useUI } from '@/hooks/useUI';
import { authFetch } from '@/lib/authFetch';
import { prefetchCache } from '@/lib/prefetchCache';

export default function EditCollaboratorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { isDarkMode } = useTheme();
  const { isAdmin: isSystemAdmin, canManageHomeCards, user: loggedInUser, refreshUser } = useRole();
  const { showToast, showConfirm } = useUI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [initialPhoto, setInitialPhoto] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin' | 'vendedor' | 'entregador' | 'estoque' | 'gerente' | 'supervisor' | 'caixa'>('user');
  const [canAccessLeads, setCanAccessLeads] = useState(false);
  const [canAccessDeliveries, setCanAccessDeliveries] = useState(false);
  const [canAccessTransfers, setCanAccessTransfers] = useState(false);
  const [canAccessWarranties, setCanAccessWarranties] = useState(false);
  const [canAccessReports, setCanAccessReports] = useState(false);
  const [canAccessWhatsapp, setCanAccessWhatsapp] = useState(false);
  const [receivesLeads, setReceivesLeads] = useState(true);
  const [submodules, setSubmodules] = useState<Record<string, boolean>>({
    home: true,
    products: true,
    split_table: true,
    split_table_agratto: true,
    split_table_gree: true,
    split_table_elgin: true,
    split_table_download: true,
    loyalty: true,
    loyalty_view_bonus: true,
    loyalty_view_expiring: true,
    loyalty_statements: true,
    loyalty_whatsapp: true,
    loyalty_import: false,
    tasks: true,
    demands: true,
    routes: true,
    whatsapp: false,
    leads: false,
    social_media: false,
    deliveries: false,
    truck_history: false,
    transfers: false,
    warranties: false,
    assistances: false,
    price_research: false,
    sales: false,
    reports: false,
    live_panel: false,
    collaborators: false,
    commissions: false,
    settings: false,
    adriano_commissions: false,
    permanent_tasks: false
  });
  const [homeCards, setHomeCards] = useState<Record<string, boolean>>(() =>
    getDefaultHomeCardsForRole('user')
  );

  const ROLE_LABELS: Record<typeof userRole, string> = {
    admin: 'Administrador',
    gerente: 'Gerente',
    supervisor: 'Supervisor',
    caixa: 'Caixa',
    vendedor: 'Vendedor',
    entregador: 'Entregador',
    estoque: 'Estoquista',
    user: 'Colaborador'
  };

  const getRoleSubmoduleDefaults = (role: typeof userRole): Record<string, boolean> => {
    if (role === 'admin') {
      return {
        home: true,
        products: true,
        split_table: true,
        split_table_agratto: true,
        split_table_gree: true,
        split_table_elgin: true,
        split_table_download: true,
        loyalty: true,
        loyalty_view_bonus: true,
        loyalty_view_expiring: true,
        loyalty_statements: true,
        loyalty_whatsapp: true,
        loyalty_import: true,
        tasks: true,
        demands: true,
        routes: true,
        whatsapp: true,
        leads: true,
        social_media: true,
        deliveries: true,
        truck_history: true,
        transfers: true,
        warranties: true,
        assistances: true,
        price_research: true,
        sales: true,
        reports: true,
        live_panel: true,
        collaborators: true,
        commissions: true,
        settings: true,
        adriano_commissions: true,
        permanent_tasks: true
      };
    } else if (role === 'gerente' || role === 'supervisor') {
      return {
        home: true,
        products: true,
        split_table: true,
        split_table_agratto: true,
        split_table_gree: true,
        split_table_elgin: true,
        split_table_download: true,
        loyalty: true,
        loyalty_view_bonus: true,
        loyalty_view_expiring: true,
        loyalty_statements: true,
        loyalty_whatsapp: true,
        loyalty_import: true,
        tasks: true,
        demands: true,
        routes: true,
        whatsapp: true,
        leads: true,
        social_media: true,
        deliveries: true,
        truck_history: true,
        transfers: true,
        warranties: true,
        assistances: true,
        price_research: true,
        sales: true,
        reports: true,
        live_panel: true,
        collaborators: true,
        commissions: false,
        settings: false,
        adriano_commissions: false,
        permanent_tasks: true
      };
    } else if (role === 'vendedor') {
      return {
        home: true,
        products: true,
        split_table: true,
        split_table_agratto: true,
        split_table_gree: true,
        split_table_elgin: true,
        split_table_download: true,
        loyalty: true,
        loyalty_view_bonus: true,
        loyalty_view_expiring: true,
        loyalty_statements: true,
        loyalty_whatsapp: true,
        loyalty_import: false,
        tasks: true,
        demands: true,
        routes: true,
        whatsapp: true,
        leads: true,
        social_media: true,
        deliveries: true,
        truck_history: false,
        transfers: false,
        warranties: true,
        assistances: true,
        price_research: true,
        sales: true,
        reports: true,
        live_panel: false,
        collaborators: false,
        commissions: false,
        settings: false,
        adriano_commissions: false,
        permanent_tasks: false
      };
    } else if (role === 'caixa') {
      return {
        home: true,
        products: true,
        split_table: true,
        split_table_agratto: true,
        split_table_gree: true,
        split_table_elgin: true,
        split_table_download: false,
        loyalty: true,
        loyalty_view_bonus: true,
        loyalty_view_expiring: true,
        loyalty_statements: true,
        loyalty_whatsapp: false,
        loyalty_import: false,
        tasks: true,
        demands: false,
        routes: false,
        whatsapp: false,
        leads: false,
        social_media: false,
        deliveries: true,
        truck_history: false,
        transfers: true,
        warranties: true,
        assistances: false,
        price_research: false,
        sales: true,
        reports: true,
        live_panel: false,
        collaborators: false,
        commissions: false,
        settings: false,
        adriano_commissions: false,
        permanent_tasks: false
      };
    } else if (role === 'entregador') {
      return {
        home: true,
        products: true,
        split_table: false,
        split_table_agratto: false,
        split_table_gree: false,
        split_table_elgin: false,
        split_table_download: false,
        loyalty: false,
        loyalty_view_bonus: false,
        loyalty_view_expiring: false,
        loyalty_statements: false,
        loyalty_whatsapp: false,
        loyalty_import: false,
        tasks: true,
        demands: false,
        routes: true,
        whatsapp: false,
        leads: false,
        social_media: false,
        deliveries: true,
        truck_history: true,
        transfers: false,
        warranties: false,
        assistances: false,
        price_research: false,
        sales: false,
        reports: false,
        live_panel: false,
        collaborators: false,
        commissions: false,
        settings: false,
        adriano_commissions: false,
        permanent_tasks: false
      };
    } else if (role === 'estoque') {
      return {
        home: true,
        products: true,
        split_table: false,
        split_table_agratto: false,
        split_table_gree: false,
        split_table_elgin: false,
        split_table_download: false,
        loyalty: false,
        loyalty_view_bonus: false,
        loyalty_view_expiring: false,
        loyalty_statements: false,
        loyalty_whatsapp: false,
        loyalty_import: false,
        tasks: true,
        demands: true,
        routes: false,
        whatsapp: false,
        leads: false,
        social_media: false,
        deliveries: true,
        truck_history: true,
        transfers: true,
        warranties: true,
        assistances: true,
        price_research: true,
        sales: false,
        reports: false,
        live_panel: false,
        collaborators: false,
        commissions: false,
        settings: false,
        adriano_commissions: false,
        permanent_tasks: false
      };
    }
    return {
      home: true,
      products: true,
      split_table: false,
      split_table_agratto: false,
      split_table_gree: false,
      split_table_elgin: false,
      split_table_download: false,
      loyalty: false,
      loyalty_view_bonus: false,
      loyalty_view_expiring: false,
      loyalty_statements: false,
      loyalty_whatsapp: false,
      loyalty_import: false,
      tasks: true,
      demands: false,
      routes: false,
      whatsapp: false,
      leads: false,
      social_media: false,
      deliveries: false,
      truck_history: false,
      transfers: false,
      warranties: false,
      assistances: false,
      price_research: false,
      sales: false,
      reports: false,
      live_panel: false,
      collaborators: false,
      commissions: false,
      settings: false,
      adriano_commissions: false,
      permanent_tasks: false
    };
  };

  const handleRoleChange = (role: typeof userRole) => {
    setUserRole(role);
    setFormData(prev => ({
      ...prev,
      role: ROLE_LABELS[role] || 'Colaborador'
    }));
    const defaults = getRoleSubmoduleDefaults(role);
    setSubmodules(defaults);
    setHomeCards(getDefaultHomeCardsForRole(role));
  };
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [initialPassword, setInitialPassword] = useState('');
  const [systemPermissions, setSystemPermissions] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    role: '',
    email: '',
    phone: '',
    location: '',
    password: ''
  });

  useEffect(() => {
    async function fetchCollaborator() {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        console.error('Invalid UUID format:', id);
        showToast('ID do colaborador inválido.', 'error');
        router.push('/collaborators');
        return;
      }
      try {
        let profile: any = null;
        let skills: any[] = [];
        let savedAccessEntry: any = null;

        // 1. Tentar buscar via API com service_role (ignora cache/RLS/JWT expirado)
        try {
          const apiRes = await authFetch(`/api/collaborators?id=${id}&t=${Date.now()}`, {
            cache: 'no-store'
          });
          if (apiRes.ok) {
            const apiJson = await apiRes.json();
            if (apiJson?.collaborator) {
              profile = apiJson.collaborator;
              skills = apiJson.skills || [];
              savedAccessEntry = apiJson.accessConfig || null;
            }
          }
        } catch (apiFetchErr) {
          console.warn('Fallback para busca direta de colaborador:', apiFetchErr);
        }

        // 2. Fallback direto no cliente Supabase se necessário
        if (!profile) {
          const [{ data: sbProfile, error: profileError }, { data: sbSkills }, { data: accessConfigRow }] = await Promise.all([
            supabase
              .from('profiles')
              .select('*')
              .eq('id', id)
              .single(),
            supabase
              .from('profile_skills')
              .select('skill')
              .eq('profile_id', id),
            supabase
              .from('system_settings')
              .select('value')
              .eq('key', 'collaborator_access_config')
              .maybeSingle()
          ]);

          if (profileError) throw profileError;
          profile = sbProfile;
          skills = sbSkills || [];
          savedAccessEntry =
            accessConfigRow?.value && typeof accessConfigRow.value === 'object'
              ? accessConfigRow.value[id]
              : null;
        }

        let derivedRole: typeof userRole = 'user';
        const savedLevel = (savedAccessEntry?.accessLevel || profile.access_level || '').toLowerCase().trim();
        const pRole = (profile.role || '').toLowerCase().trim();
        const pType = (profile.type || '').toLowerCase().trim();

        const validLevels = ['admin', 'gerente', 'supervisor', 'caixa', 'vendedor', 'entregador', 'estoque', 'user'];
        if (savedLevel && validLevels.includes(savedLevel)) {
          derivedRole = savedLevel as typeof userRole;
        } else if (pType && validLevels.includes(pType) && pType !== 'user') {
          derivedRole = pType as typeof userRole;
        } else if (pType === 'admin' || pRole.includes('admin') || pRole.includes('administrador')) {
          derivedRole = 'admin';
        } else if (pRole.includes('gerente') || pRole.includes('gestor')) {
          derivedRole = 'gerente';
        } else if (pRole.includes('supervisor') || pRole.includes('coordenador')) {
          derivedRole = 'supervisor';
        } else if (pRole.includes('caixa') || pRole.includes('financeiro') || pRole.includes('secretaria')) {
          derivedRole = 'caixa';
        } else if (pRole.includes('vendedor') || pRole.includes('venda')) {
          derivedRole = 'vendedor';
        } else if (pRole.includes('entregador') || pRole.includes('entrega') || pRole.includes('motorista')) {
          derivedRole = 'entregador';
        } else if (pRole.includes('estoque') || pRole.includes('estoquista')) {
          derivedRole = 'estoque';
        }

        const fallbackUsername =
          profile.username ||
          (profile.email ? String(profile.email).split('@')[0] : '') ||
          (profile.name ? String(profile.name).trim().toLowerCase().replace(/\s+/g, '.') : '');

        setFormData({
          name: profile.name || '',
          username: fallbackUsername,
          role: profile.role && profile.role.toLowerCase() !== 'user' ? profile.role : (ROLE_LABELS[derivedRole] || 'Colaborador'),
          email: profile.email || '',
          phone: profile.phone || '',
          location: profile.location || '',
          password: profile.password || ''
        });
        setInitialPassword(profile.password || '');
        setUserRole(derivedRole);
        const isInactive = getInactiveCollaboratorIds().includes(id as string) || profile.status === 'Inativo';
        setStatus(isInactive ? 'Inativo' : 'Ativo');

        const roleDefaults = getRoleSubmoduleDefaults(derivedRole);
        const savedSubs = savedAccessEntry?.submodules || profile.submodules || {};

        setSubmodules({
          home: savedSubs.home ?? profile.can_access_home ?? roleDefaults.home ?? true,
          products: savedSubs.products ?? profile.can_access_products ?? roleDefaults.products ?? true,
          split_table: savedSubs.split_table ?? profile.can_access_split_table ?? roleDefaults.split_table ?? true,
          split_table_agratto: savedSubs.split_table_agratto ?? roleDefaults.split_table_agratto ?? true,
          split_table_gree: savedSubs.split_table_gree ?? roleDefaults.split_table_gree ?? true,
          split_table_elgin: savedSubs.split_table_elgin ?? roleDefaults.split_table_elgin ?? true,
          split_table_download: savedSubs.split_table_download ?? roleDefaults.split_table_download ?? true,
          loyalty: savedSubs.loyalty ?? profile.can_access_loyalty ?? roleDefaults.loyalty ?? true,
          loyalty_view_bonus: savedSubs.loyalty_view_bonus ?? roleDefaults.loyalty_view_bonus ?? true,
          loyalty_view_expiring: savedSubs.loyalty_view_expiring ?? roleDefaults.loyalty_view_expiring ?? true,
          loyalty_statements: savedSubs.loyalty_statements ?? roleDefaults.loyalty_statements ?? true,
          loyalty_whatsapp: savedSubs.loyalty_whatsapp ?? roleDefaults.loyalty_whatsapp ?? true,
          loyalty_import: savedSubs.loyalty_import ?? roleDefaults.loyalty_import ?? false,
          tasks: savedSubs.tasks ?? profile.can_access_tasks ?? roleDefaults.tasks ?? true,
          demands: savedSubs.demands ?? profile.can_access_demands ?? roleDefaults.demands ?? true,
          routes: savedSubs.routes ?? profile.can_access_routes ?? roleDefaults.routes ?? true,
          whatsapp: savedSubs.whatsapp ?? profile.can_access_whatsapp ?? roleDefaults.whatsapp ?? false,
          leads: savedSubs.leads ?? profile.can_access_leads ?? roleDefaults.leads ?? false,
          social_media: savedSubs.social_media ?? profile.can_access_social_media ?? roleDefaults.social_media ?? false,
          deliveries: savedSubs.deliveries ?? profile.can_access_deliveries ?? roleDefaults.deliveries ?? false,
          truck_history: savedSubs.truck_history ?? profile.can_access_truck_history ?? roleDefaults.truck_history ?? false,
          transfers: savedSubs.transfers ?? profile.can_access_transfers ?? roleDefaults.transfers ?? false,
          warranties: savedSubs.warranties ?? profile.can_access_warranties ?? roleDefaults.warranties ?? false,
          assistances: savedSubs.assistances ?? profile.can_access_assistances ?? roleDefaults.assistances ?? false,
          price_research: savedSubs.price_research ?? profile.can_access_price_research ?? roleDefaults.price_research ?? false,
          sales: savedSubs.sales ?? profile.can_access_sales ?? roleDefaults.sales ?? false,
          reports: savedSubs.reports ?? profile.can_access_reports ?? roleDefaults.reports ?? false,
          live_panel: savedSubs.live_panel ?? profile.can_access_live_panel ?? roleDefaults.live_panel ?? false,
          collaborators: savedSubs.collaborators ?? profile.can_access_collaborators ?? roleDefaults.collaborators ?? false,
          commissions: savedSubs.commissions ?? profile.can_access_commissions ?? roleDefaults.commissions ?? false,
          settings: savedSubs.settings ?? profile.can_access_settings ?? roleDefaults.settings ?? false,
          adriano_commissions: savedSubs.adriano_commissions ?? profile.can_access_adriano_commissions ?? roleDefaults.adriano_commissions ?? false,
          permanent_tasks: savedSubs.permanent_tasks ?? profile.can_access_permanent_tasks ?? roleDefaults.permanent_tasks ?? false,
        });
        const cardDefaults = getDefaultHomeCardsForRole(derivedRole);
        const savedCards = savedAccessEntry?.homeCards || profile.homeCards || {};
        setHomeCards({
          ...cardDefaults,
          ...savedCards,
        });
        setReceivesLeads(profile.receives_leads !== false);
        setPhoto(profile.image_url);
        setInitialPhoto(profile.image_url);
        setSelectedSkills(skills?.map((s: any) => s.skill) || []);
      } catch (error: any) {
        if (error?.code === 'PGRST303' || error?.message?.includes('JWT expired') || error?.message?.includes('jwt expired')) {
          await handleSupabaseAuthError(error);
          return;
        }
        console.error('Error fetching collaborator:', error);
        showToast('Erro ao carregar dados do colaborador.', 'error');
        router.push('/collaborators');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchCollaborator();
    }

    async function fetchSystemPermissions() {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'module_permissions')
          .single();
        if (data?.value) {
          setSystemPermissions(data.value);
        }
      } catch (err: any) {
        const isNetworkError = err?.message?.includes('Failed to fetch') || err?.name === 'TypeError' || err instanceof TypeError;
        if (!isNetworkError) {
          console.error('Error fetching system permissions:', err);
        }
      }
    }
    fetchSystemPermissions();
  }, [id, router]);



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        return;
      }
      
      setImageFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        // Create an image element to resize
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Converte o canvas para Blob binário com 80% de qualidade para o Supabase Storage
          canvas.toBlob((blob) => {
            if (blob) {
              setImageBlob(blob);
            }
          }, 'image/jpeg', 0.8);

          // Compress to JPEG with 0.8 quality for preview
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPhoto(dataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSupabaseConfigured) {
      showToast('Configuração do Supabase ausente.', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      saveCollaboratorStatusLocal(id as string, status);

      const cleanName = formData.name?.trim();
      const cleanEmail = formData.email?.trim() ? formData.email.trim().toLowerCase() : null;
      const cleanUsername = formData.username?.trim()
        ? formData.username.trim().toLowerCase()
        : (cleanEmail ? cleanEmail.split('@')[0] : (cleanName ? cleanName.toLowerCase().replace(/\s+/g, '.') : null));
      const cleanPhone = formData.phone?.trim() ? formData.phone.trim() : null;
      const cleanLocation = formData.location?.trim() ? formData.location.trim() : null;
      const cleanPassword = formData.password?.trim() ? formData.password.trim() : null;

      if (!cleanName) {
        throw new Error('Por favor, informe o nome do colaborador.');
      }

      if (cleanPassword && cleanPassword.length < 6) {
        throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
      }

      // profiles_type_check aceita: 'admin', 'user', 'vendedor', 'entregador', 'estoque', 'gerente', 'supervisor'
      const dbType = userRole === 'caixa' ? 'user' : userRole;
      const resolvedRoleTitle = formData.role?.trim() || ROLE_LABELS[userRole] || 'Colaborador';

      let finalImageUrl = photo;

      // Upload do arquivo binário real para o bucket 'avatars' no Supabase Storage se uma nova foto foi selecionada
      if (imageBlob) {
        const fileName = `${id}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, imageBlob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          finalImageUrl = publicUrlData.publicUrl;
        } else {
          try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', imageBlob, fileName);
            uploadFormData.append('fileName', fileName);
            const res = await fetch('/api/upload-avatar', {
              method: 'POST',
              body: uploadFormData
            });
            const resData = await res.json();
            if (resData?.url) {
              finalImageUrl = resData.url;
            }
          } catch (_) {}

          if (!finalImageUrl && photo) {
            finalImageUrl = photo;
          }
        }
      }

      const finalSubmodules = {
        home: userRole === 'admin' ? true : !!submodules.home,
        products: userRole === 'admin' ? true : !!submodules.products,
        split_table: userRole === 'admin' ? true : !!submodules.split_table,
        split_table_agratto: userRole === 'admin' ? true : !!submodules.split_table_agratto,
        split_table_gree: userRole === 'admin' ? true : !!submodules.split_table_gree,
        split_table_elgin: userRole === 'admin' ? true : !!submodules.split_table_elgin,
        split_table_download: userRole === 'admin' ? true : !!submodules.split_table_download,
        loyalty: userRole === 'admin' ? true : !!submodules.loyalty,
        loyalty_view_bonus: userRole === 'admin' ? true : !!submodules.loyalty_view_bonus,
        loyalty_view_expiring: userRole === 'admin' ? true : !!submodules.loyalty_view_expiring,
        loyalty_statements: userRole === 'admin' ? true : !!submodules.loyalty_statements,
        loyalty_whatsapp: userRole === 'admin' ? true : !!submodules.loyalty_whatsapp,
        loyalty_import: userRole === 'admin' ? true : !!submodules.loyalty_import,
        tasks: userRole === 'admin' ? true : !!submodules.tasks,
        demands: userRole === 'admin' ? true : !!submodules.demands,
        routes: userRole === 'admin' ? true : !!submodules.routes,
        whatsapp: userRole === 'admin' ? true : !!submodules.whatsapp,
        leads: userRole === 'admin' ? true : !!submodules.leads,
        social_media: userRole === 'admin' ? true : !!submodules.social_media,
        deliveries: userRole === 'admin' ? true : !!submodules.deliveries,
        truck_history: userRole === 'admin' ? true : !!submodules.truck_history,
        transfers: userRole === 'admin' ? true : !!submodules.transfers,
        warranties: userRole === 'admin' ? true : !!submodules.warranties,
        assistances: userRole === 'admin' ? true : !!submodules.assistances,
        price_research: userRole === 'admin' ? true : !!submodules.price_research,
        sales: userRole === 'admin' ? true : !!submodules.sales,
        reports: userRole === 'admin' ? true : !!submodules.reports,
        live_panel: userRole === 'admin' ? true : !!submodules.live_panel,
        collaborators: userRole === 'admin' ? true : !!submodules.collaborators,
        commissions: userRole === 'admin' ? true : !!submodules.commissions,
        settings: userRole === 'admin' ? true : !!submodules.settings,
        adriano_commissions: userRole === 'admin' ? true : !!submodules.adriano_commissions,
        permanent_tasks: userRole === 'admin' ? true : !!submodules.permanent_tasks,
      };

      // Envia atualização para a API segura com service_role (atualiza Supabase Auth, profiles e system_settings)
      try {
        const apiResponse = await authFetch('/api/collaborators', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            name: cleanName,
            username: cleanUsername,
            role: resolvedRoleTitle,
            email: cleanEmail,
            phone: cleanPhone,
            location: cleanLocation,
            status: status,
            type: dbType,
            access_level: userRole,
            password: cleanPassword || undefined,
            image_url: finalImageUrl,
            skills: selectedSkills,
            can_access_home: finalSubmodules.home,
            can_access_products: finalSubmodules.products,
            can_access_split_table: finalSubmodules.split_table,
            can_access_loyalty: finalSubmodules.loyalty,
            can_access_tasks: finalSubmodules.tasks,
            can_access_demands: finalSubmodules.demands,
            can_access_routes: finalSubmodules.routes,
            can_access_whatsapp: finalSubmodules.whatsapp,
            can_access_leads: finalSubmodules.leads,
            can_access_social_media: finalSubmodules.social_media,
            can_access_deliveries: finalSubmodules.deliveries,
            can_access_truck_history: finalSubmodules.truck_history,
            can_access_transfers: finalSubmodules.transfers,
            can_access_warranties: finalSubmodules.warranties,
            can_access_assistances: finalSubmodules.assistances,
            can_access_price_research: finalSubmodules.price_research,
            can_access_sales: finalSubmodules.sales,
            can_access_reports: finalSubmodules.reports,
            can_access_live_panel: finalSubmodules.live_panel,
            can_access_collaborators: finalSubmodules.collaborators,
            can_access_commissions: finalSubmodules.commissions,
            can_access_settings: finalSubmodules.settings,
            can_access_adriano_commissions: finalSubmodules.adriano_commissions,
            can_access_permanent_tasks: finalSubmodules.permanent_tasks,
            submodules: finalSubmodules,
            receives_leads: receivesLeads,
            homeCards,
          })
        });

        const apiResult = await apiResponse.json();
        if (!apiResponse.ok && apiResult?.error) {
          console.warn('Aviso retornado pela API /api/collaborators:', apiResult.error);
        }
      } catch (apiErr) {
        console.warn('Falha na chamada da API /api/collaborators (tentando sincronização direta):', apiErr);
      }

      // Sincronização direta de garantia na tabela profiles (apenas colunas reais existentes em profiles)
      try {
        const clientPayload: any = {
          name: cleanName,
          username: cleanUsername,
          role: resolvedRoleTitle,
          email: cleanEmail,
          phone: cleanPhone,
          location: cleanLocation,
          status: status,
          type: dbType,
          image_url: finalImageUrl,
          receives_leads: receivesLeads,
          can_access_whatsapp: finalSubmodules.whatsapp,
          can_access_leads: finalSubmodules.leads,
          can_access_social_media: finalSubmodules.social_media,
          can_access_deliveries: finalSubmodules.deliveries,
          can_access_transfers: finalSubmodules.transfers,
          can_access_warranties: finalSubmodules.warranties,
          can_access_sales: finalSubmodules.sales,
          can_access_reports: finalSubmodules.reports,
        };

        const { error: directError } = await supabase
          .from('profiles')
          .update(clientPayload)
          .eq('id', id);

        if (directError) {
          await supabase
            .from('profiles')
            .update({
              ...clientPayload,
              type: userRole === 'admin' ? 'admin' : 'user',
            })
            .eq('id', id);
        }

        // Persistir também em system_settings para preservar accessLevel exato (ex: caixa), todos os submódulos e cards da página inicial
        const { data: existingConfig } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'collaborator_access_config')
          .maybeSingle();

        const currentMap =
          existingConfig?.value && typeof existingConfig.value === 'object'
            ? existingConfig.value
            : {};

        await supabase.from('system_settings').upsert({
          key: 'collaborator_access_config',
          value: {
            ...currentMap,
            [id]: {
              accessLevel: userRole,
              submodules: finalSubmodules,
              homeCards,
              updatedAt: new Date().toISOString(),
            },
          },
          updated_at: new Date().toISOString(),
        });
        window.dispatchEvent(new CustomEvent('collaborator-access-updated'));
      } catch (directErr) {
        console.warn('Aviso ao sincronizar profiles diretamente:', directErr);
      }

      // Invalidar caches em memória e sessionStorage para refletir imediatamente na listagem
      try {
        prefetchCache.invalidateCache();
        sessionStorage.removeItem('prefetch_collaborators');
        sessionStorage.removeItem('prefetch_cache_collaborators');
      } catch {}

      if (loggedInUser?.id === id) {
        await refreshUser();
      }

      setIsSubmitting(false);
      setShowSuccess(true);
      showToast('Alterações salvas com sucesso!', 'success');
      setTimeout(() => {
        router.refresh();
        router.push(`/collaborators/${id}`);
      }, 900);
    } catch (error: any) {
      console.error('Error updating collaborator:', error);
      setIsSubmitting(false);
      
      const errorMessage = error instanceof Error ? error.message : (error?.message || error?.details || 'Erro ao atualizar colaborador.');
      showToast(errorMessage, 'error');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="size-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const handleDeleteCollaborator = () => {
    showConfirm({
      title: 'Excluir Cadastro do Colaborador',
      message: `Tem certeza que deseja excluir permanentemente o cadastro de "${formData.name || 'este colaborador'}"? Esta ação não poderá ser desfeita.`,
      type: 'danger',
      confirmLabel: 'Excluir Colaborador',
      cancelLabel: 'Cancelar',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          // Chama a API para exclusão completa
          const apiRes = await fetch(`/api/collaborators?id=${id}`, {
            method: 'DELETE'
          });
          const apiJson = await apiRes.json();

          if (!apiRes.ok && apiJson.error) {
            // Tenta fallback direto no Supabase se a rota falhar
            const { error: sbError } = await supabase.from('profiles').delete().eq('id', id);
            if (sbError) {
              console.warn('Falha na exclusão direta Supabase:', sbError.message);
              saveCollaboratorStatusLocal(id, 'Inativo');
              await supabase.from('profiles').update({ status: 'Inativo' }).eq('id', id);
            }
          }

          showToast('Cadastro do colaborador excluído com sucesso!', 'success');
          router.push('/collaborators');
        } catch (err) {
          console.error('Erro ao excluir colaborador:', err);
          showToast('Erro ao excluir colaborador.', 'error');
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  return (
    <div className={`flex flex-col h-full transition-colors ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <header className={`sticky top-0 z-10 flex items-center px-4 py-6 border-b transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <Link href={`/collaborators/${id}`} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
          <ArrowLeft size={20} />
        </Link>
        <h2 className={`ml-2 text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Editar Colaborador</h2>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Photo Upload */}
        <div className="flex flex-col items-center gap-4">
          <div 
            onClick={handlePhotoClick}
            className={`relative size-32 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-all group overflow-hidden ${
              isDarkMode ? 'bg-slate-900 border-slate-700 hover:border-blue-500' : 'bg-slate-100 border-slate-300 hover:border-blue-600 hover:bg-blue-50'
            }`}
          >
            {photo ? (
              <Image 
                src={photo} 
                alt="Preview" 
                fill 
                className="object-cover"
              />
            ) : (
              <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-600">
                <Camera size={32} />
                <span className="text-[10px] font-bold uppercase mt-1">Carregar Foto</span>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
          </div>
        </div>

        <div className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              <User size={14} />
              Nome Completo
            </label>
            <input 
              required
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full h-14 px-4 rounded-xl border focus:ring-2 focus:ring-blue-600 transition-all outline-none font-medium ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`} 
              placeholder="ex: João Silva" 
              type="text"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              <User size={14} className="text-blue-600" />
              Usuário de Login
            </label>
            <input 
              required
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className={`w-full h-14 px-4 rounded-xl border focus:ring-2 focus:ring-blue-600 transition-all outline-none font-medium ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`} 
              placeholder="ex: joao.silva" 
              type="text"
            />
            <p className="text-[10px] text-slate-400 italic">Este nome é usado para entrar no sistema.</p>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              <Briefcase size={14} />
              Cargo / Função
            </label>
            <input 
              required
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className={`w-full h-14 px-4 rounded-xl border focus:ring-2 focus:ring-blue-600 transition-all outline-none font-medium ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`} 
              placeholder="ex: Estoquista" 
              type="text"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              <Mail size={14} />
              E-mail
            </label>
            <input 
              required
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full h-14 px-4 rounded-xl border focus:ring-2 focus:ring-blue-600 transition-all outline-none font-medium ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`} 
              placeholder="ex: joao@empresa.com" 
              type="email"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              <Phone size={14} />
              Telefone
            </label>
            <input 
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={`w-full h-14 px-4 rounded-xl border focus:ring-2 focus:ring-blue-600 transition-all outline-none font-medium ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`} 
              placeholder="+55 (11) 99999-0000" 
              type="tel"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              <MapPin size={14} />
              Localização / Setor
            </label>
            <input 
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className={`w-full h-14 px-4 rounded-xl border focus:ring-2 focus:ring-blue-600 transition-all outline-none font-medium ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`} 
              placeholder="ex: Setor de Estoque" 
              type="text"
            />
          </div>

          {/* Password Reset */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              <ShieldCheck size={14} />
              Redefinir Senha
            </label>
            <input 
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full h-14 px-4 rounded-xl border focus:ring-2 focus:ring-blue-600 transition-all outline-none font-medium ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`} 
              placeholder="Nova senha para o colaborador" 
              type="text"
            />
            <p className="text-[10px] text-slate-400 italic">Como administrador, você pode visualizar e alterar a senha deste colaborador.</p>
          </div>

          {/* Skills / Specialties */}
          <div className="space-y-3">
            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              <CheckSquare size={14} />
              Habilidades e Especialidades
            </label>
            <SkillSelector 
              selectedSkills={selectedSkills} 
              onChange={setSelectedSkills} 
              isDarkMode={isDarkMode}
            />
            <p className="text-[10px] text-slate-400 italic">Busque ou adicione as especialidades do colaborador.</p>
          </div>

          {/* Status do Colaborador (Ativo / Inativo) */}
          <div className={`space-y-3 pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              <User size={14} className="text-amber-500" />
              Status na Empresa
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('Ativo')}
                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                  status === 'Ativo'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="size-2 rounded-full bg-emerald-400"></span>
                Ativo
              </button>

              <button
                type="button"
                onClick={() => setStatus('Inativo')}
                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                  status === 'Inativo'
                    ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/20'
                    : isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="size-2 rounded-full bg-rose-400"></span>
                Inativo (Desligado da Empresa)
              </button>
            </div>

            {status === 'Inativo' && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="font-mono">⚠️</span> Colaborador Inativo / Desligado
                </p>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  O colaborador inativo não conseguirá realizar login e não aparecerá nas opções para delegação de novas tarefas na empresa.
                </p>
              </div>
            )}
          </div>

          {/* User Type */}
          <div className={`space-y-3 pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
              <ShieldCheck size={14} />
              Nível de Acesso
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleRoleChange('user')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  userRole === 'user' 
                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                    : (isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-500' : 'border-slate-100 bg-white text-slate-400')
                }`}
              >
                <Users size={20} />
                <span className="text-[10px] font-bold">Usuário</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('gerente')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  userRole === 'gerente' 
                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                    : (isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-500' : 'border-slate-100 bg-white text-slate-400')
                }`}
              >
                <Briefcase size={20} />
                <span className="text-[10px] font-bold">Gerente</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('supervisor')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  userRole === 'supervisor' 
                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                    : (isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-500' : 'border-slate-100 bg-white text-slate-400')
                }`}
              >
                <CheckSquare size={20} />
                <span className="text-[10px] font-bold">Supervisor</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('caixa')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  userRole === 'caixa' 
                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                    : (isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-500' : 'border-slate-100 bg-white text-slate-400')
                }`}
              >
                <DollarSign size={20} />
                <span className="text-[10px] font-bold">Caixa</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('vendedor')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  userRole === 'vendedor' 
                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                    : (isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-500' : 'border-slate-100 bg-white text-slate-400')
                }`}
              >
                <Target size={20} />
                <span className="text-[10px] font-bold">Vendedor</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('entregador')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  userRole === 'entregador' 
                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                    : (isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-500' : 'border-slate-100 bg-white text-slate-400')
                }`}
              >
                <Truck size={20} />
                <span className="text-[10px] font-bold">Entrega</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('estoque')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  userRole === 'estoque' 
                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                    : (isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-500' : 'border-slate-100 bg-white text-slate-400')
                }`}
              >
                <Package size={20} />
                <span className="text-[10px] font-bold">Estoquista</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  userRole === 'admin' 
                    ? 'border-blue-600 bg-blue-50 text-blue-600' 
                    : (isDarkMode ? 'border-slate-800 bg-slate-900 text-slate-500' : 'border-slate-100 bg-white text-slate-400')
                }`}
              >
                <ShieldCheck size={20} />
                <span className="text-[10px] font-bold">Administrador</span>
              </button>
            </div>
          </div>

          {/* Module Permissions */}
          {isSystemAdmin && (
            <div className={`space-y-4 pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                  <ShieldCheck size={14} />
                  Acesso a Módulos e Submódulos
                </label>
                <span className="text-[10px] font-medium text-slate-400 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">
                  {userRole === 'admin' ? 'Acesso Total' : 'Acesso Personalizado'}
                </span>
              </div>
              
              <div className="space-y-6 pt-2">
                {[
                  {
                    category: 'Principal',
                    items: [
                      { id: 'home', label: 'Início', desc: 'Página inicial e painel principal', icon: Home },
                      { id: 'products', label: 'Catálogo de Peças', desc: 'Gestão e consulta de peças', icon: Package },
                      {
                        id: 'split_table',
                        label: 'Tabela de Split',
                        desc: 'Tabela oficial de preços de ar condicionado',
                        icon: Wind,
                        submodules: [
                          { id: 'split_table_agratto', label: 'Tabela Agratto', desc: 'Consulta preços Hi-Wall On-Off e Inverter', icon: Wind },
                          { id: 'split_table_gree', label: 'Tabela Gree', desc: 'G-Auto, Classic, Piso Teto e Cassete', icon: Wind },
                          { id: 'split_table_elgin', label: 'Tabela Elgin', desc: 'Piso Teto, Cassete e Inverter Frio', icon: Wind },
                          { id: 'split_table_download', label: 'Download de PDFs', desc: 'Baixar e visualizar tabelas originais', icon: Download },
                        ]
                      },
                      {
                        id: 'loyalty',
                        label: 'Clientes Fidelidade',
                        desc: 'Consulta de saldos de bônus e pontos a vencer',
                        icon: Award,
                        submodules: [
                          { id: 'loyalty_view_bonus', label: 'Saldos & Bônus R$', desc: 'Consultar saldo e valor do bônus em R$', icon: Gift },
                          { id: 'loyalty_view_expiring', label: 'Pontos a Vencer', desc: 'Avisos de pontos expirando no período', icon: Sparkles },
                          { id: 'loyalty_statements', label: 'Extrato Detalhado', desc: 'Histórico de notas, entradas e saídas', icon: FileSpreadsheet },
                          { id: 'loyalty_whatsapp', label: 'Disparo via WhatsApp', desc: 'Enviar notificação pronta com saldo ao cliente', icon: MessageCircle },
                          { id: 'loyalty_import', label: 'Importação de Dados', desc: 'Importar novos relatórios PDF/Excel de bônus', icon: Download },
                        ]
                      },
                      { id: 'tasks', label: 'Tarefas', desc: 'Gerenciamento de tarefas da equipe', icon: ClipboardList },
                      { id: 'demands', label: 'Demandas', desc: 'Gestão de chamados e solicitações', icon: ListTodo },
                      { id: 'routes', label: 'Rotas & GPS', desc: 'Roteirização e rastreamento', icon: Truck },
                    ]
                  },
                  {
                    category: 'Comunicação & CRM',
                    items: [
                      { id: 'whatsapp', label: 'WhatsApp', desc: 'Central de atendimento e mensagens', icon: MessageCircle },
                      { id: 'leads', label: 'Leads', desc: 'Funil de vendas e potenciais clientes', icon: Target },
                      { id: 'social_media', label: 'Site / E-commerce', desc: 'Gestão de site e Mercado Livre', icon: ShoppingBag },
                    ]
                  },
                  {
                    category: 'Operações',
                    items: [
                      { id: 'deliveries', label: 'Entregas', desc: 'Logística e rastreamento de entregas', icon: Truck },
                      { id: 'truck_history', label: 'Caminhão Reposição', desc: 'Histórico e rotas de reposição', icon: Truck },
                      { id: 'transfers', label: 'Transferências', desc: 'Movimentação de estoque entre filiais', icon: ArrowRightLeft },
                      { id: 'warranties', label: 'Garantias', desc: 'Pós-venda e registro de garantias', icon: ShieldCheck },
                      { id: 'assistances', label: 'Assistência Técnica', desc: 'Reparos e suporte técnico', icon: Wrench },
                      { id: 'price_research', label: 'Pesquisa de Preço', desc: 'Comparativo de mercado', icon: Tag },
                    ]
                  },
                  {
                    category: 'Resultados',
                    items: [
                      { id: 'sales', label: 'Vendas', desc: 'Lançamentos e ranking de vendas', icon: TrendingUp },
                      { id: 'reports', label: 'Relatórios', desc: 'Indicadores e análises de desempenho', icon: BarChart3 },
                    ]
                  },
                  {
                    category: 'Administração',
                    items: [
                      { id: 'live_panel', label: 'Painel Ao Vivo (GPS)', desc: 'Monitoramento em tempo real', icon: Radio },
                      { id: 'collaborators', label: 'Equipe', desc: 'Gestão de colaboradores e cargos', icon: Users },
                      { id: 'commissions', label: 'Comissionados', desc: 'Cálculo e pagamento de comissões', icon: DollarSign },
                      { id: 'settings', label: 'Configurações', desc: 'Ajustes gerais do sistema', icon: Settings },
                      { id: 'adriano_commissions', label: 'Comissões Adriano', desc: 'Módulo financeiro específico', icon: TrendingUp },
                      { id: 'permanent_tasks', label: 'Tarefas Permanentes & Notas', desc: 'Notas e tarefas fixas', icon: ClipboardList },
                    ]
                  }
                ].map(group => (
                  <div key={group.category} className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 pt-1">
                      {group.category}
                    </p>
                    <div className="space-y-2">
                      {group.items.map(module => {
                        const isActive = userRole === 'admin' || !!submodules[module.id];
                        const hasSub = Array.isArray((module as any).submodules) && (module as any).submodules.length > 0;
                        const subList = ((module as any).submodules || []) as Array<{ id: string; label: string; desc: string; icon: any }>;

                        return (
                          <div key={module.id} className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (userRole === 'admin') return;
                                const nextState = !submodules[module.id];
                                setSubmodules(prev => {
                                  const updated = { ...prev, [module.id]: nextState };
                                  // Se desativar o módulo pai, desativar submódulos
                                  if (!nextState && hasSub) {
                                    subList.forEach(s => {
                                      updated[s.id] = false;
                                    });
                                  } else if (nextState && hasSub) {
                                    subList.forEach(s => {
                                      if (updated[s.id] === undefined) {
                                        updated[s.id] = true;
                                      }
                                    });
                                  }
                                  return updated;
                                });
                              }}
                              disabled={userRole === 'admin'}
                              className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                                isActive
                                  ? (isDarkMode ? 'bg-blue-600/10 border-blue-600/50' : 'bg-blue-50 border-blue-200')
                                  : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')
                              } ${userRole === 'admin' ? 'opacity-85 cursor-not-allowed' : 'hover:border-blue-400'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`size-9 rounded-xl flex items-center justify-center ${
                                  isActive
                                    ? (isDarkMode ? 'bg-blue-600/30 text-blue-400' : 'bg-blue-600 text-white')
                                    : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')
                                }`}>
                                  <module.icon size={18} />
                                </div>
                                <div className="text-left">
                                  <span className={`text-xs font-bold block ${isActive ? (isDarkMode ? 'text-blue-400' : 'text-blue-700') : (isDarkMode ? 'text-slate-400' : 'text-slate-700')}`}>
                                    {module.label}
                                  </span>
                                  <span className="text-[9px] text-slate-500 uppercase font-medium">{module.desc}</span>
                                </div>
                              </div>
                              
                              <div className={`w-10 h-5 rounded-full relative transition-all duration-300 ${
                                isActive ? 'bg-blue-600' : (isDarkMode ? 'bg-slate-800' : 'bg-slate-200')
                              }`}>
                                <div className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all duration-300 ${
                                  isActive ? 'left-5.5' : 'left-0.5'
                                }`} />
                              </div>
                            </button>

                            {/* Submódulos Aninhados */}
                            {hasSub && isActive && (
                              <div className={`ml-4 pl-3 py-2 space-y-1.5 border-l-2 ${
                                isDarkMode ? 'border-blue-500/30 bg-slate-900/40' : 'border-blue-200 bg-blue-50/30'
                              } rounded-r-2xl pr-2`}>
                                <div className="flex items-center justify-between pb-1 px-1">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    Submódulos de {module.label}:
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {subList.map(subItem => {
                                    const isSubActive = userRole === 'admin' || !!submodules[subItem.id];
                                    const SubIcon = subItem.icon;
                                    return (
                                      <button
                                        key={subItem.id}
                                        type="button"
                                        onClick={() => {
                                          if (userRole === 'admin') return;
                                          setSubmodules(prev => ({
                                            ...prev,
                                            [subItem.id]: !prev[subItem.id]
                                          }));
                                        }}
                                        disabled={userRole === 'admin'}
                                        className={`flex items-center justify-between p-2 rounded-xl border transition-all text-left ${
                                          isSubActive
                                            ? (isDarkMode ? 'bg-blue-950/40 border-blue-500/40 text-blue-300' : 'bg-white border-blue-200 text-blue-900 shadow-xs')
                                            : (isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-60' : 'bg-slate-50 border-slate-200 text-slate-400')
                                        } ${userRole === 'admin' ? 'cursor-not-allowed' : 'hover:border-blue-400'}`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0 pr-1">
                                          <div className={`size-6 rounded-lg flex items-center justify-center shrink-0 ${
                                            isSubActive ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                          }`}>
                                            <SubIcon size={12} />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-[11px] font-bold leading-tight truncate">
                                              {subItem.label}
                                            </p>
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                                              {subItem.desc}
                                            </p>
                                          </div>
                                        </div>

                                        <div className={`w-7 h-4 rounded-full relative shrink-0 transition-colors ${
                                          isSubActive ? 'bg-blue-600' : (isDarkMode ? 'bg-slate-800' : 'bg-slate-300')
                                        }`}>
                                          <div className={`absolute top-0.5 size-3 rounded-full bg-white transition-all ${
                                            isSubActive ? 'left-3.5' : 'left-0.5'
                                          }`} />
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Receives Leads Toggle */}
              <button
                type="button"
                onClick={() => setReceivesLeads(!receivesLeads)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all mt-4 ${
                  receivesLeads 
                    ? (isDarkMode ? 'bg-indigo-600/10 border-indigo-600/50' : 'bg-indigo-50 border-indigo-200')
                    : (isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')
                } hover:border-indigo-400`}
              >
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-xl flex items-center justify-center ${
                    receivesLeads 
                      ? (isDarkMode ? 'bg-indigo-600/30 text-indigo-400' : 'bg-indigo-600 text-white')
                      : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')
                  }`}>
                    <Target size={20} />
                  </div>
                  <div className="text-left">
                    <span className={`text-sm font-bold block ${receivesLeads ? (isDarkMode ? 'text-indigo-400' : 'text-indigo-700') : (isDarkMode ? 'text-slate-400' : 'text-slate-700')}`}>
                      Receber Leads
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-black">Habilitar este vendedor para distribuição</span>
                  </div>
                </div>
                
                <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${
                  receivesLeads ? 'bg-indigo-600' : (isDarkMode ? 'bg-slate-800' : 'bg-slate-200')
                }`}>
                  <div className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-all duration-300 ${
                    receivesLeads ? 'left-7' : 'left-1'
                  }`} />
                </div>
              </button>
              
              <p className="text-[10px] text-slate-400 italic">
                {userRole === 'admin' 
                  ? 'Administradores sempre têm acesso a todos os módulos.' 
                  : 'Selecione os módulos que este colaborador poderá acessar.'}
              </p>
            </div>
          )}

          {/* Home Page Cards Visibility (Admin, Gerente, Supervisor) */}
          {(isSystemAdmin || canManageHomeCards) && (
            <div className={`space-y-4 pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-700'}`}>
                    <LayoutGrid size={14} className="text-blue-600" />
                    Cards Visíveis na Página Inicial
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Habilite quais cards e blocos da Página Inicial este colaborador pode visualizar
                  </p>
                </div>
                <div className="flex items-center flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      HOME_PAGE_CARDS.forEach(c => { all[c.id] = true; });
                      setHomeCards(all);
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/25 transition-colors flex items-center gap-1"
                  >
                    <Eye size={13} />
                    <span>Liberar Todos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHomeCards(getDefaultHomeCardsForRole(userRole))}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-blue-600/15 text-blue-600 dark:text-blue-400 hover:bg-blue-600/25 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw size={13} />
                    <span>Padrão do Cargo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const none: Record<string, boolean> = {};
                      HOME_PAGE_CARDS.forEach(c => { none[c.id] = false; });
                      setHomeCards(none);
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-rose-600/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600/25 transition-colors flex items-center gap-1"
                  >
                    <EyeOff size={13} />
                    <span>Ocultar Todos</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                {(['Topo & Atalhos', 'Indicadores & Operação', 'Gráficos & Resumos'] as const).map(cat => (
                  <div key={cat} className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {cat}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {HOME_PAGE_CARDS.filter(c => c.category === cat).map(card => {
                        const isCardEnabled = Boolean(homeCards[card.id]);
                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() =>
                              setHomeCards(prev => ({
                                ...prev,
                                [card.id]: !prev[card.id],
                              }))
                            }
                            className={`flex items-center justify-between p-3 rounded-2xl border-2 text-left transition-all ${
                              isCardEnabled
                                ? isDarkMode
                                  ? 'bg-blue-600/10 border-blue-600/50'
                                  : 'bg-blue-50 border-blue-200'
                                : isDarkMode
                                ? 'bg-slate-900 border-slate-800 opacity-75'
                                : 'bg-white border-slate-100 opacity-75'
                            } hover:border-blue-400`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <span
                                className={`text-xs font-bold block truncate ${
                                  isCardEnabled
                                    ? isDarkMode
                                      ? 'text-blue-400'
                                      : 'text-blue-700'
                                    : isDarkMode
                                    ? 'text-slate-400'
                                    : 'text-slate-700'
                                }`}
                              >
                                {card.label}
                              </span>
                              <span className="text-[10px] text-slate-500 block line-clamp-1">
                                {card.desc}
                              </span>
                            </div>

                            <div
                              className={`w-10 h-5 rounded-full relative transition-all duration-300 shrink-0 ${
                                isCardEnabled
                                  ? 'bg-blue-600'
                                  : isDarkMode
                                  ? 'bg-slate-800'
                                  : 'bg-slate-200'
                              }`}
                            >
                              <div
                                className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all duration-300 ${
                                  isCardEnabled ? 'left-5.5' : 'left-0.5'
                                }`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>

      <div className={`p-6 border-t sticky bottom-0 transition-colors flex flex-col sm:flex-row items-center gap-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <button 
          type="button"
          onClick={handleDeleteCollaborator}
          disabled={isSubmitting || isDeleting}
          className="w-full sm:w-auto px-6 h-14 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 dark:text-rose-400 font-bold rounded-xl border border-rose-200 dark:border-rose-900/50 transition-all flex items-center justify-center gap-2 shrink-0 active:scale-[0.98] disabled:opacity-50"
        >
          <Trash2 size={20} />
          Excluir Cadastro
        </button>

        <button 
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || isDeleting || showSuccess}
          className={`flex-1 w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70`}
        >
          {isSubmitting ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : showSuccess ? (
            <Check size={24} className="animate-bounce" />
          ) : (
            <>
              <Send size={20} />
              Salvar Alterações
            </>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-xl font-bold flex items-center gap-2 z-[100]"
          >
            <Check size={20} />
            Alterações Salvas com Sucesso!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
