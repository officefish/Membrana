/** OpenAPI security scheme id — must match DocumentBuilder.addApiKey name. */
export const API_TOKEN_SECURITY = 'api-token' as const;

export const DEVICE_KINDS = ['microphone', 'antenna', 'other'] as const;
export const COLLECTION_KINDS = ['buffer', 'user', 'system'] as const;
export const SAMPLE_LABELS = ['drone', 'not_drone', 'unlabeled'] as const;
export const SAMPLE_SOURCES_API = ['mic-recording', 'disk-import', 'synthetic', 'move'] as const;
export const AUDIO_FORMATS = ['wav', 'mp3', 'flac', 'ogg'] as const;
export const MEDIA_MIME_EXAMPLES =
  'audio/wav, audio/mpeg, audio/flac, audio/ogg (see MEDIA_ALLOWED_MIME)';
