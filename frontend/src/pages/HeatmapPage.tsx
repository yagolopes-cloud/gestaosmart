import { useEffect, useState, useCallback } from 'react';
import CardsResumoFinanceiro from '../components/CardsResumoFinanceiro';
import GaugeIndicador from '../components/GaugeIndicador';
import MapaMunicipios from '../components/MapaMunicipios';
import FiltroPedidos, { defaultFiltros, type FiltrosPedidosState } from '../components/FiltroPedidos';
import {
  obterResumoFinanceiro,
  obterResumoStatusPorTipoF,
  type ResumoFinanceiro,
  type ResumoStatusPorTipoF,
  type FiltrosPedidos,
} from '../api/pedidos';
import { loadFiltrosHeatmap, saveFiltrosHeatmap } from '../utils/persistFiltros';

export default function HeatmapPage() {
  const [filtros, setFiltros] = useState<FiltrosPedidosState>(() =>
    loadFiltrosHeatmap(defaultFiltros) as FiltrosPedidosState
  );
  const [resumoFinanceiro, setResumoFinanceiro] = useState<ResumoFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumoStatusTipoF, setResumoStatusTipoF] = useState<ResumoStatusPorTipoF | null>(null);
  const [loadingStatusTipoF, setLoadingStatusTipoF] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await obterResumoFinanceiro(filtros as FiltrosPedidos);
      setResumoFinanceiro(r);
    } catch {
      setResumoFinanceiro(null);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  const carregarStatusTipoF = useCallback(async () => {
    setLoadingStatusTipoF(true);
    try {
      const r = await obterResumoStatusPorTipoF(filtros as FiltrosPedidos);
      setResumoStatusTipoF(r);
    } catch {
      setResumoStatusTipoF(null);
    } finally {
      setLoadingStatusTipoF(false);
    }
  }, [filtros]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    carregarStatusTipoF();
  }, [carregarStatusTipoF]);

  useEffect(() => {
    saveFiltrosHeatmap(filtros);
  }, [filtros]);

  const aplicarFiltros = useCallback(() => {
    carregar();
    carregarStatusTipoF();
  }, [carregar, carregarStatusTipoF]);

  const limparFiltros = useCallback(() => {
    setFiltros(defaultFiltros);
    saveFiltrosHeatmap(defaultFiltros);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Heatmap</h2>
        <button
          type="button"
          onClick={() => setMostrarFiltros((v) => !v)}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
          title={mostrarFiltros ? 'Ocultar filtros' : 'Exibir filtros'}
          aria-label={mostrarFiltros ? 'Ocultar filtros' : 'Exibir filtros'}
        >
          {mostrarFiltros ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {mostrarFiltros && (
        <FiltroPedidos
          filtros={filtros}
          onChange={setFiltros}
          onAplicar={aplicarFiltros}
          onLimpar={limparFiltros}
        />
      )}
      <CardsResumoFinanceiro resumo={resumoFinanceiro} loading={loading} />
      <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:min-h-[520px]">
        <div className="flex flex-col gap-4 w-full lg:w-[280px] shrink-0">
          <GaugeIndicador
            title="Retirada"
            value={resumoStatusTipoF?.retirada.percentual ?? 0}
            loading={loadingStatusTipoF}
          />
          <GaugeIndicador
            title="Entrega Grande Teresina"
            value={resumoStatusTipoF?.entregaGrandeTeresina.percentual ?? 0}
            loading={loadingStatusTipoF}
          />
          <GaugeIndicador
            title="Carradas"
            value={resumoStatusTipoF?.carradas.percentual ?? 0}
            loading={loadingStatusTipoF}
          />
        </div>
        <div className="flex-1 flex flex-col min-h-[400px] lg:min-h-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <MapaMunicipios filtros={filtros as FiltrosPedidos} />
        </div>
      </div>
    </div>
  );
}
