import { AuthForm } from '@/components/auth/auth-form';
import { Badge } from '@/components/ui/badge';
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

  return (
    <div className="mx-auto flex min-h-[100svh] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 space-y-3">
        <Badge className="border-kriyo-amber/30 bg-kriyo-amber/10 text-kriyo-amber">Nouveau compte</Badge>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-kriyo-text">Créer un compte</h1>
        <p className="text-sm text-kriyo-dim">Préparez votre espace de trading avant de brancher la logique métier.</p>
        <Link className="inline-flex text-sm text-kriyo-cyan underline-offset-4 hover:underline" href={`/login?next=${encodeURIComponent(nextPath)}`}>
          J’ai déjà un compte
        </Link>
      </div>
      <AuthForm mode="signup" nextPath={nextPath} />
    </div>
  );
}
