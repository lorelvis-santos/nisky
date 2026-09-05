"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateFeedbackMutation } from "@/features/feedback/hooks/useFeedback";
import type { FeedbackCategory } from "@/types/entities";

const CATEGORIES: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "BUG", label: "Bug o algo que no funciona" },
  { value: "IDEA", label: "Idea nueva" },
  { value: "IMPROVEMENT", label: "Mejora" },
  { value: "OTHER", label: "Otro" },
];

export function FeedbackForm() {
  const [category, setCategory] = useState<FeedbackCategory>("BUG");
  const [message, setMessage] = useState("");
  const [includeEmail, setIncludeEmail] = useState(true);
  const mutation = useCreateFeedbackMutation();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) return;
    mutation.mutate(
      { category, message: message.trim(), includeEmail },
      {
        onSuccess: () => {
          toast.success("Gracias, tu feedback fue enviado.");
          setMessage("");
          setIncludeEmail(true);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "No se pudo enviar el feedback."),
      },
    );
  }

  return (
    <form className="rounded-lg border border-outline-variant bg-surface p-container-padding shadow-cadence-1" onSubmit={submit}>
      <h2 className="font-headline-xs text-headline-xs text-on-surface">Cuéntanos qué pasó</h2>
      <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
        Tu feedback llega directamente al equipo de Nisky.
      </p>

      <label className="mt-4 block">
         <span className="font-label-md text-label-md text-on-surface-variant">Categoría</span>
        <select className="field mt-1" onChange={(e) => setCategory(e.target.value as FeedbackCategory)} value={category}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </label>

      <label className="mt-3 block">
         <span className="font-label-md text-label-md text-on-surface-variant">Mensaje</span>
        <textarea
          className="field mt-1 h-28 resize-y py-2"
          maxLength={5000}
          minLength={5}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Descríbenos qué viste o qué te gustaría que existiera…"
          required
          value={message}
        />
      </label>

      <label className="mt-3 flex cursor-pointer items-start gap-2">
         <input
           checked={includeEmail}
           className="mt-1 size-5 accent-tertiary"
          onChange={(e) => setIncludeEmail(e.target.checked)}
          type="checkbox"
        />
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Incluir mi email para que puedan responderme
        </span>
      </label>

       <button
         className="mt-4 min-h-11 rounded-md bg-primary px-4 py-2 font-body-md text-body-md text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
        disabled={mutation.isPending || message.trim().length < 5}
        type="submit"
      >
        {mutation.isPending ? <Loader2 className="mr-1 inline animate-spin" size={14} /> : null}
        Enviar feedback
      </button>
    </form>
  );
}
