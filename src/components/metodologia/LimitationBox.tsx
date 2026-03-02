'use client';

interface LimitationBoxProps {
  items: string[];
}

export default function LimitationBox({ items }: LimitationBoxProps) {
  if (items.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(245,158,11,0.02) 100%)',
        border: '1px solid rgba(245,158,11,0.15)',
      }}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <div
          className="flex size-5 items-center justify-center rounded-md text-[10px]"
          style={{ background: 'rgba(245,158,11,0.15)' }}
        >
          ⚠
        </div>
        <span className="font-mono text-xs font-medium uppercase tracking-wider text-[#f59e0b]/70">
          Ograniczenia
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2 text-[13px] leading-relaxed text-[#888888]"
          >
            <span
              className="mt-[7px] block size-1 shrink-0 rounded-full"
              style={{ background: '#f59e0b40' }}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
