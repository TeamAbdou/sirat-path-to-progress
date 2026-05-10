/**
 * VoiceProcessor — local-only microphone capture.
 *
 * Responsibilities:
 *  - Request mic permission via getUserMedia
 *  - Expose an AnalyserNode for live waveform visualisation
 *  - Buffer raw PCM (Float32) chunks ready to be passed to a future
 *    in-browser STT engine (tAI lean engine — not yet integrated)
 *
 * Privacy: audio NEVER leaves the device. No network calls here.
 */

export interface VoiceSession {
  analyser: AnalyserNode;
  stop: () => Promise<Float32Array>;
}

export async function startVoiceSession(): Promise<VoiceSession> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('mic-unsupported');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  });

  const AudioCtx =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);

  // Buffer PCM with a ScriptProcessorNode (widely supported, no worklet file).
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  processor.onaudioprocess = (e) => {
    const ch = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(ch));
  };
  source.connect(processor);
  processor.connect(ctx.destination);

  const stop = async (): Promise<Float32Array> => {
    try {
      processor.disconnect();
      source.disconnect();
      analyser.disconnect();
    } catch {
      /* noop */
    }
    stream.getTracks().forEach((t) => t.stop());
    await ctx.close().catch(() => {});

    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Float32Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return out;
  };

  return { analyser, stop };
}
