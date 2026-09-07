import { AuthForm } from '@/components/auth/auth-form';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitch } from '@/components/i18n/language-switch';
import { getServerDictionary } from '@/lib/i18n/locale';
import Link from 'next/link';

function normalizeNextPath(next?: string | string[]) {
  const value = Array.isArray(next) ? next[0] : next;
  return value && value.startsWith('/') ? value : '/sas';
}

export default async function SignupPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const params = (await searchParams) ?? {};
  const nextPath = normalizeNextPath(params.next);
  const { dict } = await getServerDictionary();

  return (
    <div className="mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="space-y-3">
          <Badge className="border-kriyo-amber/30 bg-kriyo-amber/10 text-kriyo-amber">{dict.signup.badge}</Badge>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-kriyo-text">{dict.signup.title}</h1>
          <p className="text-sm text-kriyo-dim">{dict.signup.subtitle}</p>
          <Link className="inline-flex text-sm text-kriyo-cyan underline-offset-4 hover:underline" href={`/login?next=${encodeURIComponent(nextPath)}`}>
            {dict.signup.alreadyHaveAccountLink}
          </Link>
        </div>
        <LanguageSwitch />
      </div>
      <AuthForm mode="signup" nextPath={nextPath} />
    </div>
  );
}
