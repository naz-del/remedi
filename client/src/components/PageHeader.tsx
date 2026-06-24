import { ReactNode } from 'react';
import { Icon } from './Icons';

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Icon;
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, icon, actions }: Props) {
  const I = icon ? Icon[icon] : null;
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {I && (
          <div className="mt-1 rounded-xl bg-brand-gradient p-2 text-white shadow-card">
            <I size={18} />
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
