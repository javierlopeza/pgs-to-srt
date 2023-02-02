// Copyright (C) 2023 Wyden and Gyre, LLC
import { parse } from "../lib/parse.ts";
import { iterOds, packetize, pgsSchema } from "../lib/transform.ts";
import { Image, imageToLittleEndian, render } from "../lib/render.ts";
import { pipeline } from "../lib/pipeline.ts";
import { supportsFastBuild } from "../deps/tesseract-wasm/lib.js";
import * as path from "std/path/mod.ts";

// a library for interacting with the "guts" of the pgs-to-srt process
// do not import this library directly, instead import its compiled version
// TODO: provide path

export { pathFilename, pipeline, renderInitial, supportsFastBuild };

async function* renderInitial(
  pgs: Uint8Array,
): AsyncGenerator<HTMLCanvasElement> {
  const initialParse = parse(pgs);
  const basicParsed = pgsSchema.parse(initialParse);
  const parsedSegments = basicParsed.segment;
  const groupedSegments = packetize(parsedSegments);
  const unrendereds = iterOds(groupedSegments);
  for await (const unrendered of unrendereds) {
    const rendered = render(unrendered.ods, unrendered.pds);
    yield createCanvasFromImage(rendered);
  }
}

function createCanvasFromImage(image: Image): HTMLCanvasElement {
  const imageUint8 = imageToLittleEndian(image);
  const clamped = new Uint8ClampedArray(imageUint8.buffer);
  const imageData = new ImageData(clamped, image.width, image.height);

  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function pathFilename(p: string): string {
  return path.parse(p).name;
}