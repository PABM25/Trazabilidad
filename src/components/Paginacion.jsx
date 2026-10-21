const Paginacion = ({ pagina, total, porPagina, onCambiar }) => {
    const paginas = Math.ceil(total / porPagina);
    if (paginas <= 1) return null;

    const desde = Math.max(1, Math.min(pagina - 2, paginas - 4));
    const numeros = Array.from({ length: Math.min(5, paginas) }, (_, i) => desde + i);

    return (
        <nav className="d-flex justify-content-between align-items-center mt-3 small">
            <span className="text-muted">
                {(pagina - 1) * porPagina + 1}–{Math.min(pagina * porPagina, total)} de {total}
            </span>
            <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${pagina === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => onCambiar(pagina - 1)}>
                        ‹
                    </button>
                </li>
                {numeros.map((n) => (
                    <li key={n} className={`page-item ${n === pagina ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => onCambiar(n)}>
                            {n}
                        </button>
                    </li>
                ))}
                <li className={`page-item ${pagina === paginas ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => onCambiar(pagina + 1)}>
                        ›
                    </button>
                </li>
            </ul>
        </nav>
    );
};

export default Paginacion;
