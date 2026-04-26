const statusColors: Record<string, string> = {
  // Order statuses
  Pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Picking: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Picked: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Packing: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  Packed: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  Shipped: 'bg-green-500/20 text-green-400 border-green-500/30',
  Delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  // Shipment statuses
  'In Transit': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Received: 'bg-green-500/20 text-green-400 border-green-500/30',
  'Partially Received': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const defaultColor = 'bg-gray-500/20 text-gray-400 border-gray-500/30';

export default function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] || defaultColor;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {status}
    </span>
  );
}
