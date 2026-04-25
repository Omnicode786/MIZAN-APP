import Link from "next/link";
import Image from "next/image";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex shrink-0 items-center rounded-2xl py-1.5 transition-opacity hover:opacity-90"
      aria-label="MIZAN home"
    >
      <Image
        src="/logo.png"
        alt="MIZAN"
        width={665}
        height={375}
        priority
        className="h-[3.1rem] w-auto max-w-[160px] object-contain sm:h-[3.35rem] sm:max-w-[176px]"
      />
    </Link>
  );
}
