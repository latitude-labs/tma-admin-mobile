import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Polygon,
  Text as SvgText,
  G,
} from 'react-native-svg';
import { IndividualScores } from '@/types/clubHealth';
import { ThemeColors, useThemeColors } from '@/hooks/useThemeColors';
import { Theme } from '@/constants/Theme';

const { width: screenWidth } = Dimensions.get('window');

interface MetricsRadarChartProps {
  scores: IndividualScores;
  size?: number;
  animated?: boolean;
}

export const MetricsRadarChart: React.FC<MetricsRadarChartProps> = ({
  scores,
  size = screenWidth - 64,
  animated = true,
}) => {
  const palette = useThemeColors();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const labels = [
    { key: 'booking_efficiency', label: 'Booking\nEfficiency' },
    { key: 'show_up_rate', label: 'Show Up\nRate' },
    { key: 'enrollment_conversion', label: 'Enrollment\nConversion' },
    { key: 'revenue_health', label: 'Revenue\nHealth' },
    { key: 'growth_trajectory', label: 'Growth\nTrajectory' },
    { key: 'retention_quality', label: 'Retention\nQuality' },
  ];

  const numSides = labels.length;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  const angleSlice = (Math.PI * 2) / numSides;

  // Calculate points for the polygon
  const calculatePoints = (values: number[]) => {
    return values.map((value, index) => {
      const scaledRadius = (value / 100) * radius;
      const angle = angleSlice * index - Math.PI / 2;
      const x = centerX + scaledRadius * Math.cos(angle);
      const y = centerY + scaledRadius * Math.sin(angle);
      return { x, y };
    });
  };

  // Get values in order
  const values = labels.map(label => scores[label.key as keyof IndividualScores]);
  const points = calculatePoints(values);
  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ') + ' Z';

  // Calculate average score for center display
  const avgScore = Math.round(
    values.reduce((sum, val) => sum + val, 0) / values.length
  );

  // Get color based on average score
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#06b6d4';
    if (score >= 40) return '#f59e0b';
    if (score >= 20) return '#a855f7';
    return '#ef4444';
  };

  const scoreColor = getScoreColor(avgScore);

  // Render grid lines
  const renderGridLines = () => {
    const lines = [];
    const circles = [];

    // Render concentric circles for grid
    for (let i = 1; i <= 5; i++) {
      const gridRadius = (radius / 5) * i;
      circles.push(
        <Circle
          key={`grid-circle-${i}`}
          cx={centerX}
          cy={centerY}
          r={gridRadius}
          fill="none"
          stroke={palette.borderLight}
          strokeWidth="1"
          strokeDasharray={i === 5 ? "0" : "2,2"}
          opacity={0.5}
        />
      );
    }

    // Render radial lines
    for (let i = 0; i < numSides; i++) {
      const angle = angleSlice * i - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      lines.push(
        <Line
          key={`grid-line-${i}`}
          x1={centerX}
          y1={centerY}
          x2={x}
          y2={y}
          stroke={palette.borderLight}
          strokeWidth="1"
          opacity={0.5}
        />
      );
    }

    return [...circles, ...lines];
  };

  // Render labels
  const renderLabels = () => {
    return labels.map((label, index) => {
      const angle = angleSlice * index - Math.PI / 2;
      const labelRadius = radius + 30;
      const x = centerX + labelRadius * Math.cos(angle);
      const y = centerY + labelRadius * Math.sin(angle);
      const value = values[index];

      return (
        <G key={`label-${index}`}>
          <SvgText
            x={x}
            y={y - 10}
            fill={palette.textSecondary}
            fontSize="11"
            fontFamily={Theme.typography.fonts.regular}
            textAnchor="middle"
          >
            {label.label.split('\n').map((line, i) => (
              <SvgText
                key={i}
                x={x}
                y={y - 10 + i * 12}
                textAnchor="middle"
              >
                {line}
              </SvgText>
            ))}
          </SvgText>
          <SvgText
            x={x}
            y={y + 15}
            fill={getScoreColor(value)}
            fontSize="13"
            fontFamily={Theme.typography.fonts.semibold}
            textAnchor="middle"
          >
            {Math.round(value)}%
          </SvgText>
        </G>
      );
    });
  };

  // Render data points
  const renderDataPoints = () => {
    return points.map((point, index) => {
      const value = values[index];
      const color = getScoreColor(value);

      return (
        <Circle
          key={`point-${index}`}
          cx={point.x}
          cy={point.y}
          r="5"
          fill={color}
          stroke="#FFFFFF"
          strokeWidth="2"
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={styles.svg}>
        <G>
          {renderGridLines()}

          {/* Data polygon */}
          <Path
            d={pathData}
            fill={scoreColor}
            fillOpacity="0.2"
            stroke={scoreColor}
            strokeWidth="2"
          />

          {/* Data points */}
          {renderDataPoints()}

          {/* Labels */}
          {renderLabels()}

          {/* Center score */}
          <Circle
            cx={centerX}
            cy={centerY}
            r="30"
            fill={palette.background}
            stroke={scoreColor}
            strokeWidth="2"
          />
          <SvgText
            x={centerX}
            y={centerY - 5}
            fill={scoreColor}
            fontSize="20"
            fontFamily={Theme.typography.fonts.bold}
            textAnchor="middle"
          >
            {avgScore}
          </SvgText>
          <SvgText
            x={centerX}
            y={centerY + 10}
            fill={palette.textTertiary}
            fontSize="10"
            fontFamily={Theme.typography.fonts.regular}
            textAnchor="middle"
          >
            AVG
          </SvgText>
        </G>
      </Svg>

      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
        <Text style={styles.legendText}>Excellent (80+)</Text>
        <View style={[styles.legendDot, { backgroundColor: '#06b6d4' }]} />
        <Text style={styles.legendText}>Good (60-79)</Text>
        <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
        <Text style={styles.legendText}>Needs Work (40-59)</Text>
      </View>
    </View>
  );
};

const createStyles = (palette: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 16,
      backgroundColor: palette.background,
      borderRadius: 16,
      marginHorizontal: 16,
    },
    svg: {
      backgroundColor: 'transparent',
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      paddingHorizontal: 20,
      flexWrap: 'wrap',
      gap: 12,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: Theme.typography.sizes.xs,
      fontFamily: Theme.typography.fonts.regular,
      color: palette.textTertiary,
      marginRight: 8,
    },
  });