// SECURITY NOTE: The VITE_OPENROUTER_API_KEY env var is exposed in the browser bundle.
// This is acceptable ONLY for internal admin demo. In production, proxy all LLM
// requests through your backend. Never expose API keys in production frontend code.
// Remove sensitive fields (passwords, tokens, cookies) from error payloads before sending.

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `You are an expert full-stack debugging assistant for a React/Vite frontend and FastAPI backend review-generation SaaS called "Inddig Media AI Review Assistant". Analyze the provided error JSON carefully. Identify the likely root cause, affected layer, severity, exact fix steps, files to inspect, and prevention strategy. Be practical, concise, and developer-focused. If the issue involves Google OAuth, Google Maps Places API, OpenRouter, CORS, environment variables, authentication, caching, rate limits, or API failures, explain the likely configuration problem and how to verify it.`;

const USER_PROMPT_TEMPLATE = (errorJson) => `Analyze this application error and return JSON only.

Error data:
${errorJson}

Return this exact JSON structure (no markdown, no explanation, JSON only):
{
  "summary": "one-sentence summary of the error",
  "rootCause": "detailed root cause explanation",
  "affectedLayer": "Frontend | Backend | Google OAuth | Google Maps API | OpenRouter | Database | Configuration",
  "severity": "Low | Medium | High | Critical",
  "fixSteps": ["step 1", "step 2", "step 3"],
  "filesToInspect": ["file path or module name"],
  "prevention": ["preventive measure 1", "preventive measure 2"],
  "similarityTags": ["tag1", "tag2"],
  "confidence": "High | Medium | Low"
}`;

// Fields that must never be sent to external AI services
const SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'key', 'cookie', 'authorization',
  'credential', 'jwt', 'session', 'bearer', 'apikey', 'api_key',
];

function sanitizeErrorData(errorData) {
  const safe = { ...errorData };

  // Remove fields that may contain PII or secrets
  delete safe.browser;
  delete safe.sessionId;
  delete safe.userEmail;
  delete safe.userId;

  // Sanitize request/response payloads
  const sanitizePayload = (payload) => {
    if (!payload || typeof payload !== 'string') return payload;
    try {
      const parsed = JSON.parse(payload);
      SENSITIVE_FIELDS.forEach(field => {
        Object.keys(parsed).forEach(key => {
          if (key.toLowerCase().includes(field)) {
            parsed[key] = '[REDACTED]';
          }
        });
      });
      return JSON.stringify(parsed);
    } catch {
      // Replace any token-like strings in raw payload
      return payload.replace(/eyJ[A-Za-z0-9+/=]{20,}/g, '[JWT_REDACTED]');
    }
  };

  safe.requestPayload = sanitizePayload(safe.requestPayload);
  safe.responsePayload = sanitizePayload(safe.responsePayload);

  return safe;
}

export const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', description: 'Best for debugging and code reasoning' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', description: 'Cheaper fallback, fast responses' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5', description: 'Fast lightweight analysis' },
  { id: 'anthropic/claude-3-opus', label: 'Claude 3 Opus', description: 'Deep analysis, higher cost' },
];

export async function analyzeErrorWithLLM(errorData, options = {}) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      'VITE_OPENROUTER_API_KEY is not set. Add it to your frontend/.env file to enable AI analysis.'
    );
  }

  const model = options.model || 'anthropic/claude-3.5-sonnet';
  const fallbackModel = options.fallbackModel || null;
  const timeoutMs = options.timeoutMs || 30000;
  const maxRetries = options.maxRetries || 1;

  const safeErrorData = sanitizeErrorData(errorData);
  const errorJson = JSON.stringify(safeErrorData, null, 2);
  const userPrompt = USER_PROMPT_TEMPLATE(errorJson);

  let lastError = null;

  for (const currentModel of [model, fallbackModel].filter(Boolean)) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://inddigmedia.com',
            'X-Title': 'Inddig Media Admin Dashboard',
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
            max_tokens: 2000,
            temperature: 0.2,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const msg = errBody?.error?.message || `HTTP ${response.status}`;
          throw new Error(`OpenRouter API error (${currentModel}): ${msg}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content?.trim()) {
          throw new Error('Empty response from LLM');
        }

        // Strip markdown code fences if present
        const jsonText = content
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/```\s*$/, '')
          .trim();

        let analysis;
        try {
          analysis = JSON.parse(jsonText);
        } catch {
          throw new Error('LLM returned non-JSON response. Try a different model.');
        }

        return {
          analysis,
          model: currentModel,
          fallbackUsed: currentModel !== model,
          usage: data.usage || null,
          attempts: attempt + 1,
        };
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
  }

  throw lastError || new Error('All models failed');
}
