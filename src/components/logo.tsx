import Link from "next/link";
import Image from "next/image";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group relative isolate inline-flex shrink-0 items-center overflow-hidden rounded-full border border-border/70 bg-card/78 px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-[transform,box-shadow,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.12)] dark:bg-card/84 dark:shadow-[0_18px_36px_rgba(0,0,0,0.3)]"
      aria-label="MIZAN home"
    >
      <span className="pointer-events-none absolute inset-y-2 left-2 z-0 w-[3.3rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.98),rgba(241,245,249,0.95)_58%,rgba(203,213,225,0.68)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_20px_rgba(15,23,42,0.08)] transition-colors duration-300 dark:bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.98),rgba(30,41,59,0.96)_58%,rgba(71,85,105,0.72)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_26px_rgba(0,0,0,0.28)]" />
      <span className="pointer-events-none absolute inset-x-0 inset-y-0 z-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.06),rgba(14,165,233,0.03)_55%,rgba(255,255,255,0))] dark:bg-[linear-gradient(135deg,rgba(96,165,250,0.1),rgba(45,212,191,0.05)_55%,rgba(255,255,255,0))]" />
      <Image
        src="/logo.png"
        alt="MIZAN"
        width={665}
        height={375}
        priority
        className="relative z-10 h-[3rem] w-auto max-w-[158px] object-contain drop-shadow-[0_2px_10px_rgba(15,23,42,0.12)] sm:h-[3.2rem] sm:max-w-[170px] dark:drop-shadow-[0_4px_14px_rgba(0,0,0,0.3)]"
      />
    </Link>
  );
}
