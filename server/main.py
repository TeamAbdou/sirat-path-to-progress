"""
IqlaDIM Local Server — Sirat-Tiny (LocalHost Execution)
========================================================
FastAPI bridge between the Sirat PWA (browser) and the local
Gemma + LoRA model delivered by tAI, plus Whisper STT.

Endpoints
---------
  GET  /health                 -> {"status":"ok","model":...,"device":...}
  POST /chat   (SSE stream)    -> streams assistant tokens as text/event-stream
  POST /stt                    -> multipart audio file -> {"text": "..."}

Run
---
  pip install -r requirements.txt
  python main.py            # listens on http://localhost:8000
"""
from __future__ import annotations

import io
import json
import os
import threading
from typing import AsyncGenerator, List, Optional

import torch
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# --------------------------------------------------------------------- config
BASE_MODEL_ID = os.getenv("IQLADIM_BASE_MODEL", "google/gemma-2-2b-it")
LORA_ADAPTER_DIR = os.getenv("IQLADIM_LORA_DIR", "./adapters/iqladim-v1")
WHISPER_MODEL = os.getenv("IQLADIM_WHISPER", "base")
HOST = os.getenv("IQLADIM_HOST", "127.0.0.1")
PORT = int(os.getenv("IQLADIM_PORT", "8000"))

# --------------------------------------------------------------------- app
app = FastAPI(title="IqlaDIM Local Server", version="1.0.0")

# CORS: PWA in browser must reach us on localhost from a different origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------- lazy singletons
_llm_lock = threading.Lock()
_llm = {"tokenizer": None, "model": None, "device": None}

_whisper_lock = threading.Lock()
_whisper = {"model": None}


def _load_llm() -> None:
    """Load Gemma base + LoRA adapter once."""
    if _llm["model"] is not None:
        return
    with _llm_lock:
        if _llm["model"] is not None:
            return
        from transformers import AutoModelForCausalLM, AutoTokenizer

        print(f"[IqlaDIM] Loading base model: {BASE_MODEL_ID}")
        tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_ID)
        model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_ID,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto",
        )

        if os.path.isdir(LORA_ADAPTER_DIR):
            try:
                from peft import PeftModel

                print(f"[IqlaDIM] Attaching LoRA adapter from: {LORA_ADAPTER_DIR}")
                model = PeftModel.from_pretrained(model, LORA_ADAPTER_DIR)
            except Exception as e:  # noqa: BLE001
                print(f"[IqlaDIM] WARN — failed to load LoRA adapter: {e}")
        else:
            print(f"[IqlaDIM] No LoRA adapter at {LORA_ADAPTER_DIR}; running base only.")

        model.eval()
        _llm["tokenizer"] = tokenizer
        _llm["model"] = model
        _llm["device"] = "cuda" if torch.cuda.is_available() else "cpu"
        print(
            "🚀 IqlaDIM v1.0 يعمل الآن بأحدث معمارية متاحة عالمياً "
            f"(device={_llm['device']})"
        )


def _load_whisper() -> None:
    if _whisper["model"] is not None:
        return
    with _whisper_lock:
        if _whisper["model"] is not None:
            return
        import whisper

        print(f"[IqlaDIM] Loading Whisper: {WHISPER_MODEL}")
        _whisper["model"] = whisper.load_model(WHISPER_MODEL)


# --------------------------------------------------------------------- schemas
class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    temperature: float = 0.7
    max_tokens: int = 512


# --------------------------------------------------------------------- routes
@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model": BASE_MODEL_ID,
        "lora": os.path.isdir(LORA_ADAPTER_DIR),
        "device": _llm["device"] or ("cuda" if torch.cuda.is_available() else "cpu"),
        "whisper_loaded": _whisper["model"] is not None,
    }


def _format_prompt(messages: List[ChatMessage]) -> str:
    """Use Gemma chat template; collapse 'system' into the first user turn."""
    tokenizer = _llm["tokenizer"]
    sys_blocks = [m.content for m in messages if m.role == "system"]
    turns = [m for m in messages if m.role != "system"]
    if sys_blocks and turns and turns[0].role == "user":
        turns[0] = ChatMessage(
            role="user", content="\n\n".join(sys_blocks) + "\n\n" + turns[0].content
        )
    chat = [{"role": m.role, "content": m.content} for m in turns]
    return tokenizer.apply_chat_template(
        chat, tokenize=False, add_generation_prompt=True
    )


@app.post("/chat")
def chat(req: ChatRequest) -> StreamingResponse:
    """Server-Sent Events stream of assistant tokens.

    Each event line: `data: {"delta": "..."}\\n\\n`
    Final event:     `data: [DONE]\\n\\n`
    """
    _load_llm()
    from transformers import TextIteratorStreamer

    tokenizer = _llm["tokenizer"]
    model = _llm["model"]

    prompt = _format_prompt(req.messages)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    streamer = TextIteratorStreamer(
        tokenizer, skip_prompt=True, skip_special_tokens=True
    )
    gen_kwargs = dict(
        **inputs,
        streamer=streamer,
        max_new_tokens=req.max_tokens,
        temperature=max(req.temperature, 0.01),
        do_sample=req.temperature > 0,
        pad_token_id=tokenizer.eos_token_id,
    )
    thread = threading.Thread(target=model.generate, kwargs=gen_kwargs, daemon=True)
    thread.start()

    def event_stream() -> AsyncGenerator[bytes, None]:
        try:
            for chunk in streamer:
                if not chunk:
                    continue
                yield f"data: {json.dumps({'delta': chunk}, ensure_ascii=False)}\n\n".encode("utf-8")
            yield b"data: [DONE]\n\n"
        except Exception as e:  # noqa: BLE001
            err = json.dumps({"error": str(e)}, ensure_ascii=False)
            yield f"data: {err}\n\n".encode("utf-8")

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/stt")
async def stt(file: UploadFile = File(...), language: Optional[str] = None) -> dict:
    """Speech-to-text via local Whisper."""
    _load_whisper()
    import tempfile

    suffix = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty audio")

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(data)
        path = tmp.name
    try:
        result = _whisper["model"].transcribe(path, language=language)
        return {"text": (result.get("text") or "").strip()}
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


# --------------------------------------------------------------------- main
if __name__ == "__main__":
    # Eager-load on boot so the first request is fast.
    try:
        _load_llm()
    except Exception as e:  # noqa: BLE001
        print(f"[IqlaDIM] LLM preload failed (will retry on first request): {e}")
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
