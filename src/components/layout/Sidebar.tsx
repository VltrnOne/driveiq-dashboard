'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Camera, Users, Coffee, ShoppingBag, Star, BarChart2, Settings, Zap, LogOut
} from 'lucide-react';

const nav = [
  { href: '/live',      icon: Camera,      label: 'Live Feed',   badge: 'LIVE' },
  { href: '/customers', icon: Users,        label: 'Customers'  },
  { href: '/menu',      icon: Coffee,       label: 'Menu'       },
  { href: '/orders',    icon: ShoppingBag,  label: 'Orders'     },
  { href: '/rewards',   icon: Star,         label: 'Rewards'    },
  { href: '/analytics', icon: BarChart2,    label: 'Analytics'  },
  { href: '/settings',  icon: Settings,     label: 'Settings'   },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/login');
  };

  return (
    <aside className="w-56 bg-[#0D0D0D] text-white flex flex-col shrink-0 h-screen">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-[#0066FF]" />
          <div>
            <div className="font-bold text-sm tracking-wider">DRIVEIQ</div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest">Coffee AI</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, icon: Icon, label, badge }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-[#0066FF] text-white font-medium'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign out</span>
        </button>
        <div className="text-[10px] text-white/20 uppercase tracking-widest px-3">DriveIQ v1.0</div>
      </div>
    </aside>
  );
}
