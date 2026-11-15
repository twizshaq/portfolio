import Image from "next/image";
import { DraggableMediaLayer } from "./components/DraggableMediaLayer";
import { TokenUsageGrid } from "./components/TokenUsageGrid";

// Share the URL and icon between the intro and the project entry.
const tasteBarbados = {
  href: "https://tastebarbados.app",
  icon: "/projects/taste-barbados-icon.png",
};

export default function Home() {
  return (
    <div id="top" className="portfolio-shell">
      {/* A small, familiar navigation keeps the introduction at the centre. */}
      <header className="site-header">
        <div className="site-header-inner">
          <a className="home-mark" href="#top" aria-label="Shaquon Hamilton, home">
            {/* Uneven, rounded rays give the burst its hand-drawn shape. */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="home-mark-pink" gradientUnits="userSpaceOnUse" x1="3" y1="28" x2="29" y2="4">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--accent-soft)" />
                </linearGradient>
              </defs>
              <path
                stroke="url(#home-mark-pink) currentColor"
                strokeWidth="3.6"
                strokeLinecap="round"
                d="M15.8 16Q14.9 9 12.9 3.5
                   M15.8 16Q18.1 10.2 22 5.7
                   M15.8 16Q22.4 12.9 28.1 12.6
                   M15.8 16Q23.8 17.2 28.9 21
                   M15.8 16Q20.1 21.6 21.2 28
                   M15.8 16Q15.7 23.4 13.5 28.5
                   M15.8 16Q10.6 22.3 5.6 24
                   M15.8 16Q9.8 16.4 3.1 14.4
                   M15.8 16Q10.8 11.8 7.7 7"
              />
            </svg>
          </a>
          <nav aria-label="Main navigation">
            <a href="#activity">Activity</a>
            <a href="mailto:shaquxn@gmail.com">Say hello</a>
          </nav>
        </div>
      </header>

      <main className="portfolio-main">
        <section className="intro" aria-labelledby="intro-title">
          <h1 id="intro-title">Shaquon Hamilton</h1>
          <div className="intro-copy">
            <p>
              I’m a developer and creative builder from{" "}
              <span className="island-name">
                <span aria-hidden="true">🇧🇧</span>{" "}<span className="island-note">Barbados</span>
              </span>, making things for the web and mobile.
            </p>
            <p>I like taking an idea, pulling it apart, and figuring out how to make it <em>simple, useful, and a little more human.</em></p>
            <p>
              currently building{" "}
              <a href={tasteBarbados.href} target="_blank" rel="noreferrer" className="taste-link">
                <Image src={tasteBarbados.icon} alt="" width={23} height={23} />
                <span className="taste-link-text">Taste Barbados</span>
              </a>
            </p>
          </div>
        </section>

        <section className="projects" aria-labelledby="projects-title">
          <h2 id="projects-title">Projects</h2>
          {/* Link directly to the project so the entry needs no modal state. */}
          <a
            className="project-entry"
            href={tasteBarbados.href}
            target="_blank"
            rel="noreferrer"
            aria-labelledby="taste-barbados-title"
            aria-describedby="taste-barbados-description"
          >
            <Image src={tasteBarbados.icon} alt="" width={40} height={40} />
            <div>
              <h3 id="taste-barbados-title">Taste Barbados</h3>
              <p id="taste-barbados-description">
                Find local cafés, rum shops, food trucks, and restaurants across Barbados.
              </p>
            </div>
          </a>
        </section>

        <div id="activity" className="activity-wrap">
          <TokenUsageGrid />
        </div>

        {/* Reserve space for the collage while its images can still move around the page. */}
        <section
          id="media-playground"
          className="mt-5 min-h-[clamp(330px,65vw,420px)]"
          aria-label="Draggable images"
        >
          <DraggableMediaLayer />
        </section>
      </main>
    </div>
  );
}
