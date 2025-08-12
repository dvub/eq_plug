import { Spectrum } from "@/components/Spectrum";

export default function Home() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      <Spectrum fps={60} antiAliasing={true} className="w-full h-full" />
    </div>
  );
}
