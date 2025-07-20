"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Dumbbell } from "lucide-react"

interface MonthlyWeightChartProps {
  data: {
    exerciseName: string
    weightHistory: Array<{ date: string; fullDate: string; weight: number; rawDate?: string }>
    dateRange: {
      start: string
      end: string
    }
  }
}

export default function MonthlyWeightChart({ data }: MonthlyWeightChartProps) {
  const { weightHistory = [], dateRange = { start: "", end: "" }, exerciseName = "Bicep Curls" } = data || {}
  const [chartLoaded, setChartLoaded] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

  // Calculate progress
  const calculateProgress = () => {
    if (!weightHistory || weightHistory.length < 2) return { change: 0, percent: 0 }

    const firstWeight = weightHistory[0].weight
    const lastWeight = weightHistory[weightHistory.length - 1].weight
    const change = Number.parseFloat((lastWeight - firstWeight).toFixed(1))
    const percent = Number.parseFloat(((change / firstWeight) * 100).toFixed(1))

    return { change, percent }
  }

  const progress = calculateProgress()
  const isProgressPositive = progress.change > 0

  // Find max weight (personal record)
  const maxWeight =
    weightHistory && weightHistory.length > 0 ? Math.max(...weightHistory.map((entry) => entry.weight)) : 0

  // Get the most recent weight (last entry in the sorted array)
  const currentWeight = weightHistory && weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : 0

  useEffect(() => {
    // Mark chart as loaded after a short delay
    const timer = setTimeout(() => {
      setChartLoaded(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (!weightHistory || weightHistory.length === 0) {
    return (
      <div className="p-6 text-center">
        <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-medium mb-2">No Weight Data Available</h3>
        <p className="text-muted-foreground">
          No weight data found for {exerciseName} in the selected time period. Start tracking weights to see your
          progress.
        </p>
      </div>
    )
  }

  // Calculate chart dimensions - increased size
  const chartWidth = 900
  const chartHeight = 400
  const padding = { top: 30, right: 40, bottom: 40, left: 60 }
  const graphWidth = chartWidth - padding.left - padding.right
  const graphHeight = chartHeight - padding.top - padding.bottom

  // Find min and max values for scaling
  const minWeight = Math.min(...weightHistory.map((d) => d.weight))
  const maxWeightValue = Math.max(...weightHistory.map((d) => d.weight))

  // Add some padding to the min/max values
  const yMin = Math.max(0, Math.floor(minWeight / 5) * 5) // Round down to nearest 5
  const yMax = Math.ceil(maxWeightValue / 5) * 5 // Round up to nearest 5

  // Generate y-axis ticks with 5lb increments
  const yTicks = []
  for (let i = yMin; i <= yMax; i += 5) {
    yTicks.push(i)
  }

  // Scale functions - handle the case when there's only one data point
  const xScale = (index: number) => {
    // If there's only one data point, center it
    if (weightHistory.length === 1) {
      return padding.left + graphWidth / 2
    }
    // Otherwise, distribute points evenly
    return padding.left + (index / (weightHistory.length - 1)) * graphWidth
  }

  const yScale = (value: number) => padding.top + graphHeight - ((value - yMin) / (yMax - yMin)) * graphHeight

  // Generate path for the line - only if we have more than one point
  const linePath =
    weightHistory.length > 1
      ? weightHistory
          .map((point, i) => {
            const x = xScale(i)
            const y = yScale(point.weight)
            return `${i === 0 ? "M" : "L"} ${x} ${y}`
          })
          .join(" ")
      : "" // Empty string if only one point (no line needed)

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-primary/5 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Current Weight</h4>
          <p className="text-2xl font-bold">{currentWeight} lbs</p>
          <p className="text-xs text-muted-foreground mt-1">Last recorded for {exerciseName}</p>
        </div>

        <div className="bg-primary/5 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Weight Change</h4>
          <p
            className={`text-2xl font-bold ${isProgressPositive ? "text-green-500" : progress.change < 0 ? "text-red-500" : ""}`}
          >
            {isProgressPositive ? "+" : ""}
            {progress.change} lbs
          </p>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {isProgressPositive ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : progress.change < 0 ? (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            ) : null}
            <span>
              {isProgressPositive
                ? `Increased by ${progress.percent}%`
                : progress.change < 0
                  ? `Decreased by ${Math.abs(progress.percent)}%`
                  : "No change"}
            </span>
          </div>
        </div>

        <div className="bg-primary/5 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Personal Record</h4>
          <p className="text-2xl font-bold text-blue-500">{maxWeight} lbs</p>
          <p className="text-xs text-muted-foreground mt-1">Highest weight in this period</p>
        </div>
      </div>

      {/* Larger SVG chart */}
      <div className="border border-gray-200 rounded-md p-4 bg-white overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="mx-auto">
          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + graphHeight}
            stroke="#ccc"
            strokeWidth="1"
          />

          {/* X-axis */}
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={padding.left + graphWidth}
            y2={padding.top + graphHeight}
            stroke="#ccc"
            strokeWidth="1"
          />

          {/* Y-axis grid lines */}
          {yTicks.map((tick) => (
            <line
              key={`grid-${tick}`}
              x1={padding.left}
              y1={yScale(tick)}
              x2={padding.left + graphWidth}
              y2={yScale(tick)}
              stroke="#eee"
              strokeWidth="1"
            />
          ))}

          {/* Y-axis labels - now with 5lb increments */}
          {yTicks.map((tick) => (
            <g key={`label-${tick}`}>
              <text
                x={padding.left - 10}
                y={yScale(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="12"
                fill="#666"
              >
                {tick}
              </text>
              <line
                x1={padding.left - 5}
                y1={yScale(tick)}
                x2={padding.left}
                y2={yScale(tick)}
                stroke="#ccc"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* X-axis labels */}
          {weightHistory.map((point, i) => {
            // For single data point, always show the label
            if (weightHistory.length === 1) {
              return (
                <g key={`x-label-${i}`}>
                  <text x={xScale(i)} y={padding.top + graphHeight + 20} textAnchor="middle" fontSize="12" fill="#666">
                    {point.date}
                  </text>
                </g>
              )
            }

            // For multiple points, only show some labels to avoid overcrowding
            if (i % Math.max(1, Math.floor(weightHistory.length / 7)) !== 0 && i !== weightHistory.length - 1)
              return null

            return (
              <g key={`x-label-${i}`}>
                <text x={xScale(i)} y={padding.top + graphHeight + 20} textAnchor="middle" fontSize="12" fill="#666">
                  {point.date}
                </text>
              </g>
            )
          })}

          {/* Line - only draw if we have more than one point */}
          {weightHistory.length > 1 && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="3" />}

          {/* Data points */}
          {weightHistory.map((point, i) => (
            <g key={`point-${i}`}>
              {/* Circle point */}
              <circle
                cx={xScale(i)}
                cy={yScale(point.weight)}
                r={hoveredPoint === i ? "7" : "5"}
                fill={hoveredPoint === i ? "#1e40af" : "#2563eb"}
                stroke="#fff"
                strokeWidth="1.5"
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: "pointer" }}
              />

              {/* Weight tooltip on hover */}
              {hoveredPoint === i && (
                <g>
                  <rect x={xScale(i) - 25} y={yScale(point.weight) - 35} width="50" height="25" rx="4" fill="#2563eb" />
                  <text
                    x={xScale(i)}
                    y={yScale(point.weight) - 18}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="bold"
                    fill="white"
                  >
                    {point.weight} lbs
                  </text>
                </g>
              )}

              {/* Invisible larger hit area for better hover detection */}
              <circle
                cx={xScale(i)}
                cy={yScale(point.weight)}
                r="15"
                fill="transparent"
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: "pointer" }}
              />
            </g>
          ))}

          {/* PR line */}
          <line
            x1={padding.left}
            y1={yScale(maxWeight)}
            x2={padding.left + graphWidth}
            y2={yScale(maxWeight)}
            stroke="#3b82f6"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
          <text
            x={padding.left + graphWidth - 20}
            y={yScale(maxWeight) - 10}
            fill="#3b82f6"
            fontSize="12"
            fontWeight="bold"
          >
            PR
          </text>
        </svg>
      </div>

      <div className="text-xs text-muted-foreground text-center mt-2">
        Date range: {dateRange.start} - {dateRange.end}
      </div>
    </div>
  )
}
