"use client";

import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { EditorLoading, EditorMessage, NoteEditorScreen, safeNoteReturnTo } from "@/features/knowledge/components/NoteEditorScreen";
import { useNoteQuery } from "@/features/knowledge/hooks/useKnowledge";

function EditNoteRoute() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteQuery = useNoteQuery(params.id);
  const returnTo = safeNoteReturnTo(searchParams.get("returnTo"), "/knowledge");

  if (noteQuery.isLoading) return <EditorMessage message="Cargando nota..." onBack={() => router.push(returnTo)} />;
  if (noteQuery.isError || !noteQuery.data) return <EditorMessage message="No pudimos cargar esta nota." onBack={() => router.push(returnTo)} />;

  return <NoteEditorScreen note={noteQuery.data} returnTo={returnTo} />;
}

export default function EditNotePage() {
  return (
    <Suspense fallback={<EditorLoading />}>
      <EditNoteRoute />
    </Suspense>
  );
}
