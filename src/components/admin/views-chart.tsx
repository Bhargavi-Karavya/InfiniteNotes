type ViewsChartProps = {
  data: Array<{ date: string; views: number }>;
};

/**
 * Lightweight SVG area chart — no chart library dependency.
 */
export function ViewsOverTimeChart({ data }: ViewsChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No view activity in this range yet.
      </p>
    );
  }

  const width = 640;
  const height = 220;
  const padX = 16;
  const padY = 20;
  const max = Math.max(...data.map((d) => d.views), 1);
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? padX + innerW / 2
        : padX + (i / (data.length - 1)) * innerW;
    const y = padY + innerH - (d.views / max) * innerH;
    return { x, y, ...d };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${points[points.length - 1].x},${padY + innerH} L${points[0].x},${padY + innerH} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[280px]"
        role="img"
        aria-label="Views over time"
      >
        <defs>
          <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#viewsFill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p) => (
          <circle
            key={p.date}
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="var(--surface)"
            stroke="var(--secondary)"
            strokeWidth="2"
          >
            <title>
              {p.date}: {p.views.toLocaleString()} views
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground sm:text-xs">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
