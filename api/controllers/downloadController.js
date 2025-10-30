const ExcelJS = require('exceljs');


const columnsArtigos = [
        { header: 'Título do Artigo', key: 'titulo', width: 50 },
        { header: 'Autores', key: 'autores', width: 40 },
        { header: 'Periódico/Revista', key: 'periodico', width: 30 },
        { header: 'Ano', key: 'ano', width: 10 },
        { header: 'ISSN', key: 'issn', width: 15 },
        { header: 'DOI', key: 'doi', width: 25 },
        { header: 'Departamento', key: 'departamento', width: 20 },
        { header: 'Centro', key: 'centro', width: 15 },
        { header: 'ID Lattes do Autor Principal', key: 'id_lattes', width: 25 },

        ];


const gerarPlanilhaExcel = async (res, dados, nomeArquivo, tipo) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SISPESQ-Backend';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Dados');

    // Define as colunas baseado no tipo de dados (estatísticas ou lista)
    if (tipo === 'estatisticas') {
        worksheet.columns = [
            { header: 'Grupo', key: 'grupo', width: 40 },
            { header: 'Total de Artigos', key: 'totalArtigos', width: 20 },
        ];
    } else { // 'lista'
        worksheet.columns = [
            { header: 'Título do Artigo', key: 'titulo', width: 50 },
            { header: 'Periódico/Revista', key: 'periodico', width: 30 },
            { header: 'ISSN', key: 'issn', width: 15 },
            { header: 'DOI', key: 'doi', width: 25 },
            { header: 'Qualis', key: 'qualis', width: 15 },
            { header: 'Ano', key: 'ano', width: 10 },
            { header: 'Departamento', key: 'departamento', width: 30 },
            { header: 'Centro', key: 'centro', width: 15 },
            { header: 'ID Lattes Autor', key: 'id_lattes', width: 25 },
            { header: 'Tipo de Busca', key: 'categoria_busca', width: 20 },
        ];
    }

    // Adiciona as linhas
    worksheet.addRows(dados.map(item => {
        if (tipo === 'estatisticas') {
            return { grupo: item.grupo, totalArtigos: item.totalArtigos };
        }
        return {
            titulo: item.TITULO_DO_ARTIGO,
            periodico: item.TITULO_DO_PERIODICO_OU_REVISTA,
            issn: item.ISSN_ORIGINAL,
            doi: item.DOI,
            qualis: item.QUALIS,
            ano: item.ANO_DO_ARTIGO ? new Date(item.ANO_DO_ARTIGO).getFullYear() : '',
            departamento: item.DEPARTAMENTO,
            centro: item.CENTRO,
            id_lattes: item.ID_LATTES_AUTOR,
            categoria_busca: item.CATEGORIA_BUSCA
        };
    }));

    // Configura a resposta para forçar o download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
};

// --- NOVA FUNÇÃO AUXILIAR PARA EXPORTAÇÃO COM STREAMING ---
const gerarPlanilhaExcelStream = async (res, cursor, nomeArquivo, tipo) => {
    // 1. Configura a resposta para download e streaming
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}.xlsx"`);

    // 2. Cria um Workbook Writer que escreve diretamente na resposta (res)
    const options = {
        stream: res,
        useStyles: true,
        useSharedStrings: true
    };
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter(options);
    const worksheet = workbook.addWorksheet('Dados');

    // 3. Define as colunas (igual ao método anterior)
    if (tipo === 'estatisticas') {
        worksheet.columns = [
            { header: 'Grupo', key: 'grupo', width: 40 },
            { header: 'Total de Artigos', key: 'totalArtigos', width: 20 },
        ];
    } else { // 'lista'
          worksheet.columns = [
            { header: 'Título do Artigo', key: 'titulo', width: 50 },
            { header: 'Periódico/Revista', key: 'periodico', width: 30 },
            { header: 'ISSN', key: 'issn', width: 15 },
            { header: 'DOI', key: 'doi', width: 25 },
            { header: 'Qualis', key: 'qualis', width: 15 },
            { header: 'Ano', key: 'ano', width: 10 },
            { header: 'Departamento', key: 'departamento', width: 30 },
            { header: 'Centro', key: 'centro', width: 15 },
            { header: 'ID Lattes Autor', key: 'id_lattes', width: 25 },
            { header: 'Tipo de Busca', key: 'categoria_busca', width: 20 },
        ];
    }
    
    // 4. Itera sobre o cursor do MongoDB, recebendo um documento de cada vez
    for await (const doc of cursor) {
        // Adiciona a linha ao worksheet e a "commita" para o stream
        worksheet.addRow(doc).commit();
    }
    
    // 5. Finaliza a planilha
    worksheet.commit();
    await workbook.commit();
    // A resposta (res) é finalizada automaticamente pelo stream
};


module.exports = {
    gerarPlanilhaExcel,
    gerarPlanilhaExcelStream
};