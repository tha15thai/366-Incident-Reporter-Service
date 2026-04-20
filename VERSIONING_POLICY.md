# Versioning & Breaking Change Policy

## API Versioning

All REST API endpoints use path-based versioning:
- Current version: `/v1/incidents`
- Future versions: `/v2/incidents` (when needed)

## Event Versioning

All async events include version in message attributes:
```json
{
  "version": "v1",
  "eventType": "IncidentCreated"
}
```

## Breaking Changes

A breaking change is any modification that requires consumers to update their code:

### Breaking Changes (require new version):
- ❌ Removing fields from response
- ❌ Renaming fields
- ❌ Changing field data types
- ❌ Removing endpoints
- ❌ Making optional fields required
- ❌ Changing error response structure

### Non-Breaking Changes (safe to deploy):
- ✅ Adding new optional fields to response
- ✅ Adding new endpoints
- ✅ Adding optional query parameters
- ✅ Adding new error codes (keeping old ones)

## Deprecation Process

When introducing breaking changes:

1. **Announcement:** 30 days advance notice via:
   - Email to all registered consumers
   - `X-Deprecation-Notice` header in responses
   - Update in API documentation

2. **Dual Support:** Run both versions for 60 days minimum

3. **Migration Period:** Consumers have 60 days to migrate

4. **Sunset:** Old version removed after 90 days total

Example timeline:
- Day 0: Announce v2, deploy alongside v1
- Day 30: Reminder email to consumers still on v1
- Day 60: Final warning
- Day 90: Remove v1

## Version Support Commitment

- **Current version (v1):** Fully supported
- **Previous version:** 90 days after new version release
- **Older versions:** Not supported

## Contact for Breaking Changes

Before making any breaking change:
- Email: thawan@example.com
- Slack: #incident-reporter-service
- Required: 30 days notice minimum