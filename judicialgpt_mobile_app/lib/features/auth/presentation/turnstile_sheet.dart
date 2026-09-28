import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../core/config/app_config.dart';

/// Shows Cloudflare Turnstile and resolves with a verification token, or
/// `null` if the user dismissed it or the check failed.
///
/// The widget is loaded with the website's origin as its base URL so the
/// site key's hostname restriction is satisfied.
Future<String?> requestCaptchaToken(BuildContext context) => showModalBottomSheet<String>(
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  builder: (_) => const _TurnstileSheet(),
);

class _TurnstileSheet extends StatefulWidget {
  const _TurnstileSheet();

  @override
  State<_TurnstileSheet> createState() => _TurnstileSheetState();
}

class _TurnstileSheetState extends State<_TurnstileSheet> {
  static const _failed = '__turnstile_error__';

  late final WebViewController _controller;
  bool _failedToVerify = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..addJavaScriptChannel('TurnstileChannel', onMessageReceived: _onMessage)
      ..loadHtmlString(_html, baseUrl: AppConfig.baseUrl);
  }

  void _onMessage(JavaScriptMessage message) {
    if (!mounted) return;
    if (message.message == _failed) {
      setState(() => _failedToVerify = true);
      return;
    }
    Navigator.of(context).pop(message.message);
  }

  String get _html =>
      '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad" async defer></script>
  <style>
    html, body { margin: 0; height: 100%; background: transparent; }
    body { display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div id="widget"></div>
  <script>
    function onTurnstileLoad() {
      turnstile.render('#widget', {
        sitekey: '${AppConfig.turnstileSiteKey}',
        callback: function (token) { TurnstileChannel.postMessage(token); },
        'error-callback': function () { TurnstileChannel.postMessage('$_failed'); },
      });
    }
  </script>
</body>
</html>
''';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Security check', style: theme.textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              _failedToVerify
                  ? 'Verification failed. Close this and try again.'
                  : 'Please confirm you are human to continue.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: _failedToVerify ? theme.colorScheme.error : theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(height: 90, child: WebViewWidget(controller: _controller)),
          ],
        ),
      ),
    );
  }
}
