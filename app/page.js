import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-blue-100 text-[#1E2A3B]">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-8 py-28">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DCE6F7]">
              <span className="text-lg font-semibold text-[#7FAAF5]">C</span>
            </div>
            <span className="text-lg font-medium tracking-wide">
              CoCreate
            </span>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-[#5C6B82] md:flex">
            <a href="#" className="transition hover:text-[#1E2A3B]">Projects</a>
            <a href="#" className="transition hover:text-[#1E2A3B]">Creators</a>
            <a href="#" className="transition hover:text-[#1E2A3B]">Funders</a>
          </nav>
        </header>

        {/* Hero */}
        <section className="mt-32 flex max-w-4xl flex-col gap-8">
          <h1 className="font-serif text-5xl leading-tight tracking-tight">
            A calmer way to fund <br /> and build ideas together.
          </h1>

          <p className="max-w-2xl text-lg leading-8 text-[#5C6B82]">
            CoCreate is where creators, funders, and collaborators come together
            to support meaningful projects — with capital, skills, and trust.
          </p>

          {/* CTAs */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <a
              href="/onboarding"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#7FAAF5] px-8 text-sm font-medium tracking-wide text-white transition hover:bg-[#6C9AE8]"
            >
              Login to CoCreate
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="mt-40 grid grid-cols-1 gap-10 md:grid-cols-3">
          {[
            {
              title: "Verified participation",
              desc: "Transparent profiles and credibility-first project verification.",
            },
            {
              title: "Beyond capital",
              desc: "Support projects with skills, mentorship, and collaboration.",
            },
            {
              title: "Aligned incentives",
              desc: "Fund and build with people who share your long-term vision.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-[#E1EAF8] p-8"
            >
              <h3 className="font-serif text-xl">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#5C6B82]">
                {item.desc}
              </p>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="mt-32 flex items-center justify-between border-t border-[#E1EAF8] pt-8 text-sm text-[#7A8CA5]">
          <span>© {new Date().getFullYear()} CoCreate</span>
          <span>Designed for thoughtful collaboration</span>
        </footer>

      </main>
    </div>
  );
}
