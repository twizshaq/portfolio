"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";

type MediaItem = {
  id: string;
  type: "image" | "video";
  src: string;
  alt: string;
  width: number;
  height: number;
  initialOffsetX?: number;
  initialY?: number;
  rotate?: number;
  radius?: number;
  zIndex?: number;
};

type Position = {
  x: number;
  y: number;
};

type DraggableMediaLayerProps = {
  originId?: string;
};

const mediaItems: MediaItem[] = [
  {
    id: "fighter-jet",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/fighter-jet.webp",
    alt: "Fighter jet",
    width: 150,
    height: 188,
    initialOffsetX: -260,
    initialY: 120,
    rotate: 7,
    radius: 26,
    zIndex: 2,
  },
  {
    id: "codex-icon",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/codex-icon.webp",
    alt: "Codex icon",
    width: 96,
    height: 96,
    initialOffsetX: -120,
    initialY: 190,
    rotate: -5,
    radius: 20,
    zIndex: 9,
  },
  {
    id: "car-lights",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/car-lights.webp",
    alt: "Car lights",
    width: 170,
    height: 128,
    initialOffsetX: -145,
    initialY: 84,
    rotate: -8,
    radius: 18,
    zIndex: 4,
  },
  {
    id: "chill-cat",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/chill-cat.webp",
    alt: "Chill cat",
    width: 142,
    height: 178,
    initialOffsetX: -100,
    initialY: 300,
    rotate: 10,
    radius: 30,
    zIndex: 8,
  },
  {
    id: "code-sesh",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/setup.webp",
    alt: "Code session",
    width: 184,
    height: 138,
    initialOffsetX: 145,
    initialY: 64,
    rotate: -4,
    radius: 14,
    zIndex: 5,
  },
  {
    id: "ipad-pic",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/ipad-pic.webp",
    alt: "iPad picture",
    width: 152,
    height: 190,
    initialOffsetX: 290,
    initialY: 100,
    rotate: 8,
    radius: 22,
    zIndex: 1,
  },
  {
    id: "noface-selfy",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/noface-selfy.webp",
    alt: "No-face selfie",
    width: 144,
    height: 180,
    initialOffsetX: -215,
    initialY: 245,
    rotate: -12,
    radius: 24,
    zIndex: 7,
  },
  {
    id: "phone-selfy",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/phone-selfy.webp",
    alt: "Phone selfie",
    width: 136,
    height: 170,
    initialOffsetX: 5,
    initialY: 245,
    rotate: 12,
    radius: 20,
    zIndex: 6,
  },
  {
    id: "we-back",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/we-back.webp",
    alt: "We back",
    width: 180,
    height: 135,
    initialOffsetX: 150,
    initialY: 255,
    rotate: -9,
    radius: 18,
    zIndex: 9,
  },
  {
    id: "fighter-jet-gif",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/fighter-jet.gif",
    alt: "Animated fighter jet",
    width: 156,
    height: 156,
    initialOffsetX: -330,
    initialY: 235,
    rotate: -6,
    radius: 19,
    zIndex: 10,
  },
  {
    id: "heart",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/heart.webp",
    alt: "Heart",
    width: 92,
    height: 92,
    initialOffsetX: 285,
    initialY: 78,
    rotate: -10,
    radius: 999,
    zIndex: 11,
  },
  {
    id: "iceman-szn",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/iceman-szn.webp",
    alt: "Iceman season",
    width: 166,
    height: 124,
    initialOffsetX: -18,
    initialY: 72,
    rotate: 5,
    radius: 16,
    zIndex: 12,
  },
  {
    id: "sama-new-era",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/sama-new-era.webp",
    alt: "Sama new era",
    width: 244,
    height: 200,
    initialOffsetX: 310,
    initialY: 252,
    rotate: 11,
    radius: 15,
    zIndex: 13,
  },
  {
    id: "figma-icon",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/figma-icon.webp",
    alt: "Figma icon",
    width: 82,
    height: 82,
    initialOffsetX: -220,
    initialY: 56,
    rotate: 9,
    radius: 24,
    zIndex: 14,
  },
  {
    id: "aws-icon",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/aws-icon.webp",
    alt: "AWS icon",
    width: 92,
    height: 92,
    initialOffsetX: 72,
    initialY: 188,
    rotate: -7,
    radius: 0,
    zIndex: 15,
  },
  {
    id: "gemini-icon",
    type: "image",
    src: "https://shaq-portfolio-webapp.s3.us-east-1.amazonaws.com/gemini-icon.webp",
    alt: "Gemini icon",
    width: 88,
    height: 88,
    initialOffsetX: 220,
    initialY: 184,
    rotate: 6,
    radius: 0,
    zIndex: 16,
  },
];

function getInitialPositions(): Record<string, Position> {
  return {};
}

