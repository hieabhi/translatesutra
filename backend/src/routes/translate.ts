import { Router, Request, Response } from 'express';
import { translateTextWithGoogle, POPULAR_LANGUAGES, TranslationRequest, detectLanguage } from '../services/translate';

const router = Router();

/**
 * POST /api/translate
 * Translate text from one language to another
 */
router.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, from, to } = req.body as TranslationRequest;

    if (!text || text.trim().length === 0) {
      res.status(400).json({
        error: 'MISSING_TEXT',
        message: 'Text is required for translation'
      });
      return;
    }

    if (!to) {
      res.status(400).json({
        error: 'MISSING_TARGET_LANGUAGE',
        message: 'Target language is required'
      });
      return;
    }

    // Limit text length
    if (text.length > 5000) {
      res.status(400).json({
        error: 'TEXT_TOO_LONG',
        message: 'Text cannot exceed 5000 characters'
      });
      return;
    }

    const result = await translateTextWithGoogle({
      text: text.trim(),
      from: from || 'auto',
      to: to
    });

    res.json(result);
  } catch (error) {
    console.error('Translation API error:', error);
    res.status(500).json({
      error: 'TRANSLATION_FAILED',
      message: (error as Error).message
    });
  }
});

/**
 * POST /api/detect
 * Detect language of text
 */
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      res.status(400).json({
        error: 'MISSING_TEXT',
        message: 'Text is required for language detection'
      });
      return;
    }

    // Limit text length for detection
    const textForDetection = text.trim().substring(0, 1000);
    
    const detectedLanguage = await detectLanguage(textForDetection);

    res.json({
      detectedLanguage,
      confidence: detectedLanguage === 'auto' ? 0 : 0.95
    });
  } catch (error) {
    console.error('Language detection error:', error);
    res.status(500).json({
      error: 'DETECTION_FAILED',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/languages
 * Get list of supported languages
 */
router.get('/languages', (req: Request, res: Response) => {
  res.json({
    popular: POPULAR_LANGUAGES,
    totalCount: POPULAR_LANGUAGES.length
  });
});

export { router as translateRouter };