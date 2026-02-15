import Image from "next/image";
import Link from "next/link";
import heroImage from "@/public/images/hero-image-01.jpg";

export const metadata = {
  title: "BookFlow Template - islaAPP",
  description: "Preview the BookFlow template and launch it in islaAPP Builder.",
};

export default function BookflowTemplatePage() {
  const openBuilderHref = "/agent?template=bookflow&source=template_detail";
  const startTrialHref = "/agent?template=bookflow&source=template_detail";

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <div className="mb-8 text-center">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-indigo-300/80">
          <span data-i18n-en="islaAPP Template" data-i18n-es="Plantilla islaAPP">islaAPP Template</span>
        </p>
        <h1 className="text-3xl font-semibold text-gray-100 md:text-4xl" data-i18n-en="BookFlow Service Booking Starter" data-i18n-es="Base BookFlow para Reservas de Servicios">
          BookFlow Service Booking Starter
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-indigo-200/70" data-i18n-en="A fast-launch template for appointments, reminders, and checkout. Start with this structure, then customize pages and flows in Builder." data-i18n-es="Una plantilla de lanzamiento rapido para citas, recordatorios y pagos. Empieza con esta estructura y luego personaliza paginas y flujos en el constructor.">
          A fast-launch template for appointments, reminders, and checkout. Start
          with this structure, then customize pages and flows in Builder.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/70">
        <Image
          src={heroImage}
          alt="BookFlow template preview"
          className="h-[340px] w-full object-cover md:h-[460px]"
          priority
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a
          href={startTrialHref}
          className="btn-sm bg-indigo-600 text-center text-white hover:bg-indigo-500"
          data-i18n-en="Start With This Template"
          data-i18n-es="Comenzar con esta plantilla"
        >
          Start With This Template
        </a>
        <a
          href={openBuilderHref}
          className="btn-sm border border-gray-700 bg-gray-800 text-center text-white hover:bg-gray-700"
          data-i18n-en="Open AI Agent"
          data-i18n-es="Abrir agente IA"
        >
          Open AI Agent
        </a>
      </div>

      <div className="mt-6">
        <Link href="/templates" className="text-sm text-indigo-300 hover:text-indigo-200">
          <span data-i18n-en="Back to Template Gallery" data-i18n-es="Volver a la Galeria de Plantillas">Back to Template Gallery</span>
        </Link>
      </div>
    </section>
  );
}
