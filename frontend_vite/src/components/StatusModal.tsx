import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface StatusModalProps {
    status: 'success' | 'error' | null;
    message: string;
    onClose: () => void;
    autoClose?: boolean;
    duration?: number;
}

export function StatusModal({ status, message, onClose, autoClose = true, duration = 2500 }: StatusModalProps) {
    useEffect(() => {
        if (status && autoClose) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [status, autoClose, duration, onClose]);

    if (!status) return null;

    return (
        <div className="status-modal-overlay" onClick={onClose}>
            <div className={`status-modal-box ${status}`} onClick={(e) => e.stopPropagation()}>
                <button className="status-modal-close" onClick={onClose} aria-label="Chiudi">
                    <X size={20} />
                </button>
                <div className="status-modal-icon">
                    {status === 'success' ? (
                        <CheckCircle2 size={48} className="text-success" />
                    ) : (
                        <AlertCircle size={48} className="text-error" />
                    )}
                </div>
                <h2 className="status-modal-title">
                    {status === 'success' ? 'Perfetto!' : 'Oops!'}
                </h2>
                <p className="status-modal-message">{message}</p>
            </div>
        </div>
    );
}
