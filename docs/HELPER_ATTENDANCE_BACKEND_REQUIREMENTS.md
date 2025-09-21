# Helper Attendance Backend Requirements

## Overview
This document outlines the backend changes required to support the new Helper Checkups feature in the End of Day Report wizard.

## Database Schema Changes

### 1. New Table: `helper_attendance`
Create a new table to store individual helper attendance records:

```sql
CREATE TABLE helper_attendance (
  id SERIAL PRIMARY KEY,
  end_of_day_report_id INTEGER NOT NULL REFERENCES end_of_day_reports(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('on_time', 'late', 'no_show')),
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_helper_attendance_report_id ON helper_attendance(end_of_day_report_id);
```

### 2. Migration Notes
- The existing `helper_names` field in `end_of_day_reports` table should be kept for backward compatibility
- When helper_attendance records exist, they should take precedence over the helper_names field
- The helper_names field will still be populated with all helper names for backward compatibility

## API Endpoint Changes

### 1. POST /api/end-of-day-reports
**Current payload structure needs to support:**

```json
{
  // ... existing fields ...
  "helper_names": "John Doe, Jane Smith", // Still supported for backward compatibility
  "helper_attendance": [
    {
      "name": "John Doe",
      "status": "on_time",
      "message": null
    },
    {
      "name": "Jane Smith",
      "status": "late",
      "message": "Traffic delay, arrived 15 minutes late"
    }
  ]
}
```

**Backend logic:**
1. If `helper_attendance` is provided:
   - Create entries in the `helper_attendance` table
   - Auto-populate `helper_names` field with comma-separated list of all helper names
2. If only `helper_names` is provided (backward compatibility):
   - Store in the existing field as before
   - No `helper_attendance` records created

### 2. GET /api/end-of-day-reports/:id
**Response should include:**

```json
{
  // ... existing fields ...
  "helper_names": "John Doe, Jane Smith",
  "helper_attendance": [
    {
      "id": 1,
      "name": "John Doe",
      "status": "on_time",
      "message": null
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "status": "late",
      "message": "Traffic delay, arrived 15 minutes late"
    }
  ]
}
```

### 3. PUT /api/end-of-day-reports/:id
- Support updating helper_attendance array
- Handle adding/removing/updating individual helper attendance records
- Maintain sync with helper_names field

### 4. GET /api/end-of-day-reports (List endpoint)
- Include helper_attendance in the response (optional - can be excluded for performance)
- Consider adding a query parameter to include/exclude helper_attendance details

## Validation Rules

### Backend Validation
1. **Name validation:**
   - Required field
   - Max length: 255 characters
   - Trim whitespace

2. **Status validation:**
   - Must be one of: 'on_time', 'late', 'no_show'
   - Required field

3. **Message validation:**
   - Optional field
   - Max length: 500 characters
   - Only relevant when status is 'late' or 'no_show'

## Reporting Considerations

### Analytics Endpoints (Future Enhancement)
Consider adding endpoints for helper attendance analytics:

1. **GET /api/helpers/attendance-summary**
   - Track helper reliability over time
   - Parameters: `date_from`, `date_to`, `club_id`, `helper_name`
   - Returns attendance statistics per helper

2. **GET /api/helpers/list**
   - Get list of all unique helpers
   - Useful for autocomplete in future iterations

## Migration Strategy

1. **Phase 1: Add new functionality**
   - Deploy database changes
   - Update API to support both old and new formats
   - Mobile app sends both formats for compatibility

2. **Phase 2: Data migration**
   - Parse existing `helper_names` fields
   - Create retroactive `helper_attendance` records with default status 'on_time'
   - This is optional and can be done if historical data needs to be analyzed

3. **Phase 3: Deprecation (Future)**
   - Eventually phase out reliance on `helper_names` field
   - Keep field for historical reference only

## Error Handling

### API Error Responses
```json
{
  "error": "Validation failed",
  "details": {
    "helper_attendance[0].name": ["Name is required"],
    "helper_attendance[1].status": ["Invalid status value"]
  }
}
```

## Performance Considerations

1. **Bulk Operations:**
   - Use bulk insert for helper_attendance records
   - Avoid N+1 queries when fetching reports with attendance

2. **Indexing:**
   - Index on `end_of_day_report_id` for fast lookups
   - Consider composite index on `(name, created_at)` for analytics queries

## Security Considerations

1. **Authorization:**
   - Only the coach who created the report can modify helper attendance
   - Admins can view but not modify

2. **Data Privacy:**
   - Helper names should be treated as PII
   - Consider data retention policies

## Testing Requirements

### Unit Tests
1. Test validation rules for helper attendance
2. Test backward compatibility with helper_names field
3. Test data transformation between formats

### Integration Tests
1. Test complete CRUD operations for reports with helper attendance
2. Test migration scenarios
3. Test error handling

## Future Enhancements

1. **Helper Management:**
   - Create a dedicated helpers table with profiles
   - Link attendance records to helper profiles
   - Track contact information and availability

2. **Notifications:**
   - Send notifications to helpers about their attendance status
   - Alert admins about frequent no-shows

3. **Predictive Features:**
   - Suggest likely helpers based on historical data
   - Pre-populate helper list based on club and day of week

4. **Reporting Dashboard:**
   - Visual attendance trends
   - Helper reliability scores
   - Club-level helper analytics

## Implementation Priority

1. **Must Have (MVP):**
   - Database schema changes
   - Basic CRUD operations
   - Backward compatibility

2. **Should Have:**
   - Validation rules
   - Error handling
   - Basic analytics endpoint

3. **Nice to Have:**
   - Helper profiles
   - Advanced analytics
   - Notifications

## Contact

For questions about this specification, please contact the mobile development team.