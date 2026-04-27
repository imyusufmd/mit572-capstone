import { useEffect, useState } from 'react';
import { User, Server, Shield, LogOut } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/endpoints';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [authStatus, setAuthStatus] = useState<{ ldapAvailable: boolean; mode: string } | null>(null);

  useEffect(() => {
    authApi
      .status()
      .then((r) => setAuthStatus(r.data))
      .catch(() => setAuthStatus(null));
  }, []);

  if (!user) return null;

  return (
    <div>
      <PageHeader title="Settings" description="Account info and system status" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card icon={<User size={18} className="text-blue-400" />} title="Account">
          <Row label="Full Name" value={user.fullName} />
          <Row label="Username" value={user.username} />
          <Row label="Role" value={user.role} />
        </Card>

        <Card icon={<Shield size={18} className="text-emerald-400" />} title="Authentication">
          <Row label="Mode" value={authStatus?.mode ?? '—'} />
          <Row
            label="AD Available"
            value={authStatus?.ldapAvailable ? 'Yes' : 'No'}
          />
          <p className="text-xs text-gray-500 mt-2">
            When AD is available, login validates credentials against the Active Directory domain controller.
          </p>
        </Card>

        <Card icon={<Server size={18} className="text-purple-400" />} title="System">
          <Row label="Frontend" value="React 19 + Vite + TypeScript" />
          <Row label="API" value=".NET 10 ASP.NET Core" />
          <Row label="OLTP" value="PostgreSQL 16" />
          <Row label="Data Warehouse" value="SQL Server 2022" />
          <Row label="ETL" value="Node-RED" />
        </Card>

        <Card icon={<LogOut size={18} className="text-red-400" />} title="Session">
          <p className="text-sm text-gray-400 mb-4">
            Sign out of your current session. You will be redirected to the login page.
          </p>
          <Button variant="danger" icon={<LogOut size={14} />} onClick={logout}>
            Sign Out
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">{icon}</div>
        <h3 className="text-base font-semibold text-gray-100">{title}</h3>
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 font-medium text-right">{value}</span>
    </div>
  );
}
