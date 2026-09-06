import { cn } from "@/lib/utils";

export function ProjectWorkspaceShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("project-workspace h-full min-h-0 overflow-y-auto bg-[#f7f7f5] text-[#1f2933]", className)}>
      <div className="mx-auto flex min-h-full w-full flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
        {children}
      </div>
    </section>
  );
}
