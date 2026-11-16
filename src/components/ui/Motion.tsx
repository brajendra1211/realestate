"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useReducedMotion,
  type HTMLMotionProps,
} from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

// Content is always rendered visible on the server and on first paint, so a slow or
// failed hydration can never leave a page blank. Only blocks that start below the
// fold are "armed" (hidden) after mount and then animate in when scrolled to.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function useArmed(ref: React.RefObject<HTMLElement | null>, disabled: boolean) {
  const [armed, setArmed] = useState(false);
  useIsoLayoutEffect(() => {
    if (disabled || !ref.current) return;
    if (ref.current.getBoundingClientRect().top > window.innerHeight) setArmed(true);
  }, [ref, disabled]);
  return armed;
}

/** Fade + rise when scrolled into view. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement | null>(null);
  const armed = useArmed(ref, reduce);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const Comp = motion[as] as React.ElementType;
  const hidden = armed && !inView;
  return (
    <Comp
      ref={ref}
      className={className}
      initial={false}
      animate={
        hidden
          ? { opacity: 0, y, transition: { duration: 0 } }
          : { opacity: 1, y: 0, transition: { duration: 0.7, delay, ease: EASE } }
      }
    >
      {children}
    </Comp>
  );
}

/** Parent that staggers its <StaggerItem/> children. */
export function Stagger({
  children,
  className,
  gap = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
}) {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement | null>(null);
  const armed = useArmed(ref, reduce);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={armed && !inView ? "hidden" : "show"}
      variants={{
        hidden: { transition: { duration: 0 } },
        show: { transition: { staggerChildren: gap } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 28, scale: 0.98, transition: { duration: 0 } },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Lifts on hover, presses on tap. */
export function HoverLift({
  children,
  className,
  lift = 6,
  ...rest
}: { lift?: number } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -lift }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Animated number that counts up when visible. */
export function CountUp({
  to,
  suffix = "",
  prefix = "",
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 20 });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (inView) mv.set(to);
  }, [inView, to, mv]);

  useEffect(() => spring.on("change", (v) => setVal(Math.round(v))), [spring]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {val.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

/** Slow ambient floating wrapper for decorative blobs / badges. */
export function Float({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}
