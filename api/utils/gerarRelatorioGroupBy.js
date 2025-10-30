// Defina os QUALIS conhecidos no topo do arquivo (ou importe de um módulo se quiser)
const QUALIS_CATEGORIAS = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C', 'SEM_QUALIS'];

function gerarRelatorioGroupBy(estatisticas) {
  if (!Array.isArray(estatisticas) || estatisticas.length === 0) return [];

  const exemplo = estatisticas[0];
  const chavesPossiveis = ['id_lattes', 'departamento', 'centro', 'categoria_busca'];
  const chaveAgrupamento = chavesPossiveis.find(k => k in exemplo);

  if (!chaveAgrupamento) {
    console.warn("⚠️ Nenhuma chave de agrupamento reconhecida em gerarRelatorioGroupBy.");
    return estatisticas;
  }

  return estatisticas.map(item => {
    const unidade = item[chaveAgrupamento];
    const producao = item.producao || [];

    // Gera totais por QUALIS (soma os existentes)
    const totaisPorQualis = producao.reduce((acc, p) => {
      const qualis = p.qualis || 'SEM_QUALIS';
      acc[qualis] = (acc[qualis] || 0) + (p.total || 0);
      return acc;
    }, {});

    // Garante que todas as categorias QUALIS existam, mesmo que com 0
    for (const q of QUALIS_CATEGORIAS) {
      if (!(q in totaisPorQualis)) totaisPorQualis[q] = 0;
    }

    const relatorio = {
      unidade,
      totaisPorQualis
    };

    if (chaveAgrupamento === 'id_lattes') {
      relatorio.pesquisador = item.dadosDocente?.PESQUISADOR || null;
      relatorio.departamento = item.dadosDocente?.DEPARTAMENTO || null;
      relatorio.centro = item.dadosDocente?.CENTRO || null;
      relatorio.statusCanonico = item.statusCanonico || 'DESCONHECIDO';
    }

    return relatorio;
  });
}

module.exports = gerarRelatorioGroupBy ;