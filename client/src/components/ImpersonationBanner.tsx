import { useAuth } from '../auth';
import { Icon } from './Icons';

export function ImpersonationBanner() {
  const { impersonating, user, stopImpersonating } = useAuth();
  if (!impersonating || !user) return null;
  return (
    <div className="sticky top-0 z-40 border-b border-amber-300 bg-amber-100 text-amber-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-sm">
        <div className="flex items-center gap-2">
          <Icon.Spark size={16} />
          <span>
            Viewing as <span className="font-semibold">{user.name}</span>
            {user.scope_name && <> · <span className="font-medium">{user.scope_name}</span></>}
            {' '}<span className="text-xs uppercase tracking-wide opacity-70">({user.role})</span>
          </span>
        </div>
        <button
          className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-white/60 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-white"
          onClick={() => stopImpersonating()}
        >
          Return to admin
        </button>
      </div>
    </div>
  );
}
