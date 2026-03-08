import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackBarProps {
    title: string;
}

export function BackBar({ title }: BackBarProps) {
    const navigate = useNavigate();
    return (
        <div className="back-bar">
            <button
                className="back-btn"
                onClick={() => navigate('/')}
                aria-label="Torna alla home"
            >
                <ArrowLeft size={20} aria-hidden="true" />
                <span>Indietro</span>
            </button>
            <span className="back-title">{title}</span>
        </div>
    );
}
