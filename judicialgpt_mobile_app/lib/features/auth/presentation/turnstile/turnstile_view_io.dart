import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../../core/config/app_config.dart';

/// Renders Turnstile inside a WebView. The page is loaded with the website's
/// origin as its base URL so the site key's hostname restriction is satisfied.
class TurnstileView extends StatefulWidget {
  const TurnstileView({super.key, required this.siteKey, required this.onToken, required this.onError});

  final String siteKey;
  final ValueChanged<String> onToken;

  /// Called with a short reason: a Turnstile error code, or a network failure.
  final ValueChanged<String> onError;

  @override
  State<TurnstileView> createState() => _TurnstileViewState();
}

class _TurnstileViewState extends State<TurnstileView> {
  static const _failed = '__turnstile_error__:';

  late final WebViewController _controller = WebViewController()
    ..setJavaScriptMode(JavaScriptMode.unrestricted)
    ..setBackgroundColor(Colors.transparent)
    ..addJavaScriptChannel('TurnstileChannel', onMessageReceived: _onMessage)
    ..loadHtmlString(_html, baseUrl: AppConfig.baseUrl);

  void _onMessage(JavaScriptMessage message) {
    final text = message.message;
    if (text.startsWith(_failed)) {
      widget.onError(text.substring(_failed.length));
    } else {
      widget.onToken(text);
    }
  }

  String get _html =>
      '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad" async defer
    onerror="TurnstileChannel.postMessage('${_failed}script-load-failed')"></script>
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
        sitekey: '${widget.siteKey}',
        callback: function (token) { TurnstileChannel.postMessage(token); },
        'error-callback': function (code) { TurnstileChannel.postMessage('$_failed' + code); return true; },
        'timeout-callback': function () { TurnstileChannel.postMessage('${_failed}timeout'); },
      });
    }
  </script>
</body>
</html>
''';

  @override
  Widget build(BuildContext context) => WebViewWidget(controller: _controller);
}
