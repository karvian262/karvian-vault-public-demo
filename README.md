# Karvian Vault Public Demo

This is the public showcase build of Karvian Vault.

- Mode: `NEXT_PUBLIC_APP_MODE=demo`
- Uses sample data only
- Read-only UI
- Gemini/API calls are blocked
- No private passwords, documents, notes, projects, chats, memories, or API keys are included

Run locally:

```bash
npm install
npm run dev
```

Deploy on Vercel with:

```env
NEXT_PUBLIC_APP_MODE=demo
```

Do not add `GEMINI_API_KEY` to the public demo deployment.
