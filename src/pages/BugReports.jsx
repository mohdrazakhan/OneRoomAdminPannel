import { useState } from 'react';
import { Search } from 'lucide-react';
import { bugReports as initialBugs } from '../data/mockData';

const statusColors = {
  Open: 'bg-red-100 text-red-600',
  'Under Process': 'bg-yellow-100 text-yellow-700',
  Solved: 'bg-green-100 text-green-700',
};

const priorityColors = {
  High: 'bg-red-50 text-red-600 border border-red-200',
  Medium: 'bg-yellow-50 text-yellow-600 border border-yellow-200',
  Low: 'bg-gray-50 text-gray-500 border border-gray-200',
};

const statusOrder = ['Open', 'Under Process', 'Solved'];

export default function BugReports() {
  const [bugs, setBugs] = useState(initialBugs);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = bugs.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.reporter.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (id, newStatus) => {
    setBugs((prev) => prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b)));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Bug Reports</h3>
          <p className="text-sm text-gray-500">{filtered.length} reports found</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search bugs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-56"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Status</option>
            <option value="Open">Open</option>
            <option value="Under Process">Under Process</option>
            <option value="Solved">Solved</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reporter</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((bug) => (
              <tr key={bug.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 max-w-xs">
                  <span className="font-medium text-gray-800 line-clamp-2">{bug.title}</span>
                </td>
                <td className="px-6 py-4 text-gray-600">{bug.reporter}</td>
                <td className="px-6 py-4 text-gray-600">{bug.date}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[bug.priority]}`}>
                    {bug.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[bug.status]}`}>
                    {bug.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select
                    value={bug.status}
                    onChange={(e) => handleStatusChange(bug.id, e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOrder.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No bug reports found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
