"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** One line of text that glides right-to-left (and back) when it is longer than its box, so a long
 * page name is never cut off on a phone. Short text stays still. */
export default function MarqueeText({ text, className }: { text: string; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    const measure = () => {
      const b = box.current, i = inner.current;
      if (b && i) setShift(Math.max(0, Math.ceil(i.scrollWidth - b.clientWidth)));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && box.current) ro.observe(box.current);
    return () => ro?.disconnect();
  }, [text]);

  return (
    <span ref={box} className={cn("admin-marquee", className)} data-run={shift > 0 ? "1" : "0"} style={{ "--shift": `${shift}px` } as React.CSSProperties} title={text}>
      <span ref={inner}>{text}</span>
    </span>
  );
}
