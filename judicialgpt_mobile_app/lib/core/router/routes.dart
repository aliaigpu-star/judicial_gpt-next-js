/// Route paths, mirroring the website's URLs.
abstract final class Routes {
  static const splash = '/';
  static const login = '/login';
  static const chat = '/chat';
  static const judgmentSearch = '/chat/judgment-search';
  static const civilJudgment = '/chat/civil-judgment';
  static const criminalJudgment = '/chat/criminal-judgment';
  static const civilLaw = '/chat/civil-law';
  static const criminalLaw = '/chat/criminal-law';
  static const familyLaw = '/chat/family-law';
  static const summarize = '/chat/summarize';
  static const voiceAgent = '/voice';
  static const settings = '/settings';

  static String conversation(String id) => '/chat/$id';
  static String settingsSection(String section) => '/settings/$section';
}
