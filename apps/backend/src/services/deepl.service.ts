import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http.js';
import { UsageStatsManager } from '../lib/usage.js';
import { getDailyTranslationPlanData, getSubscriptionPlan } from './auth.service.js';

const ErrorCodes = {
  UNAUTHORIZED: 'Unauthorized',
  DAILY_QUOTA_EXCEEDED: 'Daily Quota Exceeded',
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
};

const LANG_V2_V1_MAP: Record<string, string> = {
  'ZH-HANS': 'ZH',
  'ZH-HANT': 'ZH-TW',
};

const getDeepLAPIKey = (keys: string | undefined) => {
  const keyArray = keys?.split(',').filter(Boolean) ?? [];
  return keyArray.length ? keyArray[Math.floor(Math.random() * keyArray.length)]! : '';
};

const generateCacheKey = (text: string, sourceLang: string, targetLang: string): string => {
  const inputString = `${sourceLang}:${targetLang}:${text}`;
  const hash = crypto.createHash('sha1').update(inputString).digest('hex');
  return `tr:${hash}`;
};

const translationCache = new Map<string, string>();

const checkDailyUsage = async (userId: string, token: string, chars: number) => {
  const { quota } = getDailyTranslationPlanData(token);
  const dailyUsage = await UsageStatsManager.getCurrentUsage(userId, 'translation_chars', 'daily');
  if (quota <= dailyUsage + chars) {
    throw new Error(ErrorCodes.DAILY_QUOTA_EXCEEDED);
  }
};

const updateDailyUsage = async (userId: string, token: string, incrementUsage: number) => {
  const userPlan = getSubscriptionPlan(token);
  return await UsageStatsManager.trackUsage(userId, 'translation_chars', incrementUsage, {
    plan_type: userPlan,
    source: 'deepl_api',
  });
};

const callDeepLAPI = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  apiUrl: string,
  authKey: string,
  useCache: boolean,
) => {
  const cacheKey = generateCacheKey(text, sourceLang, targetLang);
  if (useCache && translationCache.has(cacheKey)) {
    return {
      text: translationCache.get(cacheKey) || '',
      daily_usage: 0,
      detected_source_language: sourceLang,
    };
  }

  const isV2Api = apiUrl.endsWith('/v2/translate');
  const input = text.replaceAll('\n', '').trim();
  const requestBody: {
    text: string | string[];
    target_lang: string;
    source_lang?: string;
  } = {
    text: isV2Api ? [input] : input,
    source_lang: isV2Api ? sourceLang : (LANG_V2_V1_MAP[sourceLang] ?? sourceLang),
    target_lang: isV2Api ? targetLang : (LANG_V2_V1_MAP[targetLang] ?? targetLang),
  };

  if (isV2Api && requestBody.source_lang?.toUpperCase() === 'AUTO') {
    delete requestBody.source_lang;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${authKey}`,
      'x-fingerprint': env.deeplFingerprint,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepL API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    translations?: { text: string; detected_source_language?: string }[];
    data?: string;
  };

  let translatedText = '';
  let detectedSourceLanguage = '';
  if (data.translations?.length) {
    translatedText = data.translations[0]!.text;
    detectedSourceLanguage = data.translations[0]!.detected_source_language || '';
  } else if (data.data) {
    translatedText = data.data;
  }

  if (useCache && translatedText) {
    translationCache.set(cacheKey, translatedText);
  }

  return {
    text: translatedText,
    daily_usage: 0,
    detected_source_language: detectedSourceLanguage,
  };
};

export const translateWithDeepL = async (params: {
  userId: string;
  token: string;
  text: string[];
  sourceLang?: string;
  targetLang?: string;
  useCache?: boolean;
}) => {
  const { userId, token, text, sourceLang = 'AUTO', targetLang = 'EN', useCache = false } = params;
  if (!userId || !token) {
    throw new HttpError(401, ErrorCodes.UNAUTHORIZED);
  }

  let deeplApiUrl = env.deeplFreeApi;
  const userPlan = getSubscriptionPlan(token);
  if (userPlan === 'pro') deeplApiUrl = env.deeplProApi;
  const deeplAuthKey =
    deeplApiUrl === env.deeplProApi
      ? getDeepLAPIKey(env.deeplProApiKeys)
      : getDeepLAPIKey(env.deeplFreeApiKeys);

  try {
    const translations = await Promise.all(
      text.map(async (singleText) => {
        if (!singleText?.trim()) {
          return { text: '', daily_usage: 0 };
        }
        await checkDailyUsage(userId, token, singleText.length);
        return await callDeepLAPI(
          singleText,
          sourceLang,
          targetLang,
          deeplApiUrl,
          deeplAuthKey,
          useCache,
        );
      }),
    );

    const originalCharsCount = text.reduce((a, b) => a + b.length, 0);
    const translatedCharsCount = translations.reduce((a, b) => a + (b?.text.length || 0), 0);
    const newDailyUsage = await updateDailyUsage(
      userId,
      token,
      originalCharsCount + translatedCharsCount,
    );
    translations.forEach((translation) => {
      if (translation?.text) {
        translation.daily_usage = newDailyUsage;
      }
    });

    return { translations };
  } catch (error) {
    if (error instanceof Error && error.message.includes(ErrorCodes.DAILY_QUOTA_EXCEEDED)) {
      throw new HttpError(429, ErrorCodes.DAILY_QUOTA_EXCEEDED);
    }
    throw new HttpError(500, ErrorCodes.INTERNAL_SERVER_ERROR);
  }
};
