/// Environment-level configuration.
///
/// Every value can be overridden at build time with `--dart-define`, e.g.
/// `flutter run --dart-define=TURNSTILE_SITE_KEY=0x4AAA...`.
abstract final class AppConfig {
  /// Public origin of the website. The backend API is served under `/api`,
  /// exactly as the web frontend reaches it.
  static const String baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'https://judicialgpt.org');

  /// The Family Law agent has no route on the backend's authenticated agent
  /// proxy, so (like the web frontend's own fallback) it is called directly.
  static const String familyLawAgentUrl = String.fromEnvironment(
    'FAMILY_LAW_AGENT_URL',
    defaultValue: 'https://familylawagent-judicial-gpt.in.ngrok.io',
  );

  /// Public Cloudflare Turnstile site key used by the website's login/signup
  /// forms. Pass an empty value when the backend runs without captcha.
  static const String turnstileSiteKey = String.fromEnvironment(
    'TURNSTILE_SITE_KEY',
    defaultValue: '0x4AAAAAAEl5AqDmNrNOn94t',
  );

  static bool get captchaEnabled => turnstileSiteKey.isNotEmpty;

  /// URL scheme the backend returns to after Google sign-in
  /// (`judicialgpt://auth/callback`); registered in AndroidManifest.xml.
  static const String authCallbackScheme = 'judicialgpt';

  static const Duration requestTimeout = Duration(seconds: 90);
}
