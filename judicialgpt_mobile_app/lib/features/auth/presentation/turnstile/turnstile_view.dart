/// Platform-specific Cloudflare Turnstile widget: a WebView on mobile and
/// desktop, a native DOM element on the web.
library;

export 'turnstile_view_io.dart' if (dart.library.js_interop) 'turnstile_view_web.dart';
