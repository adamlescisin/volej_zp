'use client';

import { useRouter } from 'next/navigation';

type Season = {
  id: string;
  name: string;
  isActive: boolean;
};

export function SeasonSelector({
  seasons,
  selectedId,
  basePath,
}: {
  seasons: Season[];
  selectedId?: string;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId || ''}
      onChange={e => {
        if (e.target.value) {
          router.push(`${basePath}?seasonId=${e.target.value}`);
        }
      }}
      className="border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">Vyberte sezónu...</option>
      {seasons.map(s => (
        <option key={s.id} value={s.id}>
          {s.name}{s.isActive ? ' (Aktivní)' : ''}
        </option>
      ))}
    </select>
  );
}
