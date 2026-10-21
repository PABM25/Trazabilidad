/*
 * Exportación a Excel y PDF. Las librerías se cargan solo al exportar,
 * para no sumarlas a la descarga inicial de la app.
 *
 * columnas: [{ titulo: 'Código', valor: (fila) => fila.codigo }]
 */
const aFilas = (filas, columnas) => filas.map((f) => columnas.map((c) => c.valor(f) ?? ''));

export const exportarExcel = async (nombreArchivo, hoja, filas, columnas) => {
    const XLSX = await import('xlsx');
    const datos = [columnas.map((c) => c.titulo), ...aFilas(filas, columnas)];
    const ws = XLSX.utils.aoa_to_sheet(datos);
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: datos.length - 1, c: columnas.length - 1 } }) };
    ws['!cols'] = columnas.map((_, i) => ({
        wch: Math.min(50, Math.max(...datos.map((fila) => String(fila[i] ?? '').length)) + 2),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, hoja.slice(0, 31));
    XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
};

export const exportarPDF = async (nombreArchivo, titulo, filas, columnas, organizacion) => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: columnas.length > 6 ? 'landscape' : 'portrait' });
    doc.setFontSize(14);
    doc.text(titulo, 14, 16);
    doc.setFontSize(9);
    doc.text(`${organizacion} · ${new Date().toLocaleString('es-CL')}`, 14, 22);
    autoTable(doc, {
        startY: 27,
        head: [columnas.map((c) => c.titulo)],
        body: aFilas(filas, columnas),
        styles: { fontSize: 8 },
    });
    doc.save(`${nombreArchivo}.pdf`);
};
