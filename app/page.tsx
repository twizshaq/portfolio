import { CodexUsageGrid } from "./components/CodexUsageGrid";
import { DraggableMediaLayer } from "./components/DraggableMediaLayer";
import Image from "next/image";
import pfp from "@/public/mascot.png";

export default function Home() {
  return (
    <div className="relative flex flex-col flex-1 items-center justify-start overflow-hidden">
      <DraggableMediaLayer />


      {/* INTRO */}
      <div className="bg-red-600/0 w-[800px] max-w-[90vw] mt-10">
        <Image
          src={pfp}
          height={200}
          width={200}
          alt=""
          className="ml-[-50px]"
        />
        <p className="font-semibold text-[1.7rem]">Shaquon Hamilton</p>
        <p className="max-w-[600px]">
          I’m a developer and creative builder from Barbados, focused on turning ideas into clean, useful digital experiences. I enjoy working on web apps, mobile concepts, UI design, and tech-driven projects that feel simple but meaningful.
          {/* <br /><br />
          I may not know everything, but I learn fast, stay curious, and believe that with AI and persistence, almost anything is possible. */}
        </p>
      </div>


      {/* PROJECTS */}
      <div className="bg-red-600/0 w-[800px] max-w-[90vw] mt-20">
        <p className="font-semibold text-[1.45rem]">Projects</p>
        <p className="max-w-[600px]">xxxxx xxxxxxx - See Preview</p>

      </div>

      {/* CODEX USAGE */}
      <CodexUsageGrid />

      {/* CONNECT */}
      <section className="w-[800px] max-w-[90vw] mt-20 pb-20">
        <p className="font-semibold text-[1.45rem]">Connect with Me</p>
        <p className="max-w-[600px] mt-2 text-[#a3a3a3]">
          Have an idea, project, or opportunity in mind? Send me a message and
          let&apos;s build something useful.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="mailto:shaquxn@gmail.com"
            className="rounded-full border border-[#2d2d2d] px-5 py-2 text-sm font-medium transition hover:border-[#f2f2f2] hover:bg-[#f2f2f2] hover:text-[#0b0b0b]"
          >
            Email
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <div>

      </div>
    </div>
  );
}
