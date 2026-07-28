# Security Analysis: Admin Routes

## 1. File Role
**Role:** Backend Route Handler (`admin.js`)
**Location:** `backend/src/routes/admin.js`
**Responsibility:** Privileged management of Users, Conversations, Activity Logs, and System Settings.

## 2. Inbound Data Sources
- **User Input:**
  - `req.body`: User creation details, Setting updates (SMTP credentials).
  - `req.query`: Pagination limits, offsets, search queries.
- **Trusted Source:** `req.user` (from JWT middleware).

## 3. Data Flow & Transformation
1.  **Read Operations (Dashboard, Users, Logs):**
    - `req.query` -> Parameterized SQL -> JSON Response.
2.  **Write Operations (User Create/Update, Settings):**
    - `req.body` -> Validation (field checks) -> Parameterized `UPDATE/INSERT` -> `ActivityLogger`.

## 4. Security-Sensitive Sinks
| Sink | Line | Risk Context |
| :--- | :--- | :--- |
| `query(...)` | Multiple | Direct SQL execution. |
| `User.create`, `UserProfile.update` | Multiple | Model calls. |
| `ActivityLogger.log` | Multiple | Logging actions. |
| `console.log` | 681 | logging SMTP updates. |

## 5. Trust Boundary Analysis
- **Authorization (High Confidence):**
  - All routes protected by `authenticate` AND `requireAdmin`.
  - **Status:** **Secure.**
- **SQL Injection (High Confidence):**
  - Dynamic queries (e.g., search, filters) use parameter arrays (`$1`, `$2`) and manual index tracking (`paramIndex`).
  - **Status:** **Secure.** No string concatenation for values.
- **Sensitive Data Handling:**
  - **SMTP Password:**
    - On GET /settings: Masked with `••••••••` (Line 654).
    - On PUT /settings: Masked in input logging (Line 687).
    - **Status:** **Secure.**
- **Logging:**
  - `ActivityLogger` captures `email`, `title`. Sensitive but necessary for audit trails.
  - **SMTP Logging:** The code actively avoids logging the full SMTP password.

## 6. Findings & Recommendations
- **Risk Level:** **Low**
- **Observations:**
  1.  **Access Control:** Correctly restricted to admins.
  2.  **Input Sanitation:** Search queries require minimum length (Line 596).
  3.  **Dynamic Query Construction:** The pattern used for `PUT /settings` and filtered `GET /logs` is robust against injection (using `paramIndex` and `params` array).
- **Action Items:** None.

## 7. Confidence Score
**High**. The code is defensive and handles sensitive configuration data responsibly.
