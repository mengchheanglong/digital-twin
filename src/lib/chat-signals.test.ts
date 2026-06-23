import {
  normalizeSignalType,
  sanitizeExtractedSignals,
  parseSignalResponseText,
  CHAT_SIGNAL_TYPES,
} from '@/lib/chat-signals';

describe('normalizeSignalType', () => {
  it('returns exact matches for all supported signal types', () => {
    for (const type of CHAT_SIGNAL_TYPES) {
      expect(normalizeSignalType(type)).toBe(type);
    }
  });

  it('handles case-insensitivity and whitespace', () => {
    expect(normalizeSignalType('  STRESS  ')).toBe('stress');
    expect(normalizeSignalType('Focus')).toBe('focus');
  });

  it('resolves aliases correctly', () => {
    expect(normalizeSignalType('stressed')).toBe('stress');
    expect(normalizeSignalType('concentration')).toBe('focus');
    expect(normalizeSignalType('tired')).toBe('fatigue');
    expect(normalizeSignalType('anxious')).toBe('anxiety');
    expect(normalizeSignalType('productive')).toBe('productivity');
    expect(normalizeSignalType('confident')).toBe('confidence');
    expect(normalizeSignalType('procrastinating')).toBe('procrastination');
    expect(normalizeSignalType('mindful')).toBe('mindfulness');
    expect(normalizeSignalType('breath')).toBe('breathing');
  });

  it('returns null for empty or invalid inputs', () => {
    expect(normalizeSignalType('')).toBeNull();
    expect(normalizeSignalType(null)).toBeNull();
    expect(normalizeSignalType(undefined)).toBeNull();
    expect(normalizeSignalType('unknown_type')).toBeNull();
  });
});

describe('sanitizeExtractedSignals', () => {
  it('sanitizes a standard array of signal objects', () => {
    const input = [
      { signalType: 'stress', intensity: 4, confidence: 0.9 },
      { signalType: 'focus', intensity: 2, confidence: 0.8 },
    ];
    const result = sanitizeExtractedSignals(input);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ signalType: 'stress', intensity: 4, confidence: 0.9 });
    expect(result).toContainEqual({ signalType: 'focus', intensity: 2, confidence: 0.8 });
  });

  it('handles alternative key names', () => {
    const input = [
      { signal_type: 'stress', strength: 4, score: 0.9 },
      { type: 'focus', intensity: 2, confidence: 0.8 },
    ];
    const result = sanitizeExtractedSignals(input);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ signalType: 'stress', intensity: 4, confidence: 0.9 });
    expect(result).toContainEqual({ signalType: 'focus', intensity: 2, confidence: 0.8 });
  });

  it('handles wrapped input in "signals" or "data" fields', () => {
    const signalsWrapped = { signals: [{ type: 'stress', intensity: 4, confidence: 0.9 }] };
    const dataWrapped = { data: [{ type: 'focus', intensity: 2, confidence: 0.8 }] };

    expect(sanitizeExtractedSignals(signalsWrapped)).toHaveLength(1);
    expect(sanitizeExtractedSignals(dataWrapped)).toHaveLength(1);
  });

  it('applies default values for missing or invalid fields', () => {
    const input = [{ type: 'stress' }];
    const result = sanitizeExtractedSignals(input);
    expect(result[0]).toEqual({
      signalType: 'stress',
      intensity: 3,
      confidence: 0.7,
    });
  });

  it('clamps and rounds values', () => {
    const input = [
      { type: 'stress', intensity: 10, confidence: 1.5 },
      { type: 'focus', intensity: -5, confidence: -0.5 },
      { type: 'motivation', intensity: 3.4, confidence: 0.88888 },
    ];
    const result = sanitizeExtractedSignals(input);

    expect(result).toContainEqual({ signalType: 'stress', intensity: 5, confidence: 1 });
    expect(result).toContainEqual({ signalType: 'focus', intensity: 1, confidence: 0 });
    expect(result).toContainEqual({ signalType: 'motivation', intensity: 3, confidence: 0.889 });
  });

  it('deduplicates signals by keeping the most reliable one', () => {
    const input = [
      { type: 'stress', intensity: 2, confidence: 0.5 },
      { type: 'stress', intensity: 4, confidence: 0.8 }, // Higher confidence wins
      { type: 'focus', intensity: 3, confidence: 0.7 },
      { type: 'focus', intensity: 5, confidence: 0.7 }, // Equal confidence, higher intensity wins
    ];
    const result = sanitizeExtractedSignals(input);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ signalType: 'stress', intensity: 4, confidence: 0.8 });
    expect(result).toContainEqual({ signalType: 'focus', intensity: 5, confidence: 0.7 });
  });

  it('ignores malformed elements in the array', () => {
    const input = [null, undefined, 123, 'not an object', { type: 'unknown' }];
    expect(sanitizeExtractedSignals(input)).toHaveLength(0);
  });
});

describe('parseSignalResponseText', () => {
  it('parses a plain JSON array string', () => {
    const text = '[{"type": "stress", "intensity": 4, "confidence": 0.9}]';
    const result = parseSignalResponseText(text);
    expect(result).toHaveLength(1);
    expect(result[0].signalType).toBe('stress');
  });

  it('parses JSON within markdown blocks', () => {
    const textWithJson = '```json\n[{"type": "focus", "intensity": 3, "confidence": 0.8}]\n```';
    const textWithoutLang = '```\n[{"type": "motivation", "intensity": 5, "confidence": 1}]\n```';

    expect(parseSignalResponseText(textWithJson)[0].signalType).toBe('focus');
    expect(parseSignalResponseText(textWithoutLang)[0].signalType).toBe('motivation');
  });

  it('extracts a JSON array from surrounding text', () => {
    const text = 'Here are the signals: [{"type": "anxiety", "intensity": 2, "confidence": 0.7}] and more text.';
    const result = parseSignalResponseText(text);
    expect(result).toHaveLength(1);
    expect(result[0].signalType).toBe('anxiety');
  });

  it('handles empty or invalid text', () => {
    expect(parseSignalResponseText('')).toEqual([]);
    expect(parseSignalResponseText('just some text with no array')).toEqual([]);
    expect(parseSignalResponseText('{"not": "an array"}')).toEqual([]);
  });
});
