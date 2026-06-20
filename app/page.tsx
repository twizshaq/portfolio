import { CodexUsageGrid } from "./components/CodexUsageGrid";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-start">


      {/* INTRO */}
      <div className="bg-red-600/0 w-[800px] max-w-[90vw] mt-20">
        <p className="font-semibold text-[1.7rem]">Shaquon Hamilton</p>
        <p className="max-w-[600px]">
          I’m a developer and creative builder from Barbados, focused on turning ideas into clean, useful digital experiences. I enjoy working on web apps, mobile concepts, UI design, and tech-driven projects that feel simple but meaningful.
          {/* <br /><br />
          I may not know everything, but I learn fast, stay curious, and believe that with AI and persistence, almost anything is possible. */}
        </p>
      </div>


      {/* PROJECTS */}
      <div className="bg-red-600/0 w-[800px] max-w-[90vw] mt-20">
        <p className="font-semibold text-[1.7rem]">Projects</p>
        <p className="max-w-[600px]">Bajan Stories - </p>

      </div>

      {/* CODEX USAGE */}
      <CodexUsageGrid />

      {/* CONNECT */}
      <div>

      </div>

      {/* FOOTER */}
      <div>

      </div>
    </div>
  );
}
