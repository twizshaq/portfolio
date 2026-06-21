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
  rotate?: number;
};

type Position = {
  x: number;
  y: number;
};

const storageKey = "portfolio-draggable-media";

const mediaItems: MediaItem[] = [
  {
    id: "codex-icon",
    type: "image",
    src: "/codex-icon.png",
    alt: "Codex icon",
    width: 96,
    height: 96,
    rotate: -5,
  },
];

function getInitialPositions(): Record<string, Position> {
  return Object.fromEntries(
    mediaItems.map((item) => [item.id, { x: 24, y: 220 }]),
  );
}

function getDefaultPosition(item: MediaItem): Position {
  if (typeof window === "undefined") {
    return { x: 24, y: 220 };
  }

  return {
    x: Math.max(16, window.innerWidth - item.width - 28),
    y: 190,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function DraggableMediaLayer() {
  const layerRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<Record<string, Position>>(getInitialPositions());
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);
  const [positions, setPositions] =
    useState<Record<string, Position>>(getInitialPositions);

  useEffect(() => {
    const savedPositions = window.localStorage.getItem(storageKey);
    const defaultPositions = Object.fromEntries(
      mediaItems.map((item) => [item.id, getDefaultPosition(item)]),
    );

    if (!savedPositions) {
      positionsRef.current = defaultPositions;
      setPositions(defaultPositions);
      return;
    }

    try {
      const nextPositions = {
        ...defaultPositions,
        ...(JSON.parse(savedPositions) as Record<string, Position>),
      };

      positionsRef.current = nextPositions;
      setPositions(nextPositions);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  function savePositions(nextPositions: Record<string, Position>) {
    window.localStorage.setItem(storageKey, JSON.stringify(nextPositions));
  }

  function handlePointerDown(
    item: MediaItem,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    const layer = layerRef.current;

    if (!layer) {
      return;
    }

    const layerRect = layer.getBoundingClientRect();
    const position = positions[item.id] ?? getDefaultPosition(item);

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: item.id,
      offsetX: event.clientX - layerRect.left - position.x,
      offsetY: event.clientY - layerRect.top - position.y,
      width: item.width,
      height: item.height,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const layer = layerRef.current;
    const drag = dragRef.current;

    if (!layer || !drag) {
      return;
    }

    const layerRect = layer.getBoundingClientRect();
    const nextPosition = {
      x: clamp(
        event.clientX - layerRect.left - drag.offsetX,
        0,
        Math.max(0, layerRect.width - drag.width),
      ),
      y: clamp(
        event.clientY - layerRect.top - drag.offsetY,
        0,
        Math.max(0, layerRect.height - drag.height),
      ),
    };

    setPositions((currentPositions) => {
      const nextPositions = {
        ...currentPositions,
        [drag.id]: nextPosition,
      };

      positionsRef.current = nextPositions;
      return nextPositions;
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
    savePositions(positionsRef.current);
  }

  return (
    <div
      ref={layerRef}
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      {mediaItems.map((item) => {
        const position = positions[item.id] ?? getDefaultPosition(item);

        return (
          <button
            key={item.id}
            type="button"
            aria-label={`Move ${item.alt}`}
            className="group pointer-events-auto absolute touch-none cursor-grab border-0 bg-transparent p-0 active:cursor-grabbing"
            style={{
              height: item.height,
              left: position.x,
              top: position.y,
              transform: `rotate(${item.rotate ?? 0}deg)`,
              width: item.width,
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
                width={item.width}
                height={item.height}
                draggable={false}
                className="select-none rounded-[18px] shadow-[0_18px_45px_rgba(0,0,0,0.28)] transition duration-150 group-hover:scale-[1.03]"
              />
            ) : (
              <video
                src={item.src}
                width={item.width}
                height={item.height}
                muted
                loop
                playsInline
                autoPlay
                className="select-none rounded-[18px] shadow-[0_18px_45px_rgba(0,0,0,0.28)] transition duration-150 group-hover:scale-[1.03]"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
