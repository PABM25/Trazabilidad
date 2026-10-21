import { useState } from 'react';
import { db, todas } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { CLASES_EVENTO } from '../config';
import { exportarExcel } from '../utils/exportar';
import { fechaHora } from '../utils/formato';
import { aviso, error } from '../utils/alertas';

const MAX_DIAS = 366;

/** Modal para descargar en Excel los eventos ocurridos entre dos fechas */
const ReporteEventos = ({ onCerrar }) => {
    const { organizacion } = useAuth();
    const hoy = new Date().toISOString().slice(0, 10);
    const [desde, setDesde] = useState(hoy.slice(0, 8) + '01');
    const [hasta, setHasta] = useState(hoy);
    const [clase, setClase] = useState('');
    const [generando, setGenerando] = useState(false);

    const generar = async () => {
        const inicio = new Date(`${desde}T00:00:00`);
        const fin = new Date(`${hasta}T00:00:00`);
        fin.setDate(fin.getDate() + 1);
        if (fin <= inicio) return aviso('Rango inválido', 'La fecha final debe ser posterior a la inicial.');
        if ((fin - inicio) / 86400000 > MAX_DIAS) return aviso('Rango muy amplio', `El máximo es ${MAX_DIAS} días.`);

        setGenerando(true);
        try {
            const eventos = await todas(() => {
                let consulta = db
                    .from('eventos')
                    .select(
                        'ocurrido_en, clase, observaciones, activo:activos(codigo, atributos, cantidad_procesos, tipo:tipos_activo(nombre)), tipo_evento:tipos_evento(nombre), ubicacion:ubicaciones(nombre)'
                    )
                    .eq('organizacion_id', organizacion.id)
                    .gte('ocurrido_en', inicio.toISOString())
                    .lt('ocurrido_en', fin.toISOString())
                    .order('ocurrido_en')
                    .order('id');
                if (clase) consulta = consulta.eq('clase', clase);
                return consulta;
            });

            if (eventos.length === 0) return aviso('Sin datos', 'No hay eventos en el rango seleccionado.');

            const clavesAtributos = [...new Set(eventos.flatMap((e) => Object.keys(e.activo?.atributos || {})))];
            await exportarExcel(`Reporte_${desde}_${hasta}`, 'Eventos', eventos, [
                { titulo: 'Fecha', valor: (e) => fechaHora(e.ocurrido_en) },
                { titulo: 'Evento', valor: (e) => CLASES_EVENTO[e.clase] },
                { titulo: 'Detalle', valor: (e) => e.tipo_evento?.nombre },
                { titulo: 'Código', valor: (e) => e.activo?.codigo },
                { titulo: 'Tipo de activo', valor: (e) => e.activo?.tipo?.nombre },
                { titulo: 'Ubicación', valor: (e) => e.ubicacion?.nombre },
                { titulo: 'Procesos acumulados', valor: (e) => e.activo?.cantidad_procesos },
                ...clavesAtributos.map((k) => ({ titulo: k, valor: (e) => e.activo?.atributos?.[k] })),
                { titulo: 'Observaciones', valor: (e) => e.observaciones },
            ]);
            onCerrar();
        } catch (e) {
            error(e);
        } finally {
            setGenerando(false);
        }
    };

    return (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,.4)' }} onClick={onCerrar}>
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2 className="modal-title h5">Descargar reporte de eventos</h2>
                        <button className="btn-close" onClick={onCerrar} />
                    </div>
                    <div className="modal-body">
                        <div className="row g-3">
                            <div className="col-6">
                                <label className="form-label">Desde</label>
                                <input type="date" className="form-control" value={desde} onChange={(e) => setDesde(e.target.value)} />
                            </div>
                            <div className="col-6">
                                <label className="form-label">Hasta</label>
                                <input type="date" className="form-control" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                            </div>
                            <div className="col-12">
                                <label className="form-label">Tipo de evento</label>
                                <select className="form-select" value={clase} onChange={(e) => setClase(e.target.value)}>
                                    <option value="">Todos</option>
                                    {Object.entries(CLASES_EVENTO).map(([k, v]) => (
                                        <option key={k} value={k}>
                                            {v}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-light" onClick={onCerrar}>
                            Cancelar
                        </button>
                        <button className="btn btn-primario" onClick={generar} disabled={generando}>
                            {generando ? 'Generando…' : 'Descargar Excel'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReporteEventos;
