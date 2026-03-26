"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  LogOut,
  Building2,
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/admin/shifts", label: "シフト管理", icon: Calendar },
  { href: "/admin/staff", label: "スタッフ管理", icon: Users },
  { href: "/admin/settings", label: "施設設定", icon: Settings },
];

type AdminNavProps = {
  user: {
    display_name: string;
    email: string;
    avatar_url: string | null;
  };
  facility: {
    name: string;
    type: string;
  } | null;
};

export default function AdminNav({ user, facility }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white flex flex-col">
      {/* ロゴ */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <img
            src="/logo_graffit.png"
            alt="YOMOGI"
            className="w-9 h-9 rounded-lg object-cover"
          />
          <div>
            <div className="font-bold text-lg leading-tight">YOMOGI</div>
            <div className="text-xs text-gray-400">シフト管理AI</div>
          </div>
        </div>
      </div>

      {/* 施設名 */}
      {facility && (
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="truncate">{facility.name}</span>
          </div>
          <div className="text-xs text-gray-500 ml-6 mt-0.5">
            {facility.type === "hospital" ? "病院" : "介護施設"}
          </div>
        </div>
      )}

      {/* ナビゲーション */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ユーザー情報 */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gray-700 text-gray-200 text-xs">
              {user.display_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {user.display_name}
            </div>
            <div className="text-xs text-gray-400 truncate">{user.email}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          ログアウト
        </Button>
      </div>
    </aside>
  );
}
