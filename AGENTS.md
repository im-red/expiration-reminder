# AI Agent Guidelines

## UI Design Guidelines

Always reference .agents/specs/ionic/IONIC_PROJECT_GUIDE.md before generating any UI or CSS.

## Test Development Guidelines

Always reference .agents/specs/tests/TEST_DEVELOPMENT_GUIDE.md before developing, troubleshooting, or fixing tests.

## Testing After File Edits

After editing any source files, always run the relevant tests to verify the changes:

1. **Run related test files**: Identify and run test files that cover the modified functionality
2. **Run all tests if uncertain**: If unsure which tests are related, run all tests to ensure no regressions
3. **Fix failing tests**: If tests fail, fix the issues before considering the task complete

### Workflow

1. Edit source file(s)
2. Run relevant tests
3. If tests fail, analyze the logs and fix the issues
4. Re-run tests until all pass

## Logging During Development

Logs with appropriate detail should be added during development to facilitate debugging and monitoring:

1. **Log important operations**: Add logs for key operations like initialization, data loading, sync operations, and error handling
2. **Use appropriate log levels**:
   - `console.error` for errors and exceptions
   - `console.warn` for warnings and potential issues
   - `console.info` for important state changes and operations
   - `console.debug` for detailed debugging information (development only)
3. **Include context**: Log messages should include relevant context like IDs, timestamps, and operation names
4. **Avoid sensitive data**: Never log passwords, tokens, or personal user data
5. **Clean up**: Remove or disable debug logs before production deployment

### Example

```typescript
console.info('[SyncEngine] Initializing with backend:', backendName);
console.debug('[SyncEngine] Sync started at:', new Date().toISOString());
console.warn('[SyncEngine] Retry attempt:', retryCount);
console.error('[SyncEngine] Sync failed:', error.message);
```
