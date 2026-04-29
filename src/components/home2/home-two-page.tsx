"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/home-2", label: "Home 2" },
  { href: "#motion-story", label: "Story" },
  { href: "#proof-system", label: "Proof" },
  { href: "#workflow", label: "Workflow" }
];

const heroStats = [
  { label: "Review-first AI", value: "100%" },
  { label: "Case context", value: "Live" },
  { label: "Lawyer handoff", value: "Ready" }
];

const storyFrames = [
  {
    eyebrow: "Scene 01",
    title: "A client tells the story in plain language.",
    body: "Mizan receives the messy version first: names, rent, WhatsApp reminders, dates, files, uncertainty, and emotion."
  },
  {
    eyebrow: "Scene 02",
    title: "Evidence becomes a moving case map.",
    body: "Documents, timelines, deadlines, amounts, parties, contradictions, and missing proof separate into reviewable lanes."
  },
  {
    eyebrow: "Scene 03",
    title: "The agent proposes. The user decides.",
    body: "Every sensitive action stays behind approval. Add a deadline, create a case, draft a notice, or reject the suggestion."
  },
  {
    eyebrow: "Scene 04",
    title: "The lawyer receives the matter, not the mess.",
    body: "A prepared brief, timeline, evidence bundle, risk view, and open questions arrive as one clean handoff."
  }
];

const processCards = [
  {
    title: "Evidence Intake",
    text: "Classify uploads, extract facts, detect missing proof, and attach documents to timeline moments.",
    image: "/images/home-2/document-review.jpg"
  },
  {
    title: "Case Roadmap",
    text: "Turn facts into next actions, deadlines, lawyer review points, and case readiness signals.",
    image: "/images/home-2/city-glass.jpg"
  },
  {
    title: "Approval Queue",
    text: "Keep AI powerful but controlled. Nothing writes to the workspace until the user approves it.",
    image: "/images/home-2/law-books.jpg"
  },
  {
    title: "Lawyer Handoff",
    text: "Package the matter with a clean summary, evidence bundle, weak points, and questions for counsel.",
    image: "/images/home-2/legal-meeting.jpg"
  }
];

const portalCards = [
  {
    label: "Clients",
    title: "Clarity without legal intimidation.",
    text: "Understand what happened, what matters, what is missing, and what needs approval.",
    image: "/images/home-2/hero-legal-office.jpg"
  },
  {
    label: "Lawyers",
    title: "Prepared matters, fewer repeated calls.",
    text: "Receive structured files, timelines, notes, and documents before the first serious conversation.",
    image: "/images/home-2/court-columns.jpg"
  },
  {
    label: "Teams",
    title: "A workspace that protects trust.",
    text: "Review queues, audit-friendly actions, strict case boundaries, and graceful document handling.",
    image: "/images/home-2/document-review.jpg"
  }
];

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  return prefersReducedMotion;
}

function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "home2-reveal w-fit rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black/60 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl",
        className
      )}
    >
      {children}
    </p>
  );
}

function SplitHeadline({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <h1 className={cn("text-balance font-black leading-[0.82] tracking-[-0.01em]", className)}>
      {lines.map((line) => (
        <span key={line} className="home2-title-line block overflow-hidden pb-2">
          <span className="home2-title-line-inner block whitespace-nowrap will-change-transform">{line}</span>
        </span>
      ))}
    </h1>
  );
}

