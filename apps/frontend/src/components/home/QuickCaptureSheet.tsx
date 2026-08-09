"use client";

import { useRouter } from "next/navigation";
import { QuickCapture } from "@/features/quicknotes/components/QuickCapture";
import type { DetectedDate } from "@/features/quicknotes/utils/detectDate";
import type { QuickNote } from "@/types/entities";

export function QuickCaptureSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const convertToTask = (note: QuickNote, detected: DetectedDate | null) => {
    const prefill = encodeURIComponent(JSON.stringify({ title: note.content, dueDate: detected?.isoDate ?? "" }));
    onClose();
    router.push(`/tasks?modal=create&prefill=${prefill}&quickNoteId=${encodeURIComponent(note.id)}`);
  };
  return <QuickCapture onConvertToTask={convertToTask} />;
}
