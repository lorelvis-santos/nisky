"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EditorLoading, NoteEditorScreen, safeNoteReturnTo } from "@/features/knowledge/components/NoteEditorScreen";

function NewNoteRoute() {
  const searchParams = useSearchParams();
  const returnTo = safeNoteReturnTo(searchParams.get("returnTo"), "/knowledge");

  return (
    <NoteEditorScreen
      defaultProjectId={searchParams.get("projectId") || null}
      returnTo={returnTo}
    />
  );
}

export default function NewNotePage() {
  return (
    <Suspense fallback={<EditorLoading />}>
      <NewNoteRoute />
    </Suspense>
  );
}
