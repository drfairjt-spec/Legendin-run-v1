import React, { useMemo } from "react";
import * as d3 from "d3";
import { User } from "../types";
import { toPersianDigits } from "../utils/shamsi";

interface ArtistComparisonChartProps {
  artistA: User;
  artistB: User;
  calculateProfileStrength: (user: User) => number;
}

interface RadarMetric {
  axis: string;
  valueA: number;
  valueB: number;
  displayValueA: string;
  displayValueB: string;
}

export default function ArtistComparisonChart({
  artistA,
  artistB,
  calculateProfileStrength
}: ArtistComparisonChartProps) {
  // Dimensions of the chart
  const width = 450;
  const height = 450;
  const margin = { top: 60, right: 60, bottom: 60, left: 60 };
  const radius = Math.min(width, height) / 2 - Math.max(margin.top, margin.right);

  // Derive comparative metrics (0 to 100 range for the radar)
  const metrics = useMemo<RadarMetric[]>(() => {
    // 1. Rating (scaled from 1-5 to 0-100)
    const ratingValA = artistA.rating || 4.0;
    const ratingValB = artistB.rating || 4.0;
    const ratingPctA = Math.max(0, Math.min(100, (ratingValA - 3) * 50)); // 3.0 -> 0%, 5.0 -> 100%
    const ratingPctB = Math.max(0, Math.min(100, (ratingValB - 3) * 50));

    // 2. Experience (scaled from 0-15 years to 0-100)
    const expValA = artistA.yearsOfExperience || 0;
    const expValB = artistB.yearsOfExperience || 0;
    const expPctA = Math.min(100, expValA * 6.6); // 15 years -> ~100%
    const expPctB = Math.min(100, expValB * 6.6);

    // 3. Profile Strength (already 0-100)
    const strengthPctA = calculateProfileStrength(artistA);
    const strengthPctB = calculateProfileStrength(artistB);

    // 4. Skills count (scaled from 0-6 skills to 0-100)
    const skillsCountA = artistA.skills?.length || 0;
    const skillsCountB = artistB.skills?.length || 0;
    const skillsPctA = Math.min(100, skillsCountA * 16.6); // 6 skills -> 100%
    const skillsPctB = Math.min(100, skillsCountB * 16.6);

    // 5. Portfolio count (scaled from 0-5 items to 0-100)
    const portCountA = artistA.portfolio?.length || 0;
    const portCountB = artistB.portfolio?.length || 0;
    const portPctA = Math.min(100, portCountA * 20); // 5 items -> 100%
    const portPctB = Math.min(100, portCountB * 20);

    // 6. Reviews count (scaled from 0-3 reviews to 0-100)
    const reviewsCountA = artistA.reviews?.length || 0;
    const reviewsCountB = artistB.reviews?.length || 0;
    const reviewsPctA = Math.min(100, reviewsCountA * 33.3); // 3 reviews -> 100%
    const reviewsPctB = Math.min(100, reviewsCountB * 33.3);

    return [
      {
        axis: "سابقه کاری (سال)",
        valueA: expPctA,
        valueB: expPctB,
        displayValueA: `${toPersianDigits(expValA)} سال`,
        displayValueB: `${toPersianDigits(expValB)} سال`
      },
      {
        axis: "امتیاز مراجعین",
        valueA: ratingPctA,
        valueB: ratingPctB,
        displayValueA: `⭐️ ${toPersianDigits(ratingValA)}`,
        displayValueB: `⭐️ ${toPersianDigits(ratingValB)}`
      },
      {
        axis: "تنوع تخصص‌ها",
        valueA: skillsPctA,
        valueB: skillsPctB,
        displayValueA: `${toPersianDigits(skillsCountA)} تخصص`,
        displayValueB: `${toPersianDigits(skillsCountB)} تخصص`
      },
      {
        axis: "اعتبار رزومه (پروفایل)",
        valueA: strengthPctA,
        valueB: strengthPctB,
        displayValueA: `${toPersianDigits(strengthPctA)}٪`,
        displayValueB: `${toPersianDigits(strengthPctB)}٪`
      },
      {
        axis: "نمونه‌ کارهای گالری",
        valueA: portPctA,
        valueB: portPctB,
        displayValueA: `${toPersianDigits(portCountA)} اثر`,
        displayValueB: `${toPersianDigits(portCountB)} اثر`
      },
      {
        axis: "محبوبیت (تعداد بازخورد)",
        valueA: reviewsPctA,
        valueB: reviewsPctB,
        displayValueA: `${toPersianDigits(reviewsCountA)} نظر`,
        displayValueB: `${toPersianDigits(reviewsCountB)} نظر`
      }
    ];
  }, [artistA, artistB, calculateProfileStrength]);

  const numAxes = metrics.length;
  const angleStep = (Math.PI * 2) / numAxes;

  // D3 Scales and Math Generators
  const rScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([0, 100])
      .range([0, radius]);
  }, [radius]);

  // Center coordinates
  const cx = width / 2;
  const cy = height / 2;

  // Generate grid circles ticks
  const levels = [20, 40, 60, 80, 100];

  // Helper to calculate X and Y coordinates on a radar axis
  const getCoordinates = (index: number, val: number) => {
    const angle = index * angleStep - Math.PI / 2; // Shift by 90 deg so the first starts at the top
    const r = rScale(val);
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  };

  // Build radar polygons using d3 lineRadial or custom coordinate mappings
  const pathA = useMemo(() => {
    const points = metrics.map((m, idx) => {
      const coords = getCoordinates(idx, m.valueA);
      return `${coords.x},${coords.y}`;
    });
    return points.join(" ");
  }, [metrics, rScale, cx, cy]);

  const pathB = useMemo(() => {
    const points = metrics.map((m, idx) => {
      const coords = getCoordinates(idx, m.valueB);
      return `${coords.x},${coords.y}`;
    });
    return points.join(" ");
  }, [metrics, rScale, cx, cy]);

  return (
    <div className="flex flex-col items-center bg-slate-50/65 border border-slate-100 rounded-2xl p-4 shadow-xs">
      <div className="w-full text-center mb-1">
        <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
          تحلیل و ارزیابی شایستگی دوجانبه (D3 Engine)
        </span>
      </div>

      <div className="relative w-full overflow-x-auto flex justify-center scrollbar-none select-none">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="mx-auto block"
        >
          {/* Concentric grid circles */}
          {levels.map((level, levelIdx) => {
            const r = rScale(level);
            // Draw a polygon grid instead of simple circles for a true high-tech aesthetic
            const gridPoints = Array.from({ length: numAxes }).map((_, idx) => {
              const angle = idx * angleStep - Math.PI / 2;
              const x = cx + r * Math.cos(angle);
              const y = cy + r * Math.sin(angle);
              return `${x},${y}`;
            }).join(" ");

            return (
              <g key={`grid-level-${levelIdx}`}>
                <polygon
                  points={gridPoints}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray={levelIdx % 2 === 0 ? "none" : "2,2"}
                />
                {/* Level indicators */}
                <text
                  x={cx + 3}
                  y={cy - r + 3}
                  className="fill-slate-300 font-mono text-[8px] font-semibold"
                >
                  {level}
                </text>
              </g>
            );
          })}

          {/* Web Spoke Axes lines */}
          {metrics.map((m, idx) => {
            const edge = getCoordinates(idx, 100);
            return (
              <line
                key={`axis-line-${idx}`}
                x1={cx}
                y1={cy}
                x2={edge.x}
                y2={edge.y}
                stroke="#cbd5e1"
                strokeWidth="1"
              />
            );
          })}

          {/* Radar area Artist A (Emerald / Olive theme to match brand) */}
          <polygon
            points={pathA}
            fill="#0284c7"
            fillOpacity={0.25}
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="transition-all duration-300 hover:fill-opacity-40"
          />

          {/* Radar area Artist B (Midnight / Dark Indigo theme for high contrast comparison) */}
          <polygon
            points={pathB}
            fill="#0f172a"
            fillOpacity={0.15}
            stroke="#0f172a"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="transition-all duration-300 hover:fill-opacity-30"
          />

          {/* Individual markers / nodes on vertices */}
          {metrics.map((m, idx) => {
            const nodeA = getCoordinates(idx, m.valueA);
            const nodeB = getCoordinates(idx, m.valueB);
            return (
              <g key={`nodes-${idx}`}>
                {/* Node A */}
                <circle
                  cx={nodeA.x}
                  cy={nodeA.y}
                  r="4"
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                >
                  <title>{artistA.name}: {m.displayValueA}</title>
                </circle>
                {/* Node B */}
                <circle
                  cx={nodeB.x}
                  cy={nodeB.y}
                  r="4"
                  fill="#0f172a"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="cursor-pointer"
                >
                  <title>{artistB.name}: {m.displayValueB}</title>
                </circle>
              </g>
            );
          })}

          {/* Labeling axes with data points */}
          {metrics.map((m, idx) => {
            const angle = idx * angleStep - Math.PI / 2;
            const textRadius = radius + 22;
            const tx = cx + textRadius * Math.cos(angle);
            const ty = cy + textRadius * Math.sin(angle);

            // Fine-tune text-anchor and vertical alignment based on angle
            let textAnchor: "start" | "end" | "middle" | "inherit" = "middle";
            if (Math.cos(angle) > 0.1) textAnchor = "start";
            else if (Math.cos(angle) < -0.1) textAnchor = "end";

            let dy = "0.35em";
            if (angle === -Math.PI / 2) dy = "-0.2em"; // Top label
            else if (angle === Math.PI / 2) dy = "1em";  // Bottom label

            return (
              <g key={`axis-labels-${idx}`}>
                <text
                  x={tx}
                  y={ty}
                  dy={dy}
                  textAnchor={textAnchor}
                  className="fill-slate-700 text-[10px] font-extrabold"
                >
                  {m.axis}
                </text>
                {/* Values near labels */}
                <text
                  x={tx}
                  y={ty + (angle === Math.PI / 2 ? 22 : 12)}
                  dy={dy}
                  textAnchor={textAnchor}
                  className="text-[9px] font-bold"
                >
                  <tspan fill="#0284c7">{m.displayValueA}</tspan>
                  <tspan fill="#64748b" dx="6"> | </tspan>
                  <tspan fill="#0f172a" dx="6">{m.displayValueB}</tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 border-t border-slate-150 pt-2.5 w-full max-w-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-[#0284c7] inline-block" />
          <span className="text-[11px] font-bold text-slate-800">{artistA.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-[#0f172a] inline-block" />
          <span className="text-[11px] font-bold text-slate-800">{artistB.name}</span>
        </div>
      </div>
    </div>
  );
}
