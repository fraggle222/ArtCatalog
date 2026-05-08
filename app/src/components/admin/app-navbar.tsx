"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserRole } from "@/generated/prisma/client";
import { LogoutButton } from "@/components/admin/logout-button";

type AppNavbarProps = {
  user: {
    email: string;
    role: UserRole;
  };
};

type NavItem = {
  href: string;
  label: string;
  activePrefixes: string[];
};

const desktopPillBase =
  "whitespace-nowrap rounded border px-1.5 py-1.5 text-sm md:px-3 md:py-2";
const desktopPillActive =
  `${desktopPillBase} border-zinc-900 bg-zinc-900 text-white shadow-sm`;
const desktopPillInactive =
  `${desktopPillBase} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50`;
const mobileMenuItemBase = "block w-full rounded border px-3 py-2 text-sm";
const mobileMenuItemActive =
  `${mobileMenuItemBase} border-zinc-900 bg-zinc-900 text-white`;
const mobileMenuItemInactive =
  `${mobileMenuItemBase} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50`;
const logoutButtonClass =
  "rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50";

function isNavItemActive(pathname: string, activePrefixes: string[]) {
  return activePrefixes.some((prefix) => {
    if (prefix === "/") {
      return pathname === "/";
    }
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

function navClassName(active: boolean) {
  return active ? desktopPillActive : desktopPillInactive;
}

export function AppNavbar({ user }: AppNavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const canWriteCatalog = user.role === "admin" || user.role === "editor";
  const canManageArtists = canWriteCatalog;
  const canManageUsers = user.role === "admin";

  const items: NavItem[] = [
    { href: "/artworks", label: "Artworks", activePrefixes: ["/artworks"] },
    {
      href: "/admin/favorites",
      label: "Favorites",
      activePrefixes: ["/admin/favorites"],
    },
    ...(canWriteCatalog
      ? [
          {
            href: "/admin/artworks/new",
            label: "New Artwork",
            activePrefixes: ["/admin/artworks/new"],
          },
          {
            href: "/admin/intake",
            label: "Bulk Intake",
            activePrefixes: ["/admin/intake"],
          },
        ]
      : []),
    ...(canManageArtists
      ? [
          {
            href: "/admin/artists",
            label: "Artists",
            activePrefixes: ["/admin/artists"],
          },
        ]
      : []),
    ...(canManageUsers
      ? [
          {
            href: "/admin/users",
            label: "Users",
            activePrefixes: ["/admin/users"],
          },
        ]
      : []),
  ];

  return (
    <header className="border-b bg-white">
      <div className="mx-auto w-full max-w-6xl px-3 py-2 md:px-6 md:py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/artworks"
            className="inline-flex min-w-0 items-center gap-2 rounded px-1 py-1"
            aria-label="Go to artworks"
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-black">
              <span className="ml-[2px] h-0 w-0 border-b-[5px] border-l-[8px] border-t-[5px] border-b-transparent border-l-white border-t-transparent" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Art Catalog</span>
          </Link>

          <button
            type="button"
            className="ml-auto rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-700 md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-app-nav"
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </button>

          <div className="ml-auto hidden items-center gap-2 md:flex">
            <p className="hidden text-sm text-zinc-600 md:block">
              {user.email} ({user.role})
            </p>
            <LogoutButton className={`whitespace-nowrap ${logoutButtonClass}`} />
          </div>
        </div>

        <nav className="mt-2 hidden flex-wrap items-center gap-1.5 md:mt-3 md:flex md:gap-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navClassName(
                pathname ? isNavItemActive(pathname, item.activePrefixes) : false
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {mobileMenuOpen ? (
          <div
            id="mobile-app-nav"
            className="mt-2 w-full min-w-0 space-y-2 border-t pt-2 md:hidden"
          >
            <div className="space-y-2">
              {items.map((item) => {
                const active = pathname
                  ? isNavItemActive(pathname, item.activePrefixes)
                  : false;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={active ? mobileMenuItemActive : mobileMenuItemInactive}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-2 border-t pt-2">
              <p className="min-w-0 text-sm text-zinc-600">
                {user.email} ({user.role})
              </p>
              <LogoutButton className={logoutButtonClass} />
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
