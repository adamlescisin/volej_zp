import Link from 'next/link';

const navLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/seasons', label: 'Seasons' },
  { href: '/admin/players', label: 'Players' },
  { href: '/admin/schedule', label: 'Schedule' },
  { href: '/admin/practices', label: 'Practices' },
  { href: '/admin/deposits', label: 'Deposits' },
  { href: '/admin/costs', label: 'Costs' },
];

export function NavBar() {
  return (
    <nav className="bg-blue-700 text-white px-4 py-3 flex items-center gap-6 flex-wrap">
      <Link href="/admin/dashboard" className="font-bold text-lg mr-4 shrink-0">
        ZP Volej
      </Link>
      {navLinks.map(link => (
        <Link
          key={link.href}
          href={link.href}
          className="text-sm hover:text-blue-200 transition-colors"
        >
          {link.label}
        </Link>
      ))}
      <div className="ml-auto">
        <Link href="/" className="text-sm hover:text-blue-200 transition-colors">
          Public view →
        </Link>
      </div>
    </nav>
  );
}
