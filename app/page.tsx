import { CodexUsageGrid } from "./components/CodexUsageGrid";
import { ContactModal } from "./components/ContactModal";
// import { DraggableMediaLayer } from "./components/DraggableMediaLayer";
// import { StJosephDeoModal } from "./components/projects/st-joseph-deo";
import { TasteBarbadosModal } from "./components/projects/taste-barbados";
// import Image from "next/image";
// import pfp from "@/public/mascot.png";

export default function Home() {
  return (
    <div data-ascii-content className="relative flex flex-col flex-1 items-center justify-start overflow-x-hidden">
      {/* <DraggableMediaLayer /> */}


      {/* INTRO */}
      <div className="bg-red-600/0 w-[800px] max-w-[90vw] mt-10">
        {/* <Image
          src={pfp}
          height={200}
          width={200}
          alt=""
          className="ml-[-50px]"
        /> */}
        <p className="font-semibold text-[1.7rem]">Shaquon Hamilton</p>
        <p className="max-w-[600px]">
          I’m a developer and creative builder from Barbados, turning ideas into simple, useful web and mobile experiences.
          {/* <br /><br />
          I may not know everything, but I learn fast, stay curious, and believe that with AI and persistence, almost anything is possible. */}
        </p>
      </div>


      {/* PROJECTS */}
      <div className="bg-red-600/0 w-[800px] max-w-[90vw] mt-20">
        <p className="font-semibold text-[1.45rem]">Projects</p>
        {/* <StJosephDeoModal /> */}
        <TasteBarbadosModal />

      </div>

      {/* CODEX USAGE */}
      <CodexUsageGrid />

      {/* CONNECT */}
      <section className="w-[800px] max-w-[90vw] mt-20 pb-12">
        <p className="font-semibold text-[1.45rem]">Connect with Me</p>
        <p className="max-w-[600px] mt-2 text-muted">
          Have an idea, project, or opportunity in mind? Send me a message and
          let&apos;s build something useful.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <ContactModal />
        </div>
      </section>

      {/* MEDIA (hidden)
      <section
        id="media-playground"
        className="w-[800px] max-w-[90vw] min-h-[520px] pt-8 pb-20"
      >
        <p className="font-semibold text-[1.45rem]">Media</p>
        <p className="max-w-[600px] mt-2 text-muted">
          Images and videos start here, then you can move them anywhere on the
          page.
        </p>
      </section>
      */}

      {/* FOOTER */}
      <div>

      </div>
    </div>
  );
}
