import translate from 'google-translate-api-x';

export interface TranslationRequest {
  text: string;
  from?: string; // auto-detect if not provided
  to: string;
}

export interface TranslationResponse {
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  targetLanguage: string;
  service: string;
}

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
}

// Popular languages for the dropdown
export const POPULAR_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文 (简体)' },
  { code: 'zh-tw', name: 'Chinese (Traditional)', nativeName: '中文 (繁體)' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' }
];

/**
 * Translate text using Google Translate
 */
export async function translateTextWithGoogle(request: TranslationRequest): Promise<TranslationResponse> {
  try {
    const result = await translate(request.text, {
      from: request.from || 'auto',
      to: request.to
    });

    return {
      originalText: request.text,
      translatedText: result.text,
      detectedLanguage: result.from?.language?.iso || request.from || 'auto',
      targetLanguage: request.to,
      service: 'google-translate'
    };
  } catch (error) {
    console.error('Google Translate error:', error);
    throw new Error('Translation failed: ' + (error as Error).message);
  }
}

/**
 * Detect language of text using Google Translate
 */
export async function detectLanguage(text: string): Promise<string> {
  try {
    const result = await translate(text, { from: 'auto', to: 'en' });
    return result.from?.language?.iso || 'auto';
  } catch (error) {
    console.error('Language detection error:', error);
    return 'auto';
  }
}

/**
 * Get language name from language code
 */
export function getLanguageName(code: string): string {
  const lang = POPULAR_LANGUAGES.find(l => l.code === code);
  return lang ? lang.name : code.toUpperCase();
}

/**
 * Get language info from code
 */
export function getLanguageInfo(code: string): LanguageInfo | null {
  return POPULAR_LANGUAGES.find(l => l.code === code) || null;
}