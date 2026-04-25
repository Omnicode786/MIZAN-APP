import Link from "next/link";
import Image from "next/image";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group relative isolate inline-flex h-11 shrink-0 items-center overflow-hidden rounded-full border border-slate-200/90 bg-white/96 px-2.5 shadow-[0_8px_20px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] dark:border-slate-700/70 dark:bg-slate-50/96 dark:shadow-[0_14px_30px_rgba(0,0,0,0.28)]"
      aria-label="MIZAN home"
    >
      <span className="pointer-events-none absolute inset-y-[5px] left-[5px] z-0 w-[2.45rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,1),rgba(241,245,249,0.98)_62%,rgba(203,213,225,0.78)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_6px_14px_rgba(15,23,42,0.08)] transition-colors duration-300 dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,1),rgba(248,250,252,0.98)_62%,rgba(203,213,225,0.8)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_8px_18px_rgba(0,0,0,0.18)]" />
      <span className="pointer-events-none absolute inset-x-0 inset-y-0 z-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.04),rgba(14,165,233,0.02)_55%,rgba(255,255,255,0))] dark:bg-[linear-gradient(135deg,rgba(37,99,235,0.05),rgba(14,165,233,0.03)_55%,rgba(255,255,255,0))]" />
      <Image
        src="/logo.png"
        alt="MIZAN"
        width={665}
        height={375}
        priority
        className="relative z-10 h-[2.1rem] w-auto max-w-[132px] object-contain drop-shadow-[0_2px_8px_rgba(15,23,42,0.1)] sm:h-[2.2rem] sm:max-w-[138px]"
      />
    </Link>
  );
}
