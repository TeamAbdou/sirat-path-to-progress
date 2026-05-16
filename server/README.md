# IqlaDIM Local Server (Sirat-Tiny LocalHost Edition)

This is the **local backend** that runs the IqlaDIM model (Gemma + LoRA adapters
delivered by tAI) and Whisper STT on **your own machine**. The Sirat PWA in
your browser talks to it over `http://localhost:8000`.

> Privacy: nothing leaves your machine. The PWA still stores all user data in
> encrypted IndexedDB (AES-GCM); this server only handles inference.

## 1. Install

```bash
cd server
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate

# Install the right PyTorch build first (CUDA / MPS / CPU):
#   https://pytorch.org/get-started/locally/

pip install -r requirements.txt
```

## 2. Drop in the tAI LoRA adapter

Place the adapter files (the ones tAI delivered) at:

```
server/adapters/iqladim-v1/
  adapter_config.json
  adapter_model.safetensors
  ...
```

Override with `IQLADIM_LORA_DIR=/path/to/adapter` if you keep them elsewhere.

## 3. Run

```bash
python main.py
```

You should see:

```
🚀 IqlaDIM v1.0 يعمل الآن بأحدث معمارية متاحة عالمياً (device=cuda)
INFO:     Uvicorn running on http://127.0.0.1:8000
```

## 4. Point the PWA at it

In the project root, add to `.env.local` (NOT the auto-managed `.env`):

```
VITE_AI_PROVIDER=native
VITE_NATIVE_AI_URL=http://localhost:8000
```

Restart `npm run dev`. The chat UI will now stream from your local server
instead of WebLLM.

## Endpoints

| Method | Path     | Purpose                                  |
|--------|----------|------------------------------------------|
| GET    | /health  | sanity check + device info               |
| POST   | /chat    | SSE token stream (OpenAI-shaped body)    |
| POST   | /stt     | multipart audio file → transcribed text  |

## Env vars

| Var                  | Default                | Meaning                              |
|----------------------|------------------------|--------------------------------------|
| `IQLADIM_BASE_MODEL` | `google/gemma-2-2b-it` | HF model id (swap for Gemma 3/4)     |
| `IQLADIM_LORA_DIR`   | `./adapters/iqladim-v1`| Folder containing the LoRA adapter   |
| `IQLADIM_WHISPER`    | `base`                 | tiny/base/small/medium/large         |
| `IQLADIM_HOST`       | `127.0.0.1`            | Bind address                         |
| `IQLADIM_PORT`       | `8000`                 | Port                                 |
