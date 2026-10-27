import initialClientsData from './loyaltyInitialData.json';

export interface LoyaltyTransaction {
  data: string;
  descricao: string;
  anterior: number;
  debito: number;
  credito: number;
  saldoFinal: number;
  validade?: string;
}

export interface LoyaltyClient {
  id: string;
  codigo: string;
  nome: string;
  saldoPontos: number;
  pontosExpiradosTotal: number;
  pontosConvertidosTotal: number;
  totalCreditos: number;
  totalDebitos: number;
  primeiraTransacao: string | null;
  ultimaTransacao: string | null;
  proximoVencimento: string | null;
  pontosAVencerProximo: number;
  transacoes: LoyaltyTransaction[];
  phone?: string;
  notes?: string;
}

export interface LoyaltyStats {
  totalClients: number;
  clientsWithBalance: number;
  totalPointsActive: number;
  totalBonusBRL: number;
  clientsWithExpiringPoints: number;
  totalPointsConverted: number;
  totalPointsExpired: number;
}

const STORAGE_KEY = 'agentex_loyalty_clients_v1';
const POINT_TO_BRL_RATIO = 1.0; // 1 ponto = R$ 1,00 de desconto / bônus em compras

export function getInitialLoyaltyClients(): LoyaltyClient[] {
  return initialClientsData as LoyaltyClient[];
}

export function getStoredLoyaltyClients(): LoyaltyClient[] {
  if (typeof window === 'undefined') {
    return getInitialLoyaltyClients();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading loyalty clients from localStorage:', e);
  }
  return getInitialLoyaltyClients();
}

export function saveLoyaltyClients(clients: LoyaltyClient[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    } catch (e) {
      console.error('Error saving loyalty clients to localStorage:', e);
    }
  }
}

export function calculateLoyaltyStats(clients: LoyaltyClient[]): LoyaltyStats {
  let clientsWithBalance = 0;
  let totalPointsActive = 0;
  let clientsWithExpiringPoints = 0;
  let totalPointsConverted = 0;
  let totalPointsExpired = 0;

  for (const c of clients) {
    if (c.saldoPontos > 0) {
      clientsWithBalance++;
      totalPointsActive += c.saldoPontos;
      if (c.proximoVencimento) {
        clientsWithExpiringPoints++;
      }
    }
    totalPointsConverted += c.pontosConvertidosTotal || 0;
    totalPointsExpired += c.pontosExpiradosTotal || 0;
  }

  return {
    totalClients: clients.length,
    clientsWithBalance,
    totalPointsActive,
    totalBonusBRL: totalPointsActive * POINT_TO_BRL_RATIO,
    clientsWithExpiringPoints,
    totalPointsConverted,
    totalPointsExpired,
  };
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Generates WhatsApp quote & bonus invitation text for sellers to send to clients
 */
export function generateWhatsAppBonusMessage(client: LoyaltyClient): string {
  const pontos = client.saldoPontos;
  const bonusReais = formatBRL(pontos * POINT_TO_BRL_RATIO);
  const firstName = client.nome.split(' ')[0] || 'Cliente';

  let text = `Olá, *${firstName}*! Tudo bem?\n\n`;
  text += `Aqui é da equipe comercial da loja. Verifiquei no nosso programa de fidelidade que você possui um saldo acumulado de *${pontos} pontos*, equivalente a *${bonusReais} de bônus* para utilizar como desconto nas suas próximas compras de peças e ar condicionado!\n\n`;

  if (client.proximoVencimento && client.pontosAVencerProximo > 0) {
    text += `⚠️ *Atenção:* Você possui *${client.pontosAVencerProximo} pontos* com validade até *${client.proximoVencimento}*. Não deixe expirar!\n\n`;
  }

  text += `Está precisando de algum equipamento, split, peças para instalação ou ferramentas esta semana? Posso aplicar esse seu desconto agora mesmo no seu pedido!\n\nFico no aguardo para te atender!`;

  return text;
}
