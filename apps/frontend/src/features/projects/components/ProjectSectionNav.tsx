import {
  Activity,
  FileText,
  FolderKanban,
  Link2,
  ListTodo,
  MessageSquare,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

export type ProjectVisibleTab =
  | "overview"
  | "tasks"
  | "notes"
  | "activity"
  | "team"
  | "chat"
  | "resources";

const tabs: Array<{
  id: ProjectVisibleTab;
  label: string;
  Icon: (props: { size?: number }) => ReactNode;
}> = [
  { id: "overview", label: "Resumen", Icon: FolderKanban },
  { id: "tasks", label: "Tareas", Icon: ListTodo },
  { id: "notes", label: "Notas", Icon: FileText },
  { id: "resources", label: "Recursos", Icon: Link2 },
  { id: "activity", label: "Actividad", Icon: Activity },
  { id: "team", label: "Equipo", Icon: Users },
  { id: "chat", label: "Conversación", Icon: MessageSquare },
];

export function ProjectSectionNav({
  activeTab,
  onNavigate,
}: {
  activeTab: ProjectVisibleTab;
  onNavigate: (tab: ProjectVisibleTab) => void;
}) {
  return (
    <nav
      aria-label="Secciones del proyecto"
       className="mt-7 border-b border-[#dde1e2]"
    >
      <div className="no-scrollbar flex gap-1 overflow-x-auto">
        {tabs.map(({ id, label, Icon }) => {
          const selected = activeTab === id;
          return (
            <button
              aria-current={selected ? "page" : undefined}
               className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-2 text-[13px] font-semibold transition-colors sm:px-4 ${selected ? "border-[#1e3a5f] text-[#1e3a5f]" : "border-transparent text-[#5f6872] hover:bg-[#eff1f0] hover:border-[#b8c0c4] hover:text-[#1f2933]"}`}
              key={id}
              onClick={() => onNavigate(id)}
              type="button"
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
