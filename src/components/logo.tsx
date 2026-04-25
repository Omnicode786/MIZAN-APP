import Link from "next/link";
import Image from "next/image";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group relative isolate inline-flex h-10 shrink-0 items-center overflow-hidden rounded-full border border-slate-200/90 bg-white/98 px-2 shadow-[0_6px_18px_rgba(15,23,42,0.08)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)] dark:border-slate-600/50 dark:bg-white/98 dark:shadow-[0_12px_26px_rgba(0,0,0,0.22)]"
      aria-label="MIZAN home"
    >
      <span className="pointer-events-none absolute inset-y-[4px] left-[4px] z-0 w-[2.2rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,1),rgba(241,245,249,0.98)_62%,rgba(203,213,225,0.8)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_5px_12px_rgba(15,23,42,0.08)]" />
      <span className="pointer-events-none absolute inset-x-0 inset-y-0 z-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.035),rgba(14,165,233,0.02)_55%,rgba(255,255,255,0))]" />
      <Image
        src="/logo-cropped.png"
        alt="MIZAN"
        width={553}
        height={319}
        priority
        className="relative z-10 h-[1.8rem] w-auto max-w-[122px] object-contain drop-shadow-[0_1px_4px_rgba(15,23,42,0.08)] sm:h-[1.9rem] sm:max-w-[128px]"
      />
    </Link>
  );
}
