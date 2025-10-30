// utils/gerarExcelProducao.js
const ExcelJS = require('exceljs');

/**
 * Gera e envia um Excel com a produção por QUALIS
 * @param {Array} relatorio - Resultado do gerarRelatorioGroupBy
 * @param {Object} res - Response do Express
 */
async function gerarExcelProducao(relatorio, res) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Produção por QUALIS");

  // Descobre todos os QUALIS únicos para criar colunas dinâmicas
  const qualisUnicos = [
    ...new Set(relatorio.flatMap(r => Object.keys(r.totaisPorQualis)))
  ].sort();

  const colunas = [
    { header: 'Unidade', key: 'unidade', width: 35 },
    ...qualisUnicos.map(q => ({ header: q, key: q, width: 10 }))
  ];

  if (relatorio[0]?.pesquisador) {
    colunas.splice(1, 0, { header: 'Pesquisador', key: 'pesquisador', width: 35 });
    colunas.splice(2, 0, { header: 'Departamento', key: 'departamento', width: 30 });
    colunas.splice(3, 0, { header: 'Centro', key: 'centro', width: 25 });
    colunas.push({ header: 'Status', key: 'statusCanonico', width: 15 });
  }

  sheet.columns = colunas;

  relatorio.forEach(r => {
    const linha = {
      unidade: r.unidade,
      ...r.totaisPorQualis,
      pesquisador: r.pesquisador,
      departamento: r.departamento,
      centro: r.centro,
      statusCanonico: r.statusCanonico
    };
    sheet.addRow(linha);
  });

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'center' };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="relatorio_producao.xlsx"');

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = gerarExcelProducao;
