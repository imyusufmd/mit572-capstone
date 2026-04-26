import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  MapPin,
  Truck,
  ClipboardList,
  Users,
  BarChart3,
  FolderOpen,
  AlertTriangle,
  Settings,
  X,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/inventory', icon: Warehouse, label: 'Inventory' },
  { to: '/zones', icon: MapPin, label: 'Zones' },
  { to: '/suppliers', icon: Users, label: 'Suppliers' },
  { to: '/shipments', icon: Truck, label: 'Shipments' },
  { to: '/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/categories', icon: FolderOpen, label: 'Categories' },
  { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 border-r border-gray-700
          flex flex-col transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Warehouse size={24} className="text-blue-500" />
            <span className="text-lg font-bold text-gray-100">WMS</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-500/15 text-blue-400'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">Warehouse IMS v1.0</p>
        </div>
      </aside>
    </>
  );
}