function ImageLayer({
  src,
  alt,
  className,
  priority = false
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("home2-image-panel relative overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, 50vw"
        className="home2-parallax-image object-cover will-change-transform"
      />
    </div>
  );
}

export function HomeTwoPage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    let cancelled = false;
    let cleanupAnimations = () => {};
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const startAnimations = async () => {
      const root = rootRef.current;
      if (!root) return;

      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger")
      ]);

      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();

      mm.add(
        {
          all: "(min-width: 0px)",
          isDesktop: "(min-width: 1024px)",
          canHover: "(hover: hover) and (pointer: fine)",
          reduceMotion: "(prefers-reduced-motion: reduce)"
        },
        (context) => {
          const reduceMotion = Boolean(context.conditions?.reduceMotion || shouldReduceMotion);
          const isDesktop = Boolean(context.conditions?.isDesktop);
          const canHover = Boolean(context.conditions?.canHover);

          if (reduceMotion) {
            gsap.set(
              ".home2-title-line-inner, .home2-reveal, .home2-word-inner, .home2-story-frame, .home2-process-card, .home2-portal-card",
              { autoAlpha: 1, clearProps: "transform,clipPath" }
            );
            return;
          }

          const cursor = root.querySelector<HTMLElement>(".home2-cursor");
          if (cursor && isDesktop && canHover) {
            const xTo = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3" });
            const yTo = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3" });
            const moveCursor = (event: PointerEvent) => {
              xTo(event.clientX - 14);
              yTo(event.clientY - 14);
            };

            window.addEventListener("pointermove", moveCursor, { passive: true });
            context.add(() => window.removeEventListener("pointermove", moveCursor));
          }

          gsap.set(".home2-word-inner", { yPercent: 112, rotateX: -10 });
          gsap.set(".home2-story-frame", { y: 70, autoAlpha: 0, scale: 0.96 });

          gsap
            .timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: ".home2-hero",
                start: "top top",
                end: "bottom top",
                scrub: 1
              }
            })
            .to(".home2-hero-image .home2-parallax-image", { scale: 1.18, yPercent: 8 }, 0)
            .to(".home2-hero-copy", { y: -96, autoAlpha: 0.56 }, 0)
            .to(".home2-float-a", { y: -118, x: 42, rotate: 5 }, 0)
            .to(".home2-float-b", { y: 98, x: -48, rotate: -6 }, 0)
            .to(".home2-stat-strip", { y: 72, scale: 0.94 }, 0);

          gsap.utils.toArray<HTMLElement>(".home2-image-panel").forEach((panel) => {
            const image = panel.querySelector(".home2-parallax-image");
            if (!image) return;

            gsap.fromTo(
              image,
              { yPercent: -8, scale: 1.08 },
              {
                yPercent: 8,
                scale: 1.16,
                ease: "none",
                scrollTrigger: {
                  trigger: panel,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1
                }
              }
            );
          });

          const revealTargets = gsap.utils
            .toArray<HTMLElement>(".home2-reveal, .home2-process-card, .home2-portal-card")
            .filter((item) => !item.closest(".home2-hero"));

          gsap.set(revealTargets, {
            y: 46,
            autoAlpha: 0
          });

          ScrollTrigger.batch(revealTargets, {
            start: "top 84%",
            once: true,
            onEnter: (batch) => {
              gsap.to(batch, {
                y: 0,
                autoAlpha: 1,
                duration: 0.82,
                ease: "power3.out",
                stagger: 0.07,
                overwrite: true
              });
            }
          });

          gsap.utils.toArray<HTMLElement>(".home2-word").forEach((word) => {
            const inner = word.querySelector(".home2-word-inner");
            gsap.to(inner, {
              yPercent: 0,
              rotateX: 0,
              duration: 1,
              ease: "power4.out",
              scrollTrigger: {
                trigger: word,
                start: "top 82%",
                toggleActions: "play none none reverse"
              }
            });
          });

          const magneticCards = isDesktop && canHover ? gsap.utils.toArray<HTMLElement>(".home2-magnetic") : [];
          magneticCards.forEach((card) => {
            const image = card.querySelector(".home2-parallax-image");
            const overlay = card.querySelector<HTMLElement>(".home2-card-light");
            const xTo = gsap.quickTo(card, "x", { duration: 0.28, ease: "power3.out" });
            const yTo = gsap.quickTo(card, "y", { duration: 0.28, ease: "power3.out" });
            const rotateXTo = gsap.quickTo(card, "rotateX", { duration: 0.28, ease: "power3.out" });
            const rotateYTo = gsap.quickTo(card, "rotateY", { duration: 0.28, ease: "power3.out" });
            let rect: DOMRect | null = null;
            let frame = 0;
            let latestEvent: MouseEvent | null = null;

            const enter = () => {
              rect = card.getBoundingClientRect();
              gsap.to(card, { scale: 1.018, duration: 0.24, ease: "power3.out", overwrite: true });
              if (image) gsap.to(image, { scale: 1.14, duration: 0.5, ease: "power3.out", overwrite: true });
            };

            const flushMove = () => {
              frame = 0;
              if (!rect || !latestEvent) return;

              const x = (latestEvent.clientX - rect.left) / rect.width - 0.5;
              const y = (latestEvent.clientY - rect.top) / rect.height - 0.5;
              xTo(x * 14);
              yTo(y * 10);
              rotateXTo(-y * 5);
              rotateYTo(x * 6);

              if (overlay) {
                overlay.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
                overlay.style.setProperty("--my", `${(y + 0.5) * 100}%`);
                gsap.to(overlay, { autoAlpha: 1, duration: 0.22, overwrite: true });
              }
            };

            const move = (event: MouseEvent) => {
              latestEvent = event;
              if (!frame) {
                frame = window.requestAnimationFrame(flushMove);
              }
            };

            const leave = () => {
              rect = null;
              latestEvent = null;
              if (frame) {
                window.cancelAnimationFrame(frame);
                frame = 0;
              }
              xTo(0);
              yTo(0);
              rotateXTo(0);
              rotateYTo(0);
              gsap.to(card, {
                scale: 1,
                duration: 0.42,
                ease: "power3.out",
                overwrite: true
              });
              if (image) gsap.to(image, { scale: 1.08, duration: 0.42, ease: "power3.out", overwrite: true });
              if (overlay) gsap.to(overlay, { autoAlpha: 0, duration: 0.22, overwrite: true });
            };

            card.addEventListener("mouseenter", enter);
            card.addEventListener("mousemove", move);
            card.addEventListener("mouseleave", leave);
            context.add(() => {
              card.removeEventListener("mouseenter", enter);
              card.removeEventListener("mousemove", move);
              card.removeEventListener("mouseleave", leave);
              if (frame) {
                window.cancelAnimationFrame(frame);
              }
            });
          });

          if (isDesktop) {
            const frames = gsap.utils.toArray<HTMLElement>(".home2-story-frame");
            gsap.set(frames[0], { y: 0, autoAlpha: 1, scale: 1 });

            const storyTimeline = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: ".home2-story",
                start: "top top",
                end: "+=3400",
                scrub: 1.05,
                pin: true
              }
            });

            storyTimeline
              .to(".home2-story-photo-main", { scale: 1.22, yPercent: -7 }, 0)
              .to(".home2-story-photo-side", { y: -160, rotate: -5 }, 0)
              .to(".home2-story-meter", { scaleY: 1, transformOrigin: "top center" }, 0);

            frames.forEach((frame, index) => {
              if (index === 0) return;
              storyTimeline
                .to(frames[index - 1], { y: -64, autoAlpha: 0, scale: 0.96, duration: 0.2 }, index * 0.25)
                .to(frame, { y: 0, autoAlpha: 1, scale: 1, duration: 0.2 }, index * 0.25);
            });

            const horizontalTween = gsap.to(".home2-process-track", {
              x: () => {
                const track = root.querySelector<HTMLElement>(".home2-process-track");
                const section = root.querySelector<HTMLElement>(".home2-process-section");
                if (!track || !section) return 0;
                return -(track.scrollWidth - section.clientWidth + 64);
              },
              ease: "none",
              scrollTrigger: {
                trigger: ".home2-process-section",
                start: "top top",
                end: "+=2400",
                scrub: 1,
                pin: true,
                invalidateOnRefresh: true
              }
            });

            gsap.utils.toArray<HTMLElement>(".home2-process-card").forEach((card) => {
              gsap.fromTo(
                card,
                { scale: 0.88, y: 74, autoAlpha: 0.45 },
                {
                  scale: 1,
                  y: 0,
                  autoAlpha: 1,
                  ease: "power2.out",
                  scrollTrigger: {
                    trigger: card,
                    containerAnimation: horizontalTween,
                    start: "left 82%",
                    end: "right 28%",
                    scrub: 0.6
                  }
                }
              );
            });

            gsap
              .timeline({
                defaults: { ease: "none" },
                scrollTrigger: {
                  trigger: ".home2-proof",
                  start: "top top",
                  end: "+=1700",
                  scrub: 1,
                  pin: true
                }
              })
              .to(".home2-proof-image-a", { xPercent: -12, yPercent: -10, rotate: -4, scale: 1.08 }, 0)
              .to(".home2-proof-image-b", { xPercent: 16, yPercent: 12, rotate: 5, scale: 1.1 }, 0)
              .to(".home2-proof-copy", { y: -64 }, 0);
          }

          window.requestAnimationFrame(() => ScrollTrigger.refresh());
        }
      );

      cleanupAnimations = () => mm.revert();
    };

    const browserWindow = window as typeof window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (browserWindow.requestIdleCallback) {
      idleHandle = browserWindow.requestIdleCallback(() => {
        void startAnimations();
      }, { timeout: 1000 });
    } else {
      timeoutHandle = window.setTimeout(() => {
        void startAnimations();
      }, 350);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== null) {
        browserWindow.cancelIdleCallback?.(idleHandle);
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
      cleanupAnimations();
    };
  }, [shouldReduceMotion]);

  return (
    <div
      ref={rootRef}
      className="home2-page min-h-screen overflow-x-hidden bg-[#f7f4ef] text-[#111111] selection:bg-black selection:text-white"
    >
      <div className="home2-cursor pointer-events-none fixed left-0 top-0 z-[90] hidden h-7 w-7 rounded-full bg-white/80 mix-blend-difference shadow-[0_0_30px_rgba(255,255,255,0.45)] will-change-transform lg:block" />

      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
        <GlassSurface
          className="home2-navbar-surface mx-auto w-full max-w-7xl rounded-[1.4rem] border border-white/65 bg-white/82 shadow-[0_20px_70px_rgba(16,24,40,0.12)] backdrop-blur-2xl"
          width="100%"
          height="auto"
          borderRadius={22}
          borderWidth={0.1}
          brightness={52}
          opacity={0.9}
          blur={12}
          displace={0.32}
          backgroundOpacity={0.18}
          saturation={1.18}
          distortionScale={-170}
          mixBlendMode="screen"
        >
          <div className="flex min-h-16 w-full items-center gap-3 px-3 sm:px-5">
            <Link href="/" className="rounded-full bg-black px-5 py-2 text-sm font-black uppercase tracking-[0.18em] text-white">
              Mizan
            </Link>
            <nav className="ml-auto hidden min-w-0 items-center gap-1 lg:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-black text-black/58 transition hover:bg-black hover:text-white",
                    item.href === "/home-2" && "bg-black text-white"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2 lg:ml-2">
              <Button asChild variant="ghost" className="hidden h-10 rounded-full px-4 text-sm font-black sm:inline-flex">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild className="h-10 rounded-full bg-black px-5 text-sm font-black text-white hover:bg-black/86">
                <Link href="/signup">Start</Link>
              </Button>
            </div>
          </div>
        </GlassSurface>
      </header>

      <main>
        <section className="home2-hero relative isolate flex min-h-[100svh] items-center overflow-hidden px-4 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-28 lg:px-8">
          <div className="absolute inset-0 bg-[#f7f4ef]" />
          <div className="home2-hero-image absolute inset-3 overflow-hidden rounded-[2.1rem] sm:inset-5">
            <Image
              src="/images/home-2/hero-legal-office.jpg"
              alt="Cinematic judge gavel on a dark desk"
              fill
              priority
              sizes="100vw"
              className="home2-parallax-image object-cover will-change-transform"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.76),rgba(0,0,0,0.38)_42%,rgba(0,0,0,0.1)_76%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_30%,rgba(255,255,255,0.28),transparent_28%)]" />
          </div>

          <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div className="home2-hero-copy flex min-w-0 flex-col gap-5 pb-4 pt-4 text-white sm:gap-6 lg:pb-8 lg:pt-10">
              <Kicker className="border-white/18 bg-white/14 text-white/82 shadow-none">Image-led legal intelligence</Kicker>
              <SplitHeadline
                lines={["Legal work", "that feels", "alive."]}
                className="text-[clamp(3.55rem,16.5vw,8rem)] lg:text-[clamp(5.4rem,9.2vw,10.2rem)]"
              />
              <p className="home2-reveal max-w-2xl text-pretty text-lg font-medium leading-8 text-white/78 sm:text-xl">
                A cinematic AI legal workspace where facts, evidence, approvals, and lawyer handoffs move with intent.
              </p>
              <div className="home2-hero-actions flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-11 rounded-full bg-white px-6 text-base font-black text-black hover:bg-white/88 sm:h-12">
                  <Link href="/signup">Enter Workspace</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-full border-white/28 bg-white/10 px-6 text-base font-black text-white backdrop-blur-xl hover:bg-white hover:text-black sm:h-12"
                >
                  <Link href="#motion-story">See the Motion</Link>
                </Button>
              </div>
            </div>

            <div className="relative hidden min-h-[520px] lg:block">
              <ImageLayer
                src="/images/home-2/court-columns.jpg"
                alt="Scales of justice with legal books"
                className="home2-float-image home2-float-a absolute right-8 top-8 h-56 w-72 rounded-[1.7rem] border border-white/35 shadow-[0_35px_90px_rgba(0,0,0,0.34)]"
              />
              <ImageLayer
                src="/images/home-2/document-review.jpg"
                alt="Legal document being reviewed"
                className="home2-float-image home2-float-b absolute bottom-28 left-0 h-64 w-80 rounded-[1.7rem] border border-white/35 shadow-[0_35px_90px_rgba(0,0,0,0.34)]"
              />
              <div className="home2-stat-strip absolute bottom-8 right-0 grid w-[30rem] grid-cols-3 overflow-hidden rounded-[1.6rem] border border-white/28 bg-white/14 text-white shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="border-r border-white/18 p-5 last:border-r-0">
                    <p className="text-2xl font-black">{stat.value}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-white/58">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Kicker>Designed like a film sequence</Kicker>
            <div className="mt-8 grid gap-2 text-[clamp(3.4rem,10vw,10rem)] font-black leading-[0.84] tracking-[-0.02em]">
              {["No clutter.", "No guesswork.", "Just flow."].map((line) => (
                <div key={line} className="home2-word overflow-hidden pb-2">
                  <span className="home2-word-inner block will-change-transform">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="motion-story" className="home2-story relative flex min-h-screen items-center overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="relative min-h-[430px] lg:min-h-[660px]">
              <ImageLayer
                src="/images/home-2/legal-meeting.jpg"
                alt="Legal team reviewing a matter"
                className="home2-story-photo-main absolute inset-0 rounded-[2.6rem] shadow-[0_44px_140px_rgba(16,24,40,0.18)]"
              />
              <ImageLayer
                src="/images/home-2/law-books.jpg"
                alt="Legal books and case material"
                className="home2-story-photo-side absolute -bottom-8 -right-4 h-64 w-[76%] rounded-[2rem] border-[10px] border-[#f7f4ef] shadow-[0_30px_90px_rgba(16,24,40,0.22)] sm:w-[58%]"
              />
            </div>

            <div className="relative min-h-[520px]">
              <div className="absolute bottom-0 left-0 top-0 w-px bg-black/12">
                <div className="home2-story-meter h-full w-px origin-top scale-y-0 bg-black" />
              </div>
              {storyFrames.map((frame, index) => (
                <article
                  key={frame.title}
                  className="home2-story-frame relative flex flex-col justify-center gap-5 border-l border-black/10 py-8 pl-6 lg:absolute lg:inset-0 lg:border-l-0 lg:py-0 lg:pl-10"
                >
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-black/42">{frame.eyebrow}</p>
                  <h2 className="max-w-3xl text-balance text-[clamp(2.8rem,7vw,6.9rem)] font-black leading-[0.9] tracking-[-0.02em]">
                    {frame.title}
                  </h2>
                  <p className="max-w-xl text-lg font-medium leading-8 text-black/58">{frame.body}</p>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-black/36">
                    {String(index + 1).padStart(2, "0")} / {String(storyFrames.length).padStart(2, "0")}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="proof-system" className="home2-proof relative flex min-h-screen items-center overflow-hidden bg-black px-4 py-24 text-white sm:px-6 lg:px-8">
          <div className="absolute inset-0 opacity-50">
            <Image
              src="/images/home-2/city-glass.jpg"
              alt="Modern city glass building"
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/62" />
          </div>
          <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="home2-proof-copy flex flex-col gap-6">
              <Kicker className="border-white/18 bg-white/14 text-white/80 shadow-none">Proof system</Kicker>
              <h2 className="text-balance text-[clamp(3.4rem,8vw,8.5rem)] font-black leading-[0.88] tracking-[-0.02em]">
                Evidence that has gravity.
              </h2>
              <p className="max-w-xl text-lg font-medium leading-8 text-white/66">
                The interface treats every upload like a first-class object: visible, explainable, reviewable, and connected to the matter.
              </p>
            </div>

            <div className="relative min-h-[620px]">
              <ImageLayer
                src="/images/home-2/document-review.jpg"
                alt="Document review close up"
                className="home2-proof-image-a absolute left-0 top-8 h-[28rem] w-[70%] rounded-[2.4rem] border border-white/18 shadow-[0_42px_130px_rgba(0,0,0,0.38)]"
              />
              <ImageLayer
                src="/images/home-2/court-columns.jpg"
                alt="Scales of justice close up"
                className="home2-proof-image-b absolute bottom-4 right-0 h-[25rem] w-[64%] rounded-[2.4rem] border border-white/18 shadow-[0_42px_130px_rgba(0,0,0,0.42)]"
              />
            </div>
          </div>
        </section>

        <section id="workflow" className="home2-process-section relative flex min-h-screen items-center overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
          <div className="absolute left-4 top-24 z-10 max-w-4xl sm:left-8 lg:left-[max(2rem,calc((100vw-80rem)/2))]">
            <Kicker>Workflow in motion</Kicker>
            <h2 className="mt-6 max-w-4xl text-balance text-[clamp(3rem,7vw,7rem)] font-black leading-[0.88] tracking-[-0.02em]">
              Four rooms. One legal operating system.
            </h2>
          </div>

          <div className="home2-process-track flex gap-6 pt-52 will-change-transform lg:pl-[max(2rem,calc((100vw-80rem)/2))]">
            {processCards.map((card, index) => (
              <article
                key={card.title}
                className="home2-process-card home2-magnetic relative h-[520px] w-[82vw] shrink-0 overflow-hidden rounded-[2.5rem] bg-black text-white shadow-[0_42px_130px_rgba(16,24,40,0.20)] will-change-transform sm:w-[520px]"
              >
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  sizes="(max-width: 768px) 82vw, 520px"
                  className="home2-parallax-image object-cover opacity-82 will-change-transform"
                />
                <div className="home2-card-light absolute inset-0 opacity-0 [background:radial-gradient(circle_at_var(--mx,50%)_var(--my,50%),rgba(255,255,255,0.38),transparent_34%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.78))]" />
                <div className="relative z-10 flex h-full flex-col justify-between p-7">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-white/60">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <div>
                    <h3 className="text-balance text-5xl font-black leading-none tracking-[-0.02em]">{card.title}</h3>
                    <p className="mt-5 text-lg font-medium leading-8 text-white/72">{card.text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="home2-reveal max-w-5xl">
              <Kicker>Card portal effect</Kicker>
              <h2 className="mt-6 text-balance text-[clamp(3.2rem,8vw,8rem)] font-black leading-[0.88] tracking-[-0.02em]">
                Hover through the product instead of reading about it.
              </h2>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {portalCards.map((card) => (
                <article
                  key={card.title}
                  className="home2-portal-card home2-magnetic relative min-h-[520px] overflow-hidden rounded-[2.4rem] bg-black text-white shadow-[0_38px_120px_rgba(16,24,40,0.18)] will-change-transform"
                >
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="home2-parallax-image object-cover opacity-85 will-change-transform"
                  />
                  <div className="home2-card-light absolute inset-0 opacity-0 [background:radial-gradient(circle_at_var(--mx,50%)_var(--my,50%),rgba(255,255,255,0.42),transparent_36%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.86))]" />
                  <div className="relative z-10 flex min-h-[520px] flex-col justify-between p-7">
                    <p className="w-fit rounded-full border border-white/24 bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/74 backdrop-blur-xl">
                      {card.label}
                    </p>
                    <div>
                      <h3 className="text-balance text-4xl font-black leading-none tracking-[-0.02em]">{card.title}</h3>
                      <p className="mt-5 text-lg font-medium leading-8 text-white/70">{card.text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-28 pt-10 sm:px-6 lg:px-8">
          <div className="home2-reveal mx-auto max-w-7xl overflow-hidden rounded-[3rem] bg-black p-8 text-white shadow-[0_45px_150px_rgba(16,24,40,0.22)] sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-5xl">
                <Kicker className="border-white/18 bg-white/14 text-white/80 shadow-none">Mizan Home 2</Kicker>
                <h2 className="mt-6 text-balance text-[clamp(3.2rem,8vw,8rem)] font-black leading-[0.86] tracking-[-0.02em]">
                  A landing page with weight, clarity, and movement.
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 rounded-full bg-white px-6 text-base font-black text-black hover:bg-white/88">
                  <Link href="/signup">Start Mizan</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-white/22 bg-white/10 px-6 text-base font-black text-white backdrop-blur-xl hover:bg-white hover:text-black"
                >
                  <Link href="/">Original Home</Link>
                </Button>
              </div>
            </div>
            <div className="mt-10 grid gap-4 border-t border-white/12 pt-7 text-sm font-black uppercase tracking-[0.18em] text-white/46 sm:grid-cols-3">
              <p>Downloaded editorial imagery</p>
              <p>GSAP pinned timelines</p>
              <p>No 3D runtime or GLB usage</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
