"use client";

import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { MyFeedbackList } from "@/components/feedback/MyFeedbackList";

const FAQS: Array<{ question: string; answer: string }> = [
  {
    question: "¿Cómo conecto mi Moodle o Canvas?",
    answer: "Ve a Ajustes › Integraciones, elige la plataforma e ingresa el dominio de tu institución y tus credenciales o un token. Las tareas y entregas próximas aparecerán automáticamente.",
  },
  {
    question: "¿Mis notas y mi diario son privados?",
    answer: "Sí. El diario se cifra en tu dispositivo antes de guardarse y todas tus notas están aisladas por usuario.",
  },
  {
    question: "¿Para qué sirve el botón de feedback?",
    answer: "Estamos en fase de pruebas. Envía bugs, ideas o mejoras; el equipo las revisa y puede responderte con el email que elijas.",
  },
];

export default function SupportPage() {
  return (
    <section className="h-full space-y-8 overflow-y-auto p-container-padding sm:p-section-gap">
      <div className="border border-outline-variant bg-surface-container-lowest p-container-padding">
        <p className="font-label-caps text-label-caps text-on-surface-variant">AYUDA</p>
        <h1 className="mt-2 font-headline-sm text-headline-sm">Centro de ayuda</h1>
        <p className="mt-3 font-body-sm text-body-sm text-on-surface-variant">¿Tienes dudas o algo no funciona? Aquí puedes encontrar respuestas o contarnos qué pasó.</p>
      </div>

      <div className="border border-outline-variant bg-surface-container-lowest p-container-padding">
        <h2 className="font-headline-xs text-headline-xs">Preguntas frecuentes</h2>
        <ul className="mt-3 divide-y divide-outline-variant">
          {FAQS.map((item) => (
            <li className="py-3" key={item.question}>
              <p className="font-body-md text-body-md">{item.question}</p>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{item.answer}</p>
            </li>
          ))}
        </ul>
      </div>

      <FeedbackForm />
      <MyFeedbackList />
    </section>
  );
}