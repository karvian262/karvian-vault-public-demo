# KYRA architecture

KYRA is an orchestration runtime, not a standalone chatbot.

## Runtime flow

1. `KyraAlwaysActive` owns the application-wide voice lifecycle. When microphone permission is already granted, recognition starts automatically. Browsers require a user gesture for first-time permission and may block audible autoplay.
2. `useContinuousSpeech` owns continuous Web Speech recognition, interim transcripts, permission/error handling, silence detection, noise confidence filtering, and restart recovery.
3. `KyraRuntime` coordinates the engines below.
4. `VaultEngine` handles private Vault lookup and deterministic actions locally.
5. `ContextEngine` adds the open route, active work, recent activity, and relevant Vault context.
6. `GeminiEngine` handles general reasoning and mixed requests through the server-only Gemini route.
7. `MemoryEngine` stores explicit durable memories in the existing IndexedDB memory table.
8. `ConversationManager` persists recent conversation using the existing settings table.
9. `ToolEngine` executes supported local actions such as creating projects/tasks and searching Vault content.
10. `KyraVoiceEngine` selects a `VoiceProvider` without coupling speech vendors to KYRA.

## Voice providers

- Browser: client-side fallback using installed system voices.
- OpenAI speech: optional `OPENAI_API_KEY`.
- ElevenLabs: `ELEVENLABS_API_KEY`; defaults to `eleven_flash_v2_5`.
- Azure AI Speech: `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`.

Provider, voice, language, speed, pitch, and volume preferences are stored in the existing settings table. Secrets remain server-side environment variables.

## AI brain

- Gemini: `GEMINI_API_KEY`; optional `GEMINI_MODEL` defaults to `gemini-2.5-flash`.

## Safety boundaries

- Password values are never passed to Gemini or spoken. KYRA can search credential metadata and open the encrypted Vault.
- General knowledge goes to Gemini. Personal retrieval stays local. Mixed requests receive filtered Vault context.
- The modular runtime can add vision, camera input, realtime transport, or streaming synthesis without replacing the Vault, Memory, Gemini, or Tool engines.
