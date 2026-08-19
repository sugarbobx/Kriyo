import Link from "next/link";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/accounts", label: "Comptes" },
  { href: "/engine", label: "Moteur" },
  { href: "/tracking", label: "Suivi" },
  { href: "/education", label: "Éducation" }
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-kriyo-borderSoft bg-[rgba(10,13,18,0.92)] backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 px-2 py-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl px-2 py-2 text-center text-xs font-medium text-kriyo-dim transition hover:bg-kriyo-surface hover:text-kriyo-text"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
