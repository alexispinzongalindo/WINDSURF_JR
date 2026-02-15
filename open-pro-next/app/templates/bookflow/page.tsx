import Image from "next/image";
import Link from "next/link";
import heroImage from "@/public/images/hero-image-01.jpg";

export const metadata = {
  title: "BookFlow Template - islaAPP",
  description: "Preview the BookFlow template and launch it in islaAPP Builder.",
};

export default function BookflowTemplatePage() {
  const openBuilderHref =
    "https://app.islaapp.tech/?lang=en&template=bookflow&source=template_detail";
  const startTrialHref =
    "https://app.islaapp.tech/?plan=trial&lang=en&template=bookflow&source=template_detail";

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-16">
      <div className="mb-8 text-center">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-indigo-300/80">
          islaAPP Template
        </p>
        <h1 className="text-3xl font-semibold text-gray-100 md:text-4xl">
          BookFlow Service Booking Starter
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-indigo-200/70">
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
        >
          Start Free With This Template
        </a>
        <a
          href={openBuilderHref}
          className="btn-sm border border-gray-700 bg-gray-800 text-center text-white hover:bg-gray-700"
        >
          Open Builder
        </a>
      </div>

      <div className="mt-6">
        <Link href="/templates" className="text-sm text-indigo-300 hover:text-indigo-200">
          Back to Template Gallery
        </Link>
      </div>
    </section>
  );
}
