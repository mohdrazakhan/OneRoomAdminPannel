import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './RoomsPage.css';

export default function RoomsPage() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortField, setSortField] = useState('createdAt');
    const [sortDir, setSortDir] = useState('desc');

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const snap = await getDocs(collection(db, 'rooms'));
                const list = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    createdAt: d.data().createdAt?.toDate?.() || null,
                }));
                setRooms(list);
            } catch (err) {
                console.error('Failed to fetch rooms:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchRooms();
    }, []);

    const filtered = useMemo(() => {
        return rooms
            .filter(r => {
                const isTrip = r.settings?.isTrip === true;
                if (typeFilter === 'room' && isTrip) return false;
                if (typeFilter === 'trip' && !isTrip) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                    r.name?.toLowerCase().includes(q) ||
                    r.joinCode?.toLowerCase().includes(q) ||
                    r.id.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                let valA, valB;
                if (sortField === 'createdAt') {
                    valA = a.createdAt?.getTime?.() || 0;
                    valB = b.createdAt?.getTime?.() || 0;
                } else if (sortField === 'members') {
                    valA = a.members?.length || 0;
                    valB = b.members?.length || 0;
                } else {
                    valA = (a[sortField] || '').toString().toLowerCase();
                    valB = (b[sortField] || '').toString().toLowerCase();
                }
                return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
            });
    }, [rooms, searchQuery, typeFilter, sortField, sortDir]);

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const SortIcon = ({ field }) => (
        <span className={`sort-icon ${sortField === field ? 'sort-active' : ''}`}>
            {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
    );

    const tripCount = rooms.filter(r => r.settings?.isTrip).length;
    const roomCount = rooms.length - tripCount;

    if (loading) return <div className="dashboard-loading"><div className="loader-ring" /><p>Loading rooms...</p></div>;

    return (
        <div className="rooms-page">
            <div className="page-header">
                <h1 className="page-title">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
                    Room Management
                </h1>
                <p className="page-subtitle">{rooms.length} total rooms ({roomCount} regular, {tripCount} trips)</p>
            </div>

            <div className="rooms-toolbar">
                <div className="search-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" placeholder="Search by name or join code..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    {searchQuery && <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>}
                </div>
                <div className="filter-tabs">
                    <button className={`filter-tab ${typeFilter === 'all' ? 'filter-active' : ''}`} onClick={() => setTypeFilter('all')}>All ({rooms.length})</button>
                    <button className={`filter-tab ${typeFilter === 'room' ? 'filter-active' : ''}`} onClick={() => setTypeFilter('room')}>Rooms ({roomCount})</button>
                    <button className={`filter-tab ${typeFilter === 'trip' ? 'filter-active' : ''}`} onClick={() => setTypeFilter('trip')}>Trips ({tripCount})</button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state animate-fade-in"><h3>No rooms found</h3></div>
            ) : (
                <div className="rooms-table-wrap animate-fade-in">
                    <table className="rooms-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('name')}>Room Name <SortIcon field="name" /></th>
                                <th>Type</th>
                                <th onClick={() => handleSort('members')}>Members <SortIcon field="members" /></th>
                                <th>Join Code</th>
                                <th>Guests</th>
                                <th onClick={() => handleSort('createdAt')}>Created <SortIcon field="createdAt" /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => {
                                const isTrip = r.settings?.isTrip === true;
                                const guestCount = r.guests ? Object.keys(r.guests).filter(k => r.guests[k]?.isActive !== false).length : 0;
                                return (
                                    <tr key={r.id} className="room-row" onClick={() => navigate(`/rooms/${r.id}`)}>
                                        <td>
                                            <div className="room-cell">
                                                <div className={`room-icon ${isTrip ? 'room-icon-trip' : ''}`}>
                                                    {isTrip ? '✈️' : '🏠'}
                                                </div>
                                                <span className="room-name-text">{r.name || 'Unnamed'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`type-badge ${isTrip ? 'type-trip' : 'type-room'}`}>
                                                {isTrip ? 'Trip' : 'Room'}
                                            </span>
                                        </td>
                                        <td className="room-members-count">{r.members?.length || 0}</td>
                                        <td><span className="join-code">{r.joinCode || '—'}</span></td>
                                        <td className="room-guests-count">{guestCount || '—'}</td>
                                        <td className="room-date">{r.createdAt ? formatDistanceToNow(r.createdAt, { addSuffix: true }) : '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="table-footer">Showing {filtered.length} of {rooms.length} rooms</div>
        </div>
    );
}
