'use client';

import { ChevronRight, HardDrive } from 'lucide-react';

export default function Breadcrumbs({ scope, prefix, onNavigate }) {
  const segments = (prefix || '').split('/').filter(Boolean);
  const rootLabel = scope === 'private' ? 'Private' : 'Public';

  const crumbs = [
    { label: rootLabel, prefix: '', icon: <HardDrive size={14} /> },
    ...segments.map((seg, i) => ({
      label: seg,
      prefix: segments.slice(0, i + 1).join('/'),
    })),
  ];

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-300 overflow-x-auto custom-scrollbar whitespace-nowrap py-1">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <div key={c.prefix} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNavigate(c.prefix)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
                isLast ? 'text-white font-semibold bg-[#2a2a2a]' : 'hover:bg-[#2a2a2a] text-gray-300'
              }`}
            >
              {c.icon}
              <span className="truncate max-w-[160px]">{c.label}</span>
            </button>
            {!isLast && <ChevronRight size={14} className="text-gray-500 shrink-0" />}
          </div>
        );
      })}
    </nav>
  );
}
