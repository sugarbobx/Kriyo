import { redirect } from 'next/navigation';

export function redirectTo(path: string): never {
  return redirect(path as never);
}
