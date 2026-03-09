export function Loader() {
    return (
        <div className="status-modal-overlay" style={{ zIndex: 2000 }}>
            <div className="status-modal-box" style={{ padding: '40px' }}>
                <div className="status-modal-icon">
                    <div className="spinner purple" style={{ width: 44, height: 44 }} />
                </div>
                <p className="status-modal-message" style={{ marginTop: '16px', fontWeight: 600 }}>
                    Caricamento in corso...
                </p>
            </div>
        </div>
    );
}
