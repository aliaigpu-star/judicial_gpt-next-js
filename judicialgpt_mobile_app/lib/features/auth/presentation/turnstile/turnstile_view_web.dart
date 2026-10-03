import 'dart:async';
import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'package:flutter/material.dart';
import 'package:web/web.dart' as web;

const _scriptUrl = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

@JS('turnstile')
external _Turnstile? get _turnstile;

extension type _Turnstile._(JSObject _) implements JSObject {
  external JSString? render(web.HTMLElement container, JSObject options);
  external void remove(JSString widgetId);
}

Future<void>? _scriptLoading;

/// Loads the Turnstile script into the page once.
Future<void> _loadScript() => _scriptLoading ??= () {
  final loaded = Completer<void>();
  final script = web.HTMLScriptElement()
    ..src = _scriptUrl
    ..async = true;
  script
    ..onload = ((web.Event _) => loaded.complete()).toJS
    ..onerror = ((web.Event _) => loaded.completeError('Could not load Turnstile')).toJS;
  web.document.head!.append(script);
  return loaded.future;
}();

/// Renders Turnstile directly into the page's DOM (Flutter web).
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
  JSString? _widgetId;

  Future<void> _render(web.HTMLElement container) async {
    try {
      await _loadScript();
      // The platform view is attached to the DOM after it is created.
      while (!container.isConnected) {
        await Future<void>.delayed(const Duration(milliseconds: 16));
        if (!mounted) return;
      }

      final options = JSObject()
        ..setProperty('sitekey'.toJS, widget.siteKey.toJS)
        ..setProperty('callback'.toJS, ((JSString token) => widget.onToken(token.toDart)).toJS)
        ..setProperty(
          'error-callback'.toJS,
          ((JSAny? code) {
            widget.onError(code?.dartify()?.toString() ?? 'unknown');
            return true.toJS;
          }).toJS,
        )
        ..setProperty('timeout-callback'.toJS, (() => widget.onError('timeout')).toJS);
      _widgetId = _turnstile?.render(container, options);
      if (_widgetId == null) widget.onError('render-failed');
    } catch (_) {
      if (mounted) widget.onError('script-load-failed');
    }
  }

  @override
  void dispose() {
    final id = _widgetId;
    if (id != null) _turnstile?.remove(id);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      HtmlElementView.fromTagName(tagName: 'div', onElementCreated: (element) => _render(element as web.HTMLElement));
}
