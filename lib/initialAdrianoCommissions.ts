export interface AcordoComissaoRow {
  id: string;
  valor_base: number;
  valor_alcancado: number;
  diferenca: number;
  percentual: number; // e.g. 0.005 = 0,5%, 0.006 = 0,6%
  comissao: number;
}

export interface RedeSocialRow {
  id: string;
  rede: string;
  valor_nota: number;
  numero_nf: string;
  mes: string;
  acessoria: number;
}

export interface AdrianoMonthCommission {
  id: string;
  mes: string;
  mes_numero: number;
  ano: number;
  acordo: AcordoComissaoRow[];
  redes_sociais: RedeSocialRow[];
  total_comissao: number;
  pago?: boolean;
  data_pagamento?: string;
  observacoes?: string;
  updated_at?: string;
}

export const INITIAL_ADRIANO_COMMISSIONS: AdrianoMonthCommission[] = [
  {
    id: 'month-1-janeiro',
    mes: 'Janeiro',
    mes_numero: 1,
    ano: 2026,
    acordo: [
      { id: 'jan-1', valor_base: 200000, valor_alcancado: 318517.27, diferenca: 118517.27, percentual: 0.005, comissao: 592.59 },
      { id: 'jan-2', valor_base: 320000, valor_alcancado: 0, diferenca: 0, percentual: 0.006, comissao: 0 }
    ],
    redes_sociais: [
      { id: 'jan-rs-1', rede: 'Google', valor_nota: 0, numero_nf: '', mes: 'Janeiro', acessoria: 0 },
      { id: 'jan-rs-2', rede: 'Facebook', valor_nota: 0, numero_nf: '', mes: 'Janeiro', acessoria: 0 }
    ],
    total_comissao: 592.59,
    pago: true,
    data_pagamento: '10/02/2026'
  },
  {
    id: 'month-2-fevereiro',
    mes: 'Fevereiro',
    mes_numero: 2,
    ano: 2026,
    acordo: [
      { id: 'fev-1', valor_base: 200000, valor_alcancado: 351208.10, diferenca: 151208.10, percentual: 0.005, comissao: 756.04 },
      { id: 'fev-2', valor_base: 320000, valor_alcancado: 351208.10, diferenca: 31208.10, percentual: 0.006, comissao: 187.25 }
    ],
    redes_sociais: [
      { id: 'fev-rs-1', rede: 'Google', valor_nota: 0, numero_nf: '', mes: 'Fevereiro', acessoria: 0 },
      { id: 'fev-rs-2', rede: 'Facebook', valor_nota: 0, numero_nf: '', mes: 'Fevereiro', acessoria: 0 }
    ],
    total_comissao: 943.29,
    pago: true,
    data_pagamento: '10/03/2026'
  },
  {
    id: 'month-3-marco',
    mes: 'Março',
    mes_numero: 3,
    ano: 2026,
    acordo: [
      { id: 'mar-1', valor_base: 200000, valor_alcancado: 0, diferenca: -200000.00, percentual: 0.005, comissao: -1000.00 },
      { id: 'mar-2', valor_base: 320000, valor_alcancado: 0, diferenca: -320000.00, percentual: 0.006, comissao: -1920.00 }
    ],
    redes_sociais: [
      { id: 'mar-rs-1', rede: 'Google', valor_nota: 0, numero_nf: '', mes: 'Março', acessoria: 0 },
      { id: 'mar-rs-2', rede: 'Facebook', valor_nota: 0, numero_nf: '', mes: 'Março', acessoria: 0 }
    ],
    total_comissao: -2920.00,
    pago: false
  },
  {
    id: 'month-4-abril',
    mes: 'Abril',
    mes_numero: 4,
    ano: 2026,
    acordo: [
      { id: 'abr-1', valor_base: 200000, valor_alcancado: 0, diferenca: -200000.00, percentual: 0.005, comissao: -1000.00 }
    ],
    redes_sociais: [
      { id: 'abr-rs-1', rede: 'Google', valor_nota: 0, numero_nf: '', mes: 'Abril', acessoria: 0 },
      { id: 'abr-rs-2', rede: 'Facebook', valor_nota: 0, numero_nf: '', mes: 'Abril', acessoria: 0 }
    ],
    total_comissao: -1000.00,
    pago: false
  },
  {
    id: 'month-5-maio',
    mes: 'Maio',
    mes_numero: 5,
    ano: 2026,
    acordo: [
      { id: 'mai-1', valor_base: 200000, valor_alcancado: 0, diferenca: -200000.00, percentual: 0.005, comissao: -1000.00 }
    ],
    redes_sociais: [
      { id: 'mai-rs-1', rede: 'Google', valor_nota: 0, numero_nf: '', mes: 'Maio', acessoria: 0 },
      { id: 'mai-rs-2', rede: 'Facebook', valor_nota: 0, numero_nf: '', mes: 'Maio', acessoria: 0 }
    ],
    total_comissao: -1000.00,
    pago: false
  },
  {
    id: 'month-6-junho',
    mes: 'Junho',
    mes_numero: 6,
    ano: 2026,
    acordo: [
      { id: 'jun-1', valor_base: 200000, valor_alcancado: 200274.51, diferenca: 274.51, percentual: 0.005, comissao: 1.37 }
    ],
    redes_sociais: [
      { id: 'jun-rs-1', rede: 'Google', valor_nota: 0, numero_nf: '', mes: 'Junho', acessoria: 0 },
      { id: 'jun-rs-2', rede: 'Facebook/Instagram', valor_nota: 0, numero_nf: '', mes: 'Junho', acessoria: 0 }
    ],
    total_comissao: 1.37,
    pago: true,
    data_pagamento: '10/07/2026'
  },
  {
    id: 'month-7-julho',
    mes: 'Julho',
    mes_numero: 7,
    ano: 2026,
    acordo: [
      { id: 'jul-1', valor_base: 200000, valor_alcancado: 213150.42, diferenca: 13150.42, percentual: 0.005, comissao: 65.75 }
    ],
    redes_sociais: [
      { id: 'jul-rs-1', rede: 'Google', valor_nota: 0, numero_nf: '', mes: 'Julho', acessoria: 0 }
    ],
    total_comissao: 65.75,
    pago: true,
    data_pagamento: '10/08/2026'
  },
  {
    id: 'month-8-agosto',
    mes: 'Agosto',
    mes_numero: 8,
    ano: 2026,
    acordo: [
      { id: 'ago-1', valor_base: 200000, valor_alcancado: 229623.07, diferenca: 29623.07, percentual: 0.005, comissao: 148.12 }
    ],
    redes_sociais: [
      { id: 'ago-rs-1', rede: 'Google', valor_nota: 500.57, numero_nf: '38742348', mes: 'Agosto', acessoria: 250.29 }
    ],
    total_comissao: 398.40,
    pago: true,
    data_pagamento: '10/09/2026'
  },
  {
    id: 'month-9-setembro',
    mes: 'Setembro',
    mes_numero: 9,
    ano: 2026,
    acordo: [
      { id: 'set-1', valor_base: 200000, valor_alcancado: 282938.42, diferenca: 82938.42, percentual: 0.005, comissao: 414.69 }
    ],
    redes_sociais: [
      { id: 'set-rs-1', rede: 'Google', valor_nota: 0, numero_nf: '', mes: 'Setembro', acessoria: 0 },
      { id: 'set-rs-2', rede: 'Facebook', valor_nota: 0, numero_nf: '', mes: 'Setembro', acessoria: 0 }
    ],
    total_comissao: 414.69,
    pago: true,
    data_pagamento: '10/10/2026'
  },
  {
    id: 'month-10-outubro',
    mes: 'Outubro',
    mes_numero: 10,
    ano: 2026,
    acordo: [
      { id: 'out-1', valor_base: 200000, valor_alcancado: 0, diferenca: -200000.00, percentual: 0.005, comissao: -1000.00 }
    ],
    redes_sociais: [
      { id: 'out-rs-1', rede: 'Google', valor_nota: 0, numero_nf: '', mes: 'Outubro', acessoria: 0 },
      { id: 'out-rs-2', rede: 'Facebook', valor_nota: 0, numero_nf: '', mes: 'Outubro', acessoria: 0 }
    ],
    total_comissao: -1000.00,
    pago: false
  },
  {
    id: 'month-11-novembro',
    mes: 'Novembro',
    mes_numero: 11,
    ano: 2026,
    acordo: [
      { id: 'nov-1', valor_base: 200000, valor_alcancado: 0, diferenca: 0, percentual: 0.005, comissao: 0 }
    ],
    redes_sociais: [
      { id: 'nov-rs-1', rede: 'Google', valor_nota: 0, numero_nf: '', mes: 'Novembro', acessoria: 0 },
      { id: 'nov-rs-2', rede: 'Facebook', valor_nota: 0, numero_nf: '', mes: 'Novembro', acessoria: 0 }
    ],
    total_comissao: 0.00,
    pago: false
  },
  {
    id: 'month-12-dezembro',
    mes: 'Dezembro',
    mes_numero: 12,
    ano: 2026,
    acordo: [
      { id: 'dez-1', valor_base: 200000, valor_alcancado: 0, diferenca: -200000.00, percentual: 0.005, comissao: -1000.00 }
    ],
    redes_sociais: [
      { id: 'dez-rs-1', rede: 'Google', valor_nota: 0, numero_nf: '', mes: 'Dezembro', acessoria: 0 },
      { id: 'dez-rs-2', rede: 'Facebook', valor_nota: 0, numero_nf: '', mes: 'Dezembro', acessoria: 0 }
    ],
    total_comissao: -1000.00,
    pago: false
  }
];

export function recalculateMonth(month: AdrianoMonthCommission): AdrianoMonthCommission {
  const updatedAcordo = month.acordo.map(row => {
    // Se valor alcançado foi 0 e a diferença for negativa (penalidade/meta não batida)
    let dif = row.diferenca;
    if (row.valor_alcancado > 0) {
      dif = Number((row.valor_alcancado - row.valor_base).toFixed(2));
    }
    const com = Number((dif * row.percentual).toFixed(2));
    return {
      ...row,
      diferenca: dif,
      comissao: com
    };
  });

  const somaAcordo = updatedAcordo.reduce((acc, r) => acc + (Number(r.comissao) || 0), 0);
  const somaRedes = month.redes_sociais.reduce((acc, r) => acc + (Number(r.acessoria) || 0), 0);
  const total = Number((somaAcordo + somaRedes).toFixed(2));

  return {
    ...month,
    acordo: updatedAcordo,
    total_comissao: total
  };
}

export function formatCurrencyBRL(value: number): string {
  const isNegative = value < 0;
  const absFormatted = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return isNegative ? `-R$ ${absFormatted}` : `R$ ${absFormatted}`;
}
