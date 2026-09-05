# Error Handling

Standard error format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

Includes:
- Validation errors
- Authentication errors
- Authorization errors
- Not found
- Conflict
- Business rule violation
- Payroll computation error
- Internal server error
