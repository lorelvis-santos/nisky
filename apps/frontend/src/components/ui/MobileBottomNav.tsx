"use client";

import Link from "next/link";
import {
  ChevronRight,
  MoreHorizontal,
  LogOut,
  MessageSquarePlus,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { Avatar } from "@/components/ui/Avatar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAuth } from "@/context/AuthProvider";
import {
  isNavigationItemActive,
  mobileMoreAccountItems,
  mobileMoreItems,
  mobilePrimaryItems,
} from "@/components/ui/navigation";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const moreActive = [...mobileMoreItems, ...mobileMoreAccountItems].some(
    (item) => isNavigationItemActive(pathname, item.href),
  );

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface-bright/95 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_24px_-16px_rgba(15,23,42,0.24)] backdrop-blur-md sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1 px-2 pt-1">
          {mobilePrimaryItems.map((item) => {
            const active = isNavigationItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                 className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-center transition-colors ${active ? "bg-secondary-fixed text-secondary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
                href={item.href}
                key={item.href}
              >
                <Icon
                  aria-hidden="true"
                  size={20}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span className="font-label-md text-[11px] font-medium leading-4">
                  {item.label}
                </span>
              </Link>
            );
          })}
          <button
            aria-expanded={moreOpen}
            aria-label="Abrir más opciones"
             className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-center transition-colors ${moreActive || moreOpen ? "bg-secondary-fixed text-secondary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
            onClick={() => setMoreOpen(true)}
            type="button"
          >
            <MoreHorizontal
              aria-hidden="true"
              size={20}
              strokeWidth={moreActive || moreOpen ? 2.2 : 1.8}
            />
            <span className="font-label-md text-[11px] font-medium leading-4">
              Más
            </span>
          </button>
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
         <DrawerContent className="max-h-[88dvh] rounded-t-lg border-outline-variant bg-surface-bright pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <DrawerHeader className="flex flex-row items-center justify-between gap-3 border-b border-outline-variant px-4 py-3 text-left">
            <Link
              aria-label="Abrir ajustes de cuenta"
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-surface-container-low"
              href="/settings"
              onClick={() => setMoreOpen(false)}
            >
              <Avatar
                avatarUrl={user?.avatarUrl}
                className="h-9 w-9"
                email={user?.email}
                name={user?.name}
                size="md"
              />
              <div className="min-w-0">
                <DrawerTitle className="font-body-md text-body-md font-semibold normal-case tracking-normal text-on-surface">
                  Ajustes de cuenta
                </DrawerTitle>
                <DrawerDescription className="truncate text-left font-body-sm text-body-sm text-on-surface-variant">
                  {user?.name ?? user?.email ?? "Tu espacio de trabajo"}
                </DrawerDescription>
              </div>
              <ChevronRight
                className="ml-auto shrink-0 text-on-surface-variant"
                size={18}
              />
            </Link>
            <DrawerClose asChild>
              <button
                aria-label="Cerrar menú"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                type="button"
              >
                <X size={19} />
              </button>
            </DrawerClose>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 py-3" data-modal-scroll>
            <p className="px-3 pb-2 font-label-caps text-label-caps text-on-surface-variant">
              NAVEGACIÓN
            </p>
            <nav aria-label="Más opciones" className="grid gap-1">
              {mobileMoreItems.map((item) => {
                const active = isNavigationItemActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                     className={`flex min-h-12 items-center gap-3 rounded-md px-3 text-left font-body-md text-body-md transition-colors ${active ? "bg-secondary-fixed text-secondary font-semibold" : "text-on-surface hover:bg-surface-container-low"}`}
                    href={item.href}
                    key={item.href}
                    onClick={() => setMoreOpen(false)}
                  >
                    <Icon
                      aria-hidden="true"
                      size={19}
                      strokeWidth={active ? 2.2 : 1.8}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 border-t border-outline-variant pt-3">
              <p className="px-3 pb-2 font-label-caps text-label-caps text-on-surface-variant">
                CUENTA Y AYUDA
              </p>
              <nav aria-label="Cuenta y ayuda" className="grid gap-1">
                {mobileMoreAccountItems.map((item) => {
                  const active = isNavigationItemActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                       className={`flex min-h-12 items-center gap-3 rounded-md px-3 text-left font-body-md text-body-md transition-colors ${active ? "bg-secondary-fixed font-semibold text-secondary" : "text-on-surface hover:bg-surface-container-low"}`}
                      href={item.href}
                      key={item.href}
                      onClick={() => setMoreOpen(false)}
                    >
                      <Icon
                        aria-hidden="true"
                        size={19}
                        strokeWidth={active ? 2.2 : 1.8}
                      />
                      {item.label}
                    </Link>
                  );
                })}
                <button
                   className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left font-body-md text-body-md text-on-surface hover:bg-surface-container-low"
                  onClick={() => {
                    setMoreOpen(false);
                    setFeedbackOpen(true);
                  }}
                  type="button"
                >
                  <MessageSquarePlus
                    aria-hidden="true"
                    size={19}
                    strokeWidth={1.8}
                  />
                  Feedback
                </button>
              </nav>
            </div>
            <div className="mt-3 border-t border-outline-variant pt-3">
              <button
                 className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left font-body-md text-body-md text-error hover:bg-error-container"
                onClick={() => {
                  setMoreOpen(false);
                  void logout();
                }}
                type="button"
              >
                <LogOut aria-hidden="true" size={19} strokeWidth={1.8} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  );
}
