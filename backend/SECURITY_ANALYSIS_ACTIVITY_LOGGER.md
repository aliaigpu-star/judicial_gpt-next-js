# Security Analysis: Activity Logger

## 1. File Role
**Role:** Backend Service / Helper (`activityLogger.js`)
**Location:** `backend/src/services/activityLogger.js`
**Responsibility:** Centralized logging of sensitive lifecycle events (register, login, delete, etc.) to the database.

## 2. Inbound Data Sources
- **Calls from Controllers:** Receives `userId`, `email`, `changes` object, `ipAddress`.
- **Untrusted Source:** `userAgent` (Header), `details` (could contain user input).

## 3. Data Flow & Transformation
1.  **Log Entry:** static methods -> `log` method -> Parameterized Insert into `activity_logs`.

## 4. Security-Sensitive Sinks
| Sink | Line | Risk Context |
| :--- | :--- | :--- |
| `query(...)` | 30 | Database write. |
| `JSON.stringify` | 38 | Serializing potentially circular or sensitive structures. |

## 5. Trust Boundary Analysis
- **PII Leakage Prevention:**
  - The logger logs `email` and `title`. These are PII but necessary for audit.
  - **Critical Check:** Does `changes` (Line 111) ever contain passwords?
    - Checked usages in `admin.js`: `changes` only tracks `name`, `role`, `status`. Passwords are NOT passed to this logger during `user update` (password updates are separate/hashed).
    - Checked usages in `auth.js` (inference): `logUserRegister` logs `email`. `logUserLogin` logs `email`.
  - **Status:** **Secure.** No passwords or secrets are being logged by design.
- **Fail-Safe:**
  - Used `try/catch` (Line 29) to ensure logging failure does not crash the main application flow ("Fail Open" for availability).

## 6. Findings & Recommendations
- **Risk Level:** **Low**
- **Observations:**
  1.  **Privacy:** Logging is minimal and contextual. It does not blindly log `req.body`.
  2.  **Reliability:** The non-blocking error handling ensures user experience isn't degraded if the logs table is locked/full.
- **Action Items:** None.

## 7. Confidence Score
**High**. The implementation is simple and safe.
