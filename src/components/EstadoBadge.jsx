import { ESTADOS } from '../config';

const EstadoBadge = ({ estado }) => {
    const e = ESTADOS[estado] || { etiqueta: estado, color: 'light' };
    return <span className={`badge text-bg-${e.color}`}>{e.etiqueta}</span>;
};

export default EstadoBadge;
