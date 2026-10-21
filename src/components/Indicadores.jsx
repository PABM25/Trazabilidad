import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { db, q } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { MESES } from '../utils/formato';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const Tarjeta = ({ titulo, valor, color = 'primario', ayuda }) => (
    <div className="col-6 col-md-4 col-xl-3">
        <div className={`card tarjeta-indicador borde-${color} h-100`}>
            <div className="card-body">
                <div className="small text-muted">{titulo}</div>
                <div className="cifra">{valor ?? '…'}</div>
                {ayuda && <div className="small text-muted">{ayuda}</div>}
            </div>
        </div>
    </div>
);

/** Tarjetas de indicadores y gráfico mensual. Si se pasa ubicacionId, filtra por esa ubicación. */
const Indicadores = ({ ubicacionId = null }) => {
    const { organizacion } = useAuth();
    const anioActual = new Date().getFullYear();
    const [anio, setAnio] = useState(anioActual);
    const [est, setEst] = useState({});
    const [serie, setSerie] = useState([]);

    useEffect(() => {
        q(db.rpc('estadisticas', { p_org: organizacion.id, p_ubicacion: ubicacionId }))
            .then(setEst)
            .catch((e) => console.error(e));
    }, [organizacion.id, ubicacionId]);

    useEffect(() => {
        q(db.rpc('serie_mensual', { p_org: organizacion.id, p_anio: anio, p_ubicacion: ubicacionId }))
            .then(setSerie)
            .catch((e) => console.error(e));
    }, [organizacion.id, ubicacionId, anio]);

    const color = organizacion.color_primario;

    return (
        <>
            <div className="row g-3 mb-4">
                <Tarjeta titulo="Activos vigentes" valor={est.total} />
                <Tarjeta titulo="Registrados últimos 30 días" valor={est.registrados_mes} />
                <Tarjeta titulo="Disponibles (en stock)" valor={est.disponibles} color="exito" />
                <Tarjeta titulo="En uso" valor={est.en_uso} />
                <Tarjeta titulo="Procesos realizados" valor={est.procesos} ayuda={`${est.procesos_mes ?? '…'} en los últimos 30 días`} />
                <Tarjeta titulo="En mantenimiento" valor={est.mantenimiento} color="alerta" />
                <Tarjeta
                    titulo="Cerca del fin de vida útil"
                    valor={est.fin_vida_util}
                    color="alerta"
                    ayuda="≥ 90 % de los procesos permitidos"
                />
                <Tarjeta titulo="Dados de baja" valor={est.bajas} color="peligro" />
            </div>

            <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <span>Actividad mensual</span>
                    <select className="form-select form-select-sm w-auto" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
                        {Array.from({ length: 5 }, (_, i) => anioActual - i).map((a) => (
                            <option key={a}>{a}</option>
                        ))}
                    </select>
                </div>
                <div className="card-body" style={{ height: 300 }}>
                    <Bar
                        data={{
                            labels: MESES,
                            datasets: [
                                { label: 'Activos registrados', data: serie.map((s) => s.registrados), backgroundColor: color },
                                { label: 'Procesos', data: serie.map((s) => s.procesos), backgroundColor: '#4ab0d9' },
                            ],
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                        }}
                    />
                </div>
            </div>
        </>
    );
};

export default Indicadores;
