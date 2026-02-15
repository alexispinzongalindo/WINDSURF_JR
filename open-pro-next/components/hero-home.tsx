import VideoThumb from "@/public/images/hero-image-01.jpg";
import ModalVideo from "@/components/modal-video";

export default function HeroHome() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero content */}
        <div className="py-12 md:py-20">
          {/* Section header */}
          <div className="pb-12 text-center md:pb-20">
            <h1
              className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,var(--color-gray-200),var(--color-indigo-200),var(--color-gray-50),var(--color-indigo-300),var(--color-gray-200))] bg-[length:200%_auto] bg-clip-text pb-5 font-nacelle text-4xl font-semibold text-transparent md:text-5xl"
              data-aos="fade-up"
              data-i18n-en="Launch your islaAPP in 3 clicks"
              data-i18n-es="Lanza tu islaAPP en 3 clics"
            >
              Launch your islaAPP in 3 clicks
            </h1>
            <div className="mx-auto max-w-3xl">
              <p
                className="mb-8 text-xl text-indigo-200/65"
                data-aos="fade-up"
                data-aos-delay={200}
                data-i18n-en="Start with a template, verify once, and publish a real client-ready app with bookings, payments, and domain setup."
                data-i18n-es="Comienza con una plantilla, verifica una vez y publica una app real para clientes con reservas, pagos y dominio."
              >
                Start with a template, verify once, and publish a real
                client-ready app with bookings, payments, and domain setup.
              </p>
              <div className="mx-auto max-w-xs sm:flex sm:max-w-none sm:justify-center">
                <div data-aos="fade-up" data-aos-delay={400}>
                  <a
                    className="btn group mb-4 w-full bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%] sm:mb-0 sm:w-auto"
                    href="https://app.islaapp.tech/?plan=trial&lang=en"
                    data-i18n-en="Start free trial"
                    data-i18n-es="Iniciar prueba gratis"
                  >
                    <span className="relative inline-flex items-center">
                      Start free trial
                      <span className="ml-1 tracking-normal text-white/50 transition-transform group-hover:translate-x-0.5">
                        -&gt;
                      </span>
                    </span>
                  </a>
                </div>
                <div data-aos="fade-up" data-aos-delay={600}>
                  <a
                    className="btn w-full border border-gray-700 bg-gray-800 text-white hover:bg-gray-700 sm:ml-4 sm:w-auto"
                    href="/templates"
                    data-i18n-en="Pick template"
                    data-i18n-es="Elegir plantilla"
                  >
                    Pick template
                  </a>
                </div>
              </div>
            </div>
          </div>

          <ModalVideo
            thumb={VideoThumb}
            thumbWidth={1104}
            thumbHeight={576}
            thumbAlt="Modal video thumbnail"
            video="videos//video.mp4"
            videoWidth={1920}
            videoHeight={1080}
          />
        </div>
      </div>
    </section>
  );
}
