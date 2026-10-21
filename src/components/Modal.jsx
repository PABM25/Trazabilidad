/** Modal simple controlado por estado (sin depender del JS de Bootstrap) */
const Modal = ({ titulo, onCerrar, onEnviar, enviando, textoEnviar = 'Guardar', children }) => (
    <div className="modal d-block" style={{ background: 'rgba(0,0,0,.4)' }} onClick={onCerrar}>
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <form
                className="modal-content"
                onSubmit={(e) => {
                    e.preventDefault();
                    onEnviar();
                }}
            >
                <div className="modal-header">
                    <h2 className="modal-title h5">{titulo}</h2>
                    <button type="button" className="btn-close" onClick={onCerrar} />
                </div>
                <div className="modal-body">{children}</div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-light" onClick={onCerrar}>
                        Cancelar
                    </button>
                    <button className="btn btn-primario" disabled={enviando}>
                        {enviando ? 'Guardando…' : textoEnviar}
                    </button>
                </div>
            </form>
        </div>
    </div>
);

export default Modal;
