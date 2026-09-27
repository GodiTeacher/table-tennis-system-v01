type RadarDomain = {
  name: string;
  value: number | null;
  assessed: number;
  total: number;
};

const SHORT_LABELS: Record<string, string> = {
  '控球與擊球': '控球擊球',
  '移動與銜接': '移動銜接',
  '旋轉發接發': '旋轉發接發',
  '實戰與戰術': '實戰戰術',
  '打法與專項發展': '打法專項',
  '身體與比賽習慣': '身體習慣',
};

function point(cx: number, cy: number, radius: number, angle: number) {
  const rad = (Math.PI / 180) * angle;
  return { x: cx + Math.cos(rad) * radius, y: cy + Math.sin(rad) * radius };
}

export default function AbilityRadar({ domains }: { domains: RadarDomain[] }) {
  const cx = 180;
  const cy = 170;
  const maxRadius = 112;
  const angles = [-90, -30, 30, 90, 150, 210];

  const gridPolygons = [1, 2, 3, 4, 5].map((level) =>
    angles
      .map((angle) => {
        const p = point(cx, cy, (maxRadius * level) / 5, angle);
        return `${p.x},${p.y}`;
      })
      .join(' ')
  );

  const valuePoints = domains
    .map((domain, index) => {
      const value = domain.value ?? 0;
      const p = point(cx, cy, (maxRadius * Math.max(0, Math.min(5, value))) / 5, angles[index]);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <div className="radarWrap">
      <svg viewBox="0 0 360 340" role="img" aria-label="六大面向能力雷達圖" className="radarChart">
        {gridPolygons.map((polygon, index) => (
          <polygon key={index} points={polygon} fill="none" stroke="#dce3ea" strokeWidth="1" />
        ))}
        {angles.map((angle, index) => {
          const end = point(cx, cy, maxRadius, angle);
          return <line key={index} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#e3e8ee" strokeWidth="1" />;
        })}
        <polygon points={valuePoints} fill="rgba(39,52,68,.16)" stroke="#273444" strokeWidth="3" />
        {domains.map((domain, index) => {
          const value = domain.value ?? 0;
          const dot = point(cx, cy, (maxRadius * Math.max(0, Math.min(5, value))) / 5, angles[index]);
          const label = point(cx, cy, maxRadius + 34, angles[index]);
          const anchor = label.x < cx - 10 ? 'end' : label.x > cx + 10 ? 'start' : 'middle';
          return (
            <g key={domain.name}>
              <circle cx={dot.x} cy={dot.y} r="4" fill={domain.value == null ? '#c5ccd5' : '#273444'} />
              <text x={label.x} y={label.y - 4} textAnchor={anchor} className="radarLabel">{SHORT_LABELS[domain.name] ?? domain.name}</text>
              <text x={label.x} y={label.y + 13} textAnchor={anchor} className="radarValue">
                {domain.value == null ? '—' : domain.value.toFixed(1)} / 5
              </text>
            </g>
          );
        })}
      </svg>
      <div className="radarLegend">
        {domains.map((domain) => (
          <div key={domain.name}>
            <b>{domain.name}</b>
            <span>{domain.assessed}/{domain.total || 0} 項已評量</span>
          </div>
        ))}
      </div>
    </div>
  );
}
