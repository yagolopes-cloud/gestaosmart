/**
 * Mensagem exibida quando não há registros para exibição (lista vazia ou filtros sem resultado).
 * Ex.: pedidos "atendido totalmente", combinação de filtros sem resultados, etc.
 */
export function MensagemSemRegistros() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-8 text-center text-slate-600 dark:text-slate-400">
      <p className="font-medium text-slate-700 dark:text-slate-300">Não há registros para exibição.</p>
      <p className="mt-2 text-sm">
        Isso pode ocorrer porque: ainda não foram criados registros; nenhum registro corresponde aos filtros aplicados.
      </p>
      <p className="mt-1 text-sm">Por favor, revise os dados.</p>
    </div>
  );
}

/** Versão inline (ex.: dentro de uma célula de tabela). */
export function MensagemSemRegistrosInline() {
  return (
    <p className="text-slate-500 dark:text-slate-400 text-sm">
      Não há registros para exibição. Isso pode ocorrer porque: ainda não foram criados registros; nenhum registro corresponde aos filtros aplicados. Por favor, revise os dados.
    </p>
  );
}
