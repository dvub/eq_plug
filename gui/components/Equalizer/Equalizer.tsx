"use client";

import { Message } from "@/bindings/Message";
import { usePluginListener } from "@/hooks/usePluginListener";

import { useCallback, useRef } from "react";
import { Canvas } from "../Canvas";

import { normalizeLinear, normalizeLog } from "@/lib/utils";
import { curve } from "@/lib/curve_func";
import { RulerCanvas } from "./ruler/RulerCanvas";
import { drawSpectrum } from "./spectrum";
import { sendToPlugin } from "@/lib";

const FPS = 45;

// TODO: make configurable
// specifically tie this to real backend sample rate
export const MAX_FREQ = 20000;
export const MIN_FREQ = 20;

export const SPECTRUM_MIN_DB = -78;
export const SPECTRUM_MAX_DB = 6;

export const FREQ_RESPONSE_MIN_DB = -24;
export const FREQ_RESPONSE_MAX_DB = 24;
export const SLOPE = 4.5;

export const FREQUENCY_RESPONSE_STYLE = "rgb(229, 199, 104)";

// NOTE: we provide a margin on the right side for labels
// this way, spectrums/freq response will not cover labels
export const LABEL_MARGIN = 60;

export function Equalizer(props: {
  width?: number;
  height?: number;
  className?: string;
}) {
  const { width, height } = props;

  // TODO: refactor into one ref object
  const preSpectrum = useRef<number[]>([]);
  const postSpectrum = useRef<number[]>([]);
  const frequencyResponse = useRef<[number, number][]>([]);

  const listener = useCallback((m: Message) => {
    if (m.type !== "drawData") {
      return;
    }
    if (m.data.drawType === "spectrum") {
      const data = m.data.drawData;
      preSpectrum.current = data.dry;
      postSpectrum.current = data.wet;
    }
    if (m.data.drawType === "frequencyResponse") {
      const data = m.data.drawData;
      frequencyResponse.current = data;
    }
  }, []);
  usePluginListener(listener);

  function draw(ctx: CanvasRenderingContext2D) {
    sendToPlugin({
      type: "drawRequest",
      data: {
        requestType: "spectrum",
      },
    });

    const height = ctx.canvas.height;
    const width = ctx.canvas.width;

    const effectiveWidth = width - LABEL_MARGIN;
    ctx.clearRect(0, 0, width, height);

    // --- render dry ---

    // TODO: dont create gradient every frame
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, "rgba(25,25,25, 0.5)"); // at 0%
    gradient.addColorStop(1, "rgba(143, 143, 143, 0.5)"); // at 54%

    ctx.strokeStyle = "rgba(150,150,150,0.5)";
    ctx.fillStyle = gradient;
    drawSpectrum(
      preSpectrum.current,
      ctx,
      true,
      SPECTRUM_MAX_DB,
      SPECTRUM_MIN_DB,
      effectiveWidth,
      height
    );

    // --- render wet ---
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    drawSpectrum(
      postSpectrum.current,
      ctx,
      true,
      SPECTRUM_MAX_DB,
      SPECTRUM_MIN_DB,
      effectiveWidth,
      height
    );

    // render freq response
    ctx.strokeStyle = FREQUENCY_RESPONSE_STYLE;
    ctx.lineWidth = 2;
    const freqR = frequencyResponse.current;
    ctx.beginPath();
    const coords = [];

    // TODO: fix this -1 hack
    for (let i = 0; i < freqR.length - 1; i++) {
      const [freq, responseDb] = freqR[i];
      const x = normalizeLog(freq, MIN_FREQ, MAX_FREQ);
      const y = normalizeLinear(
        responseDb,
        FREQ_RESPONSE_MIN_DB,
        FREQ_RESPONSE_MAX_DB
      );
      const scaledX = x * effectiveWidth;
      const scaledY = (1.0 - y) * height;

      coords.push(scaledX, scaledY);
    }
    curve(ctx, coords, 0.5, 100, false);
    ctx.stroke();
  }

  return (
    <>
      <RulerCanvas className={`${props.className} absolute`} />
      <Canvas
        draw={draw}
        fps={FPS} // we should probably just leave this as a constant
        width={width}
        height={height}
        className={`${props.className} absolute`}
      />
      {/* TODO: add frequency response layer here */}
    </>
  );
}
