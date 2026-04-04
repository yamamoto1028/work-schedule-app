"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import NotificationBell from "@/components/notification-bell";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  LogOut,
  Building2,
  ClipboardList,
  ArrowLeftRight,
  Menu,
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/admin/shifts", label: "シフト管理", icon: Calendar },
  { href: "/admin/staff", label: "スタッフ管理", icon: Users },
  { href: "/admin/leaves", label: "休暇申請", icon: ClipboardList },
  { href: "/admin/settings", label: "施設設定", icon: Settings },
];

type AdminNavProps = {
  user: {
    id: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
  };
  facility: {
    name: string;
    type: string;
  } | null;
};

function NavContent({
  user,
  facility,
  pathname,
  onLogout,
  onNavigate,
}: {
  user: AdminNavProps["user"];
  facility: AdminNavProps["facility"];
  pathname: string;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* ロゴ */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Image
            src="/logo_graffit.png"
            alt="YOMOGI"
            width={36}
            height={36}
            className="rounded-lg object-cover"
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

      {/* 通知ベル */}
      <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500">通知</span>
        <NotificationBell userId={user.id} />
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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

      {/* スタッフ画面リンク */}
      <div className="px-4 py-2 border-t border-gray-700">
        <Link
          href="/staff/my-shifts"
          onClick={onNavigate}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <ArrowLeftRight className="h-4 w-4 shrink-0" />
          スタッフ画面へ
        </Link>
      </div>

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
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          ログアウト
        </Button>
      </div>
    </div>
  );
}

export default function AdminNav({ user, facility }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* デスクトップ: 固定サイドバー */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-gray-900 text-white flex-col z-30">
        <NavContent
          user={user}
          facility={facility}
          pathname={pathname}
          onLogout={handleLogout}
        />
      </aside>

      {/* モバイル: トップバー */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900 text-white flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <Image
            src="/logo_graffit.png"
            alt="YOMOGI"
            width={28}
            height={28}
            className="rounded-md object-cover"
          />
          <span className="font-bold text-base">YOMOGI</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell userId={user.id} />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-md text-white hover:bg-gray-800">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-gray-900 text-white border-gray-700">
              <NavContent
                user={user}
                facility={facility}
                pathname={pathname}
                onLogout={handleLogout}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* モバイル: トップバー分のスペーサー */}
      <div className="md:hidden h-14" />
    </>
  );
}
