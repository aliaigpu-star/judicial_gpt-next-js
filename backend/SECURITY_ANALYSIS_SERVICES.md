# Security Analysis: Service Proxy Routes

## 1. File Role
**Role:** Backend Route Handler (`services.js`)
**Location:** `backend/src/routes/services.js`
**Responsibility:** Proxies file uploads and requests to external AI/Utility services (PDF reading, OCR, Transcription, Web Search).

## 2. Inbound Data Sources
- **User Input:**
  - File Uploads (`multipart/form-data`) -> `req.file`.
  - JSON Body (`req.body`) -> `query` for web search, `to/subject/text` for email.
- **Environment Variables:**
  - Service URLs (`PDF_READER_API_URL`, `OCR_API_URL`, etc.)
  - API Keys (`GROQ_API_KEY`).

## 3. Data Flow & Transformation
1.  **File Uploads:**
    - `multer` (MemoryStorage) -> `req.file.buffer` -> `FormData` -> External API `fetch`.
2.  **Web Search:**
    - `req.body.query` -> JSON Body -> External API `fetch`.

## 4. Security-Sensitive Sinks
| Sink | Line | Risk Context |
| :--- | :--- | :--- |
| `fetch(url, ...)` | Multiple | SSRF risk if URL or payload is controlled by user. Here, URLs are static from config. |
| `groq.audio.transcriptions` | 311 | Sending audio buffer to Groq API. |
| `nodemailer.createTransport` | 457 | Sending emails. Configuration is from env. |

## 5. Trust Boundary Analysis
- **File Size Limits:**
  - `multer` enforces a **10MB** limit globally for this router.
  - **Findings:**
    - Frontend enforces 5MB for documents, 10MB for images.
    - Backend allows 10MB for documents, technically bypassing the frontend 5MB "business rule," but acceptable for security (DoS prevention).
- **File Type Validation:**
  - `pdf-read`: **Present (Weak).** Checks `req.file.mimetype` against an allowlist. Mimetype is mostly based on the request header and is spoofable.
  - `ocr`: **MISSING.** No check on `req.file.mimetype` or magic numbers. Forwards any 10MB file to the external OCR service.
  - `transcribe`: **MISSING.** No check on `req.file.mimetype`. Forwards any audio file (or any file) to external Transcription service or Groq.

## 6. Findings & Recommendations
- **Risk Level:** **Medium** (Input Validation gaps)
- **Issue 1: Missing File Type Validation (OCR & Transcribe)**
  - **Description:** The `/ocr` and `/transcribe` endpoints do not validate the file type. An attacker could upload executable files or other malicious formats. While the server only forwards them to an external API, this wastes bandwidth, potentially costs money (API usage), and relies entirely on the external service's security.
  - **Recommendation:** Implement a strict allowlist (e.g., `image/png`, `image/jpeg` for OCR; `audio/webm`, `audio/mp3` for transcription) similar to `pdf-read`.
- **Issue 2: Weak Mime Type Check**
  - **Description:** `pdf-read` checks `req.file.mimetype`. This is header-based.
  - **Recommendation:** Use a library like `file-type` to inspect the buffer's magic numbers for true type verification.

## 7. Confidence Score
**High**. The code clearly lacks validation logic in the identified routes.
