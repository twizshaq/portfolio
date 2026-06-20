"use client";

import Image from "next/image";
import type { CSSProperties, PointerEvent } from "react";
import { useRef, useState } from "react";
import styles from "./FighterJetShowcase.module.css";

type FighterJetShowcaseProps = {
  normalSrc?: string;
  blueprintSrc?: string;
  alt?: string;
  className?: string;
  priority?: boolean;
};

const initialVars = {
  "--jet-rotate-x": "0deg",
  "--jet-rotate-y": "0deg",
  "--jet-translate-x": "0px",
  "--jet-translate-y": "0px",
} as CSSProperties;

export function FighterJetShowcase({
  normalSrc = "/fighterjet.png",
  blueprintSrc = "/fighterjet-sketch.png",
  alt = "Fighter jet",
  className = "",
  priority = false,
}: FighterJetShowcaseProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);

  function setJetVars({
    rotateX,
    rotateY,
    translateX,
    translateY,
  }: {
    rotateX: number;
    rotateY: number;
    translateX: number;
    translateY: number;
  }) {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    stage.style.setProperty("--jet-rotate-x", `${rotateX.toFixed(2)}deg`);
    stage.style.setProperty("--jet-rotate-y", `${rotateY.toFixed(2)}deg`);
    stage.style.setProperty("--jet-translate-x", `${translateX.toFixed(2)}px`);
    stage.style.setProperty("--jet-translate-y", `${translateY.toFixed(2)}px`);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    setJetVars({
      rotateX: y * -5,
      rotateY: x * 7,
      translateX: x * 14,
      translateY: y * 10,
    });
  }

  function handlePointerLeave() {
    setIsActive(false);
    setJetVars({
      rotateX: 0,
      rotateY: 0,
      translateX: 0,
      translateY: 0,
    });
  }

  return (
    <div
      ref={stageRef}
      className={`${styles.showcase} ${className}`}
      data-active={isActive}
      onPointerEnter={() => setIsActive(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={initialVars}
    >
      <div className={styles.grid} aria-hidden="true" />
      <div className={`${styles.marker} ${styles.markerTop}`} aria-hidden="true">
        <span>AV-01</span>
      </div>
      <div
        className={`${styles.marker} ${styles.markerBottom}`}
        aria-hidden="true"
      >
        <span>STEALTH VECTOR</span>
      </div>
      <div className={styles.scanline} aria-hidden="true" />

      <div className={styles.floatLayer}>
        <div className={styles.jetStack}>
          <Image
            className={`${styles.jetImage} ${styles.normalLayer}`}
            src={normalSrc}
            width={1123}
            height={1401}
            sizes="(min-width: 768px) 520px, 88vw"
            priority={priority}
            alt={alt}
          />
          <Image
            className={`${styles.jetImage} ${styles.blueprintLayer}`}
            src={blueprintSrc}
            width={1123}
            height={1401}
            sizes="(min-width: 768px) 520px, 88vw"
            priority={priority}
            alt=""
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
