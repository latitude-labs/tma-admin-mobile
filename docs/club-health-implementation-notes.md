# Club Health Feature - Frontend Implementation Guide

## Overview
A comprehensive club health tracking system has been implemented on the backend to monitor and grade clubs based on multiple performance factors. This document outlines what the frontend team needs to know for implementation.

## New API Endpoints

### 1. Get All Club Health Scores
**Endpoint:** `GET /api/clubs/health`

**Parameters:**
- `date_range` (optional): `today`, `yesterday`, `last_7_days`, `last_30_days`, `last_3_months`
- `status` (optional): Filter by `critical`, `poor`, `needs_attention`, `good`, `excellent`
- `latest_only` (optional, default: `true`): Return only latest scores

**Response includes:**
- List of clubs sorted by score (lowest first - clubs needing attention)
- Overall health score (0-100)
- Health status category
- Individual metric scores (6 categories)
- Key issues with severity levels
- AI-generated summaries
- Summary statistics (averages, counts by status)

### 2. Get Single Club Health Score
**Endpoint:** `GET /api/clubs/health/{clubId}`

**Parameters:**
- `date_range` (optional): Time period for calculation
- `recalculate` (optional): Force fresh calculation

**Response includes:**
- Detailed health metrics
- Individual scores for each category
- Key issues array with severity
- Metrics snapshot (bookings, enrollment rates, etc.)
- Advertising metrics (cost per booking, ROAS)
- AI summary (if available)

### 3. Get Club Health Trend
**Endpoint:** `GET /api/clubs/health/{clubId}/trend`

**Parameters:**
- `period` (optional): `7_days`, `30_days`, `3_months`

**Response includes:**
- Historical trend points with dates
- Individual metric scores over time
- Summary statistics (start/end scores, improvement)

## Key Data Structures

### Health Score Object
```json
{
  "club_id": 1,
  "club_name": "Stafford",
  "overall_score": 65,
  "health_status": "good", // critical|poor|needs_attention|good|excellent
  "individual_scores": {
    "booking_efficiency": 75,      // Cost per booking score
    "show_up_rate": 80,           // Attendance score
    "enrollment_conversion": 60,   // Conversion to membership
    "revenue_health": 70,          // ROAS score
    "growth_trajectory": 65,      // Growth trend score
    "retention_quality": 55       // Student retention score
  },
  "key_issues": [
    {
      "type": "high_acquisition_cost",
      "severity": "warning", // warning|critical
      "message": "Cost per booking is £15.50, which is above acceptable levels",
      "metric": "cost_per_booking",
      "value": 15.50
    }
  ],
  "ai_summary": "• Primary concern: High no-show rate of 35% impacting class efficiency. • Positive: Strong enrollment conversion at 68%. • Recommendation: Implement SMS reminders 2 hours before class.",
  "calculated_at": "2024-09-27T12:00:00Z"
}
```

## UI/UX Recommendations

### 1. Dashboard Overview
- **Health Score Badge**: Display overall score with color coding
  - 80-100: Green (Excellent)
  - 60-79: Blue (Good)
  - 40-59: Amber (Needs Attention)
  - 20-39: Purple (Poor)
  - 0-19: Red (Critical)

### 2. Club List View
- Sort by score (lowest first) to prioritize attention
- Show key metric that needs most attention
- Use visual indicators (icons/colors) for health status
- Display "calculated X hours ago" for freshness

### 3. Individual Club View
- **Score Breakdown**: Spider/radar chart for 6 metrics
- **Issues Section**: List issues with severity badges
- **Trend Graph**: Line chart showing score over time
- **AI Summary**: Formatted bullet points
- **Action Button**: "Recalculate Now" to refresh data

### 4. Filtering & Sorting
- Filter by health status
- Date range selector
- Option to show historical vs latest only
- Export functionality for reports

## Color Schemes

### Health Status Colors
- **Critical**: `#ef4444` (red-500)
- **Poor**: `#a855f7` (purple-500)
- **Needs Attention**: `#f59e0b` (amber-500)
- **Good**: `#06b6d4` (cyan-500)
- **Excellent**: `#10b981` (emerald-500)

### Severity Indicators
- **Critical Issues**: Red background with white text
- **Warning Issues**: Amber background with dark text

## Real-time Updates
- Health scores are calculated daily at 12:00 PM automatically
- Manual recalculation available via API
- Consider polling `/api/clubs/health` every 5-10 minutes for dashboard
- Show loading states during recalculation

## Key Features to Implement

1. **Comparison View**: Compare multiple clubs side-by-side
2. **Alerts**: Notify when clubs drop below threshold
3. **Historical Analysis**: Show improvement/decline over periods
4. **Export Reports**: PDF/CSV export of health reports
5. **Mobile Responsive**: Ensure works on tablets for field managers

## Error Handling

- Handle 404 for non-existent clubs
- Show appropriate messages when no data available
- Provide fallback UI when AI summaries fail
- Cache responses to reduce API calls

## Backend Automation

- Health scores are automatically calculated daily at midday
- Historical data is preserved for trend analysis
- AI summaries are generated during scheduled calculations
- Manual recalculation is available through the API

## Testing Recommendations

1. Test with clubs having various health scores
2. Verify sorting (worst clubs appear first)
3. Test date range filters
4. Verify real-time recalculation