export interface AcordoComissaoItem {
  id: string;
  valorBase: number;
  valorAlcancado: number;
  diferenca: number;
  percentual: number; // e.g. 0.5 for 0,5%
  comissao: number;
  observacao?: string;
}

export interface RedesSociaisItem {
  id: string;
  rede: string;
  valorNota: number;
  noNf: string;
  mes: string;
  acessoria: number;
}

export interface MonthCommissionData {
  month: string;
  acordo: AcordoComissaoItem[];
  redesSociais: RedesSociaisItem[];
}

export const INITIAL_ADRIANO_COMMISSIONS: MonthCommissionData[] = [
  {
    month: 'Janeiro',
    acordo: [
      {
        id: 'jan-1',
        valorBase: 200000.00,
        valorAlcancado: 318517.27,
        diferenca: 118517.27,
        percentual: 0.5,
        comissao: 592.59
      },
      {
        id: 'jan-2',
        valorBase: 320000.00,
        valorAlcancado: 0,
        diferenca: 0,
        percentual: 0.6,
        comissao: 0
      }
    ],
    redesSociais: [
      {
        id: 'jan-rs-1',
        rede: 'Google',
        valorNota: 0,
        noNf: '',
        mes: 'Janeiro',
        acessoria: 0
      },
      {
        id: 'jan-rs-2',
        rede: 'Facebook',
        valorNota: 0,
        noNf: '',
        mes: 'Janeiro',
        acessoria: 0
      }
    ]
  },
  {
    month: 'Fevereiro',
    acordo: [
      {
        id: 'fev-1',
        valorBase: 200000.00,
        valorAlcancado: 351208.10,
        diferenca: 151208.10,
        percentual: 0.5,
        comissao: 756.04
      },
      {
        id: 'fev-2',
        valorBase: 320000.00,
        valorAlcancado: 351208.10,
        diferenca: 31208.10,
        percentual: 0.6,
        comissao: 187.25
      }
    ],
    redesSociais: [
      {
        id: 'fev-rs-1',
        rede: 'Google',
        valorNota: 0,
        noNf: '',
        mes: 'Fevereiro',
        acessoria: 0
      },
      {
        id: 'fev-rs-2',
        rede: 'Facebook',
        valorNota: 0,
        noNf: '',
        mes: 'Fevereiro',
        acessoria: 0
      }
    ]
  },
  {
    month: 'Março',
    acordo: [
      {
        id: 'mar-1',
        valorBase: 200000.00,
        valorAlcancado: 0,
        diferenca: -200000.00,
        percentual: 0.5,
        comissao: -1000.00
      },
      {
        id: 'mar-2',
        valorBase: 320000.00,
        valorAlcancado: 0,
        diferenca: -320000.00,
        percentual: 0.6,
        comissao: -1920.00
      }
    ],
    redesSociais: [
      {
        id: 'mar-rs-1',
        rede: 'Google',
        valorNota: 0,
        noNf: '',
        mes: 'Março',
        acessoria: 0
      },
      {
        id: 'mar-rs-2',
        rede: 'Facebook',
        valorNota: 0,
        noNf: '',
        mes: 'Março',
        acessoria: 0
      }
    ]
  },
  {
    month: 'Abril',
    acordo: [
      {
        id: 'abr-1',
        valorBase: 200000.00,
        valorAlcancado: 0,
        diferenca: -200000.00,
        percentual: 0.5,
        comissao: -1000.00
      }
    ],
    redesSociais: [
      {
        id: 'abr-rs-1',
        rede: 'Google',
        valorNota: 0,
        noNf: '',
        mes: 'Abril',
        acessoria: 0
      },
      {
        id: 'abr-rs-2',
        rede: 'Facebook',
        valorNota: 0,
        noNf: '',
        mes: 'Abril',
        acessoria: 0
      }
    ]
  },
  {
    month: 'Maio',
    acordo: [
      {
        id: 'mai-1',
        valorBase: 200000.00,
        valorAlcancado: 0,
        diferenca: -200000.00,
        percentual: 0.5,
        comissao: -1000.00
      }
    ],
    redesSociais: [
      {
        id: 'mai-rs-1',
        rede: 'Google',
        valorNota: 0,
        noNf: '',
        mes: 'Maio',
        acessoria: 0
      },
      {
        id: 'mai-rs-2',
        rede: 'Facebook',
        valorNota: 0,
        noNf: '',
        mes: 'Maio',
        acessoria: 0
      }
    ]
  },
  {
    month: 'Junho',
    acordo: [
      {
        id: 'jun-1',
        valorBase: 200000.00,
        valorAlcancado: 200274.51,
        diferenca: 274.51,
        percentual: 0.5,
        comissao: 1.37
      }
    ],
    redesSociais: [
      {
        id: 'jun-rs-1',
        rede: 'Google',
        valorNota: 0,
        noNf: '',
        mes: 'Junho',
        acessoria: 0
      },
      {
        id: 'jun-rs-2',
        rede: 'Facebook/Instagram',
        valorNota: 0,
        noNf: '',
        mes: 'Junho',
        acessoria: 0
      }
    ]
  },
  {
    month: 'Julho',
    acordo: [
      {
        id: 'jul-1',
        valorBase: 200000.00,
        valorAlcancado: 213150.42,
        diferenca: 13150.42,
        percentual: 0.5,
        comissao: 65.75
      }
    ],
    redesSociais: [
      {
        id: 'jul-rs-1',
        rede: 'Google',
        valorNota: 0,
        noNf: '',
        mes: 'Julho',
        acessoria: 0
      }
    ]
  },
  {
    month: 'Agosto',
    acordo: [
      {
        id: 'ago-1',
        valorBase: 200000.00,
        valorAlcancado: 229623.07,
        diferenca: 29623.07,
        percentual: 0.5,
        comissao: 148.12
      }
    ],
    redesSociais: [
      {
        id: 'ago-rs-1',
        rede: 'Google',
        valorNota: 500.57,
        noNf: '38742348',
        mes: 'Agosto',
        acessoria: 250.29
      }
    ]
  },
  {
    month: 'Setembro',
    acordo: [
      {
        id: 'set-1',
        valorBase: 200000.00,
        valorAlcancado: 282938.42,
        diferenca: 82938.42,
        percentual: 0.5,
        comissao: 414.69
      }
    ],
    redesSociais: [
      {
        id: 'set-rs-1',
        rede: 'Google',
        valorNota: 0,
        noNf: '',
        mes: 'Setembro',
        acessoria: 0
      },
      {
        id: 'set-rs-2',
        rede: 'Facebook',
        valorNota: 0,
        noNf: '',
        mes: 'Setembro',
        acessoria: 0
      }
    ]
  },
  {
    month: 'Outubro',
    acordo: [
      {
        id: 'out-1',
        valorBase: 200000.00,
        valorAlcancado: 0,
        diferenca: -200000.00,
        percentual: 0.5,
        comissao: -1000.00
      }
    ],
    redesSociais: [
      {
        id: 'out-rs-1',
        rede: 'Google',
        valorNota: 0,
        noNf: '',
        mes: 'Outubro',
        acessoria: 0
      },
      {
        id: 'out-rs-2',
        rede: 'Facebook',
        valorNota: 0,
        noNf: '',
        mes: 'Outubro',
        acessoria: 0
      }
    ]
  },
  {
    month: 'Novembro',
    acordo: [
      {
        id: 'nov-1',
        valorBase: 200000.00,
        valorAlcancado: 0,
        diferenca: 0,
        percentual: 0.5,
        comissao: 0
      }
    ],
    redesSociais: [
      {
        id: 'nov-rs-1',
        rede: 'Google',
        valorNota: 0,
        noNf: '',
        mes: 'Novembro',
        acessoria: 0
      },
      {
        id: 'nov-rs-2',
        rede: 'Facebook',
        valorNota: 0,
        noNf: '',
        mes: 'Novembro',
        acessoria: 0
      }
    ]
  },
  {
    month: 'Dezembro',
    acordo: [
      {
        id: 'dez-1',
        valorBase: 200000.00,
        valorAlcancado: 0,
        diferenca: -200000.00,
        percentual: 0.5,
        comissao: -1000.00
      }
    ],
    redesSociais: [
      {
        id: 'dez-rs-1',
        rede: 'Google',
        valorNota: 0,
        noNf: '',
        mes: 'Dezembro',
        acessoria: 0
      },
      {
        id: 'dez-rs-2',
        rede: 'Facebook',
        valorNota: 0,
        noNf: '',
        mes: 'Dezembro',
        acessoria: 0
      }
    ]
  }
];

export function calculateMonthTotal(monthData: MonthCommissionData): number {
  const totalAcordo = monthData.acordo.reduce((acc, curr) => acc + (curr.comissao || 0), 0);
  const totalRedes = monthData.redesSociais.reduce((acc, curr) => acc + (curr.acessoria || 0), 0);
  return Number((totalAcordo + totalRedes).toFixed(2));
}