function getDefaultPosition(
  item: MediaItem,
  layer?: HTMLElement | null,
  originId = "media-playground",
  mediaScale = 1,
): Position {
  if (typeof window === "undefined") {
    return { x: 24, y: 220 };
  }

  const origin = document.getElementById(originId);
  const itemWidth = scaleDimension(item.width, mediaScale);
  const itemHeight = scaleDimension(item.height, mediaScale);

  if (origin && layer) {
    const layerRect = layer.getBoundingClientRect();
    const originRect = origin.getBoundingClientRect();
    const originCenterX = originRect.left - layerRect.left + originRect.width / 2;
    const layerHeight = getLayerHeight(layer);

    return {
      x: clamp(
        originCenterX + (item.initialOffsetX ?? 0) * mediaScale - itemWidth / 2,
        0,
        Math.max(0, layerRect.width - itemWidth),
      ),
      y: clamp(
        originRect.top - layerRect.top + (item.initialY ?? 88) * mediaScale,
        0,
        Math.max(0, layerHeight - itemHeight),
      ),
    };
  }

  return {
    x: Math.max(16, window.innerWidth - itemWidth - 28),
    y: 190,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMediaScale(layerWidth: number) {
  // Cap the desktop collage at the same scale as wider mobile viewports.
  return clamp(layerWidth / 520, 0.58, 0.82);
}

function scaleDimension(value: number, mediaScale: number) {
  return Math.round(value * mediaScale);
}

function getLayerHeight(layer: HTMLElement | null) {
  const documentHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  );

  return Math.max(
    layer?.getBoundingClientRect().height ?? 0,
    documentHeight,
    window.innerHeight,
  );
}

function getDefaultPositions(
  layer: HTMLElement | null,
  originId: string,
  mediaScale: number,
): Record<string, Position> {
  return Object.fromEntries(
    mediaItems.map((item) => [
      item.id,
      getDefaultPosition(item, layer, originId, mediaScale),
    ]),
  );
}

export function DraggableMediaLayer({
  originId = "media-playground",
}: DraggableMediaLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const frontZIndexRef = useRef(
    Math.max(...mediaItems.map((item) => item.zIndex ?? 0)),
  );
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);
  const [positions, setPositions] =
    useState<Record<string, Position>>(getInitialPositions);
  const [zIndexes, setZIndexes] = useState<Record<string, number>>({});
  const [mediaScale, setMediaScale] = useState(1);

  useEffect(() => {
    let frameId = 0;

    function centerMediaStack() {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const layer = layerRef.current;
        const layerWidth = layer?.getBoundingClientRect().width ?? window.innerWidth;
        const nextMediaScale = getMediaScale(layerWidth);

        setMediaScale(nextMediaScale);
        setPositions(getDefaultPositions(layer, originId, nextMediaScale));
      });
    }

    centerMediaStack();

    const origin = document.getElementById(originId);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(centerMediaStack);

    if (layerRef.current && observer) {
      observer.observe(layerRef.current);
    }

    if (origin && observer) {
      observer.observe(origin);
    }

    window.addEventListener("resize", centerMediaStack);

    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener("resize", centerMediaStack);
    };
  }, [originId]);

  function handlePointerDown(
    item: MediaItem,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    const layer = layerRef.current;

    if (!layer) {
      return;
    }

    const layerRect = layer.getBoundingClientRect();
    const position =
      positions[item.id] ??
      getDefaultPosition(item, layerRef.current, originId, mediaScale);
    const itemWidth = scaleDimension(item.width, mediaScale);
    const itemHeight = scaleDimension(item.height, mediaScale);

    frontZIndexRef.current += 1;
    setZIndexes((currentZIndexes) => ({
      ...currentZIndexes,
      [item.id]: frontZIndexRef.current,
    }));

    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      id: item.id,
      offsetX: event.clientX - layerRect.left - position.x,
      offsetY: event.clientY - layerRect.top - position.y,
      width: itemWidth,
      height: itemHeight,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const layer = layerRef.current;
    const drag = dragRef.current;

    if (!layer || !drag) {
      return;
    }

    const layerRect = layer.getBoundingClientRect();
    const layerHeight = getLayerHeight(layer);
    const nextPosition = {
      x: clamp(
        event.clientX - layerRect.left - drag.offsetX,
        0,
        Math.max(0, layerRect.width - drag.width),
      ),
      y: clamp(
        event.clientY - layerRect.top - drag.offsetY,
        0,
        Math.max(0, layerHeight - drag.height),
      ),
    };

    setPositions((currentPositions) => {
      return {
        ...currentPositions,
        [drag.id]: nextPosition,
      };
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  return (
    <div
      ref={layerRef}
      data-media-layer="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-visible"
    >
      {mediaItems.map((item) => {
        const position = positions[item.id];

        if (!position) {
          return null;
        }

        const itemWidth = scaleDimension(item.width, mediaScale);
        const itemHeight = scaleDimension(item.height, mediaScale);

        return (
          <button
            key={item.id}
            type="button"
            aria-label={`Move ${item.alt}`}
            className="group pointer-events-auto absolute touch-none cursor-grab border-0 bg-transparent p-0 active:cursor-grabbing"
            style={{
              height: itemHeight,
              left: position.x,
              top: position.y,
              transform: `rotate(${item.rotate ?? 0}deg)`,
              width: itemWidth,
              zIndex: zIndexes[item.id] ?? item.zIndex,
            }}
            onPointerDown={(event) => handlePointerDown(item, event)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {item.type === "image" ? (
              <Image
                src={item.src}
                alt={item.alt}
                width={itemWidth}
                height={itemHeight}
                draggable={false}
                loading="eager"
                unoptimized={item.src.endsWith(".gif")}
                className="select-none transition duration-150 group-hover:scale-[1.03]"
                style={{
                  borderRadius: item.radius ?? 24,
                }}
              />
            ) : (
              <video
                src={item.src}
                width={itemWidth}
                height={itemHeight}
                muted
                loop
                playsInline
                autoPlay
                className="select-none transition duration-150 group-hover:scale-[1.03]"
                style={{
                  borderRadius: item.radius ?? 18,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
