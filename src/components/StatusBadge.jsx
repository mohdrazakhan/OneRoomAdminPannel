import './StatusBadge.css';

const STATUS_CONFIG = {
    open: { label: 'Open', className: 'status-open' },
    'in-progress': { label: 'In Progress', className: 'status-progress' },
    resolved: { label: 'Resolved', className: 'status-resolved' },
    closed: { label: 'Closed', className: 'status-closed' },
};

export default function StatusBadge({ status, size = 'sm', onClick, interactive = false }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.open;

    return (
        <span
            className={`status-badge ${config.className} status-${size} ${interactive ? 'status-interactive' : ''}`}
            onClick={onClick}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
        >
            <span className="status-dot" />
            {config.label}
        </span>
    );
}
