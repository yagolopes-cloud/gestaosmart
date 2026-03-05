import type { ResumoFinanceiro } from '../api/pedidos';

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

interface CardsResumoFinanceiroProps {
  resumo: ResumoFinanceiro | null;
  loading?: boolean;
}

const CARDS = [
  {
    key: 'quantidadePedidos',
    label: 'Quantidade de Pedidos',
    color: 'text-blue-600 dark:text-blue-400',
    format: (v: number) => v.toLocaleString('pt-BR'),
  },
  {
    key: 'saldoFaturarPrazo',
    label: 'Saldo a Faturar a Prazo',
    color: 'text-emerald-600 dark:text-emerald-400',
    format: formatarMoeda,
  },
  {
    key: 'valorAdiantamento',
    label: 'Valor Adiantamento',
    color: 'text-amber-600 dark:text-amber-400',
    format: formatarMoeda,
  },
  {
    key: 'saldoFaturar',
    label: 'Saldo a Faturar',
    color: 'text-slate-700 dark:text-slate-200',
    format: formatarMoeda,
  },
] as const;

export default function CardsResumoFinanceiro({ resumo, loading }: CardsResumoFinanceiroProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-200 dark:bg-slate-800 rounded-xl p-5 animate-pulse">
            <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-2/3 mb-3" />
            <div className="h-8 bg-slate-300 dark:bg-slate-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!resumo) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((c) => (
        <div
          key={c.key}
          className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-lg"
        >
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{c.label}</p>
          <p className={`text-2xl font-bold mt-1 ${c.color}`}>
            {c.format(resumo[c.key])}
          </p>
        </div>
      ))}
    </div>
  );
}
