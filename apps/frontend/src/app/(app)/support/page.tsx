"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { MyFeedbackList } from "@/components/feedback/MyFeedbackList";

const FAQS: Array<{ question: string; answer: string }> = [
  {
    question: "¿Cómo planifico mis tareas?",
    answer:
      "Entra a Planificación y tareas. Verás tu semana: arrastra las tareas entre días o crea nuevas en el proyecto que quieras. Lo que no tenga fecha aún, espera en Pendientes hasta que le encuentres día.",
  },
  {
    question: "¿Qué es el Horario?",
    answer:
      "El Horario es para reservar horas de tu día como si fueran citas contigo mismo: clases, estudio, deporte... En computador puedes arrastrar directamente sobre la parrilla para apartar el tiempo que quieras. En el móvil, toca una hora libre y completa los datos, o pulsa el botón + abajo a la derecha. Si algo se repite cada semana, dile que se repita y listo. También puedes pedirle a Nisky que te avise antes de que empiece.",
  },
  {
    question: "¿Cómo me concentro mejor?",
    answer:
      "El Modo enfoque es un cronómetro sencillo para estudiar o trabajar sin distracciones. Elige cuánto quieres enfocarte, tómate tus descansos y dale. Tú controlas el ritmo.",
  },
  {
    question: "¿Dónde guardo una idea rápida?",
    answer:
      'Como nota rápida: en computador pulsa el botón "Nota" arriba a la derecha (o Alt+N), y en el móvil usa el botón flotante que aparece en Inicio. Escribe y se guarda solo; luego puedes archivarla o borrarla.',
  },
  {
    question: "¿Cómo me llegan los recordatorios?",
    answer:
      "Crea tus recordatorios en la sección Recordatorios. Y si activas las notificaciones en Ajustes › Notificaciones, Nisky te avisa cuando una tarea o un bloque de tu Horario se acerca, o cuando tu plataforma tenga novedades.",
  },
  {
    question: "¿Cómo conecto mi universidad?",
    answer:
      "Ve a Ajustes › Integraciones y elige tu universidad de la lista (ITLA, INTEC, PUCMM, UNAPEC, UCNE u otra). Con tus credenciales o un token, Nisky conecta la plataforma de tu institución y trae tus tareas y entregas próximas.",
  },
  {
    question: "¿Mis notas y mi diario son privados?",
    answer:
      "Sí, totalmente. El diario se cifra antes de guardarse en tu dispositivo y todo lo demás está protegido con tu cuenta.",
  },
  {
    question: "¿Cómo te cuento un problema o una idea?",
    answer:
      "Pulsa el botón Feedback en el sidebar o usa el formulario que verás abajo. Cuéntanos qué pasó y envíalo: leemos todo y podemos responderte por email si lo prefieres.",
  },
];

export default function SupportPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="h-full space-y-8 overflow-y-auto p-container-padding sm:p-section-gap">
      <div className="border border-outline-variant bg-surface-container-lowest p-container-padding">
        <p className="font-label-caps text-label-caps text-on-surface-variant">
          AYUDA
        </p>
        <h1 className="mt-2 font-headline-sm text-headline-sm">
          Centro de ayuda
        </h1>
        <p className="mt-3 font-body-sm text-body-sm text-on-surface-variant">
          ¿Tienes dudas o algo no funciona? Aquí puedes encontrar respuestas o
          contarnos qué pasó.
        </p>
      </div>

      <div className="border border-outline-variant bg-surface-container-lowest p-container-padding">
        <h2 className="font-headline-xs text-headline-xs">
          Preguntas frecuentes
        </h2>
        <div className="mt-3 divide-y divide-outline-variant">
          {FAQS.map((item, index) => {
            const open = openIndex === index;
            return (
              <div key={item.question}>
                <button
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left"
                  onClick={() => setOpenIndex(open ? null : index)}
                  type="button"
                >
                  <span className="font-body-md text-body-md">{item.question}</span>
                  <ChevronDown
                    className={`shrink-0 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
                    size={18}
                  />
                </button>
                {open && (
                  <p className="pb-3 font-body-sm text-body-sm text-on-surface-variant">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <FeedbackForm />
      <MyFeedbackList />
    </section>
  );
}
