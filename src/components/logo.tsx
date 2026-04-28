import Link from "next/link";
import Image from "next/image";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group relative isolate inline-flex h-11 shrink-0 items-center gap-2 overflow-hidden rounded-full border border-slate-200/90 bg-white/98 px-2.5 pr-4 shadow-[0_6px_18px_rgba(15,23,42,0.08)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)] dark:border-slate-600/50 dark:bg-white/98 dark:shadow-[0_12px_26px_rgba(0,0,0,0.22)]"
      aria-label="MIZAN home"
    >
      <span className="pointer-events-none absolute inset-x-0 inset-y-0 z-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.035),rgba(14,165,233,0.02)_55%,rgba(255,255,255,0))]" />
      <span className="relative z-10 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,1),rgba(241,245,249,0.98)_62%,rgba(203,213,225,0.84)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_5px_12px_rgba(15,23,42,0.08)]">
        <Image
          src="/logo-cropped.png"
          alt=""
          fill
          priority
          sizes="32px"
          className="scale-[1.42] object-cover object-left"
        />
      </span>
      <span className="relative z-10 text-[15px] font-extrabold tracking-normal text-slate-900">
        Mizan
      </span>
    </Link>
  );
}
