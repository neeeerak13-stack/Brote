const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const src = fs.readFileSync('docs/js/aurora-orbe-assistant.js', 'utf8');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; }, eq = (a, b, m) => { assert.deepEqual(JSON.parse(JSON.stringify(a === undefined ? null : a)), JSON.parse(JSON.stringify(b)), m); n++; };
const pcm24 = Buffer.alloc(4800 * 2); pcm24.writeInt16LE(16384, 0); pcm24.writeInt16LE(-16384, 2);
function make(opts = {}) {
  const store = {}, calls = [], spoken = [], hooks = [], created = { buffers: [] };
  const state = { name: 'Karen', subjects: [], lib: [], archive: [], set: Object.assign({ key: 'K' }, opts.set) };
  const ctx = {
    console, Date, Math, JSON, String, Array, Object, Number, Promise, Error, Intl, Uint8Array, Float32Array, setTimeout, clearTimeout, atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64'),
    localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } }, document: { getElementById: () => null },
    fetch: async (u, o) => { const body = JSON.parse(o.body); calls.push({ u, body }); const r = opts.fetch ? opts.fetch(u, body) : null; if (r) return r;
      if (/preview-tts/.test(u)) return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: pcm24.toString('base64') } }] } }] }) };
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '[e:feliz] ¡Hola! Todo va bien.' }] } }] }) }; },
    speechSynthesis: { speak(u) { spoken.push({ text: u.text, rate: u.rate, pitch: u.pitch, voice: u.voice && u.voice.name }); setTimeout(() => u.onend && u.onend(), 1); }, cancel() {}, getVoices: () => opts.voices || [{ name: 'Jorge', lang: 'es-ES' }, { name: 'Paulina', lang: 'es-MX' }, { name: 'Samantha', lang: 'en-US' }] },
    SpeechSynthesisUtterance: function (t) { this.text = t; },
    AudioContext: function () { this.state = 'running'; this.destination = {}; this.resume = () => Promise.resolve(); this.createBuffer = (ch, len, rate) => { const b = { rate, len, data: new Float32Array(len), getChannelData() { return this.data; } }; created.buffers.push(b); return b; };
      this.createAnalyser = () => ({ fftSize: 0, frequencyBinCount: 8, connect() {}, getByteTimeDomainData(a) { a.fill(128); } }); this.createBufferSource = () => ({ connect() {}, start() { setTimeout(() => this.onended && this.onended(), 2); }, stop() {} }); }
  };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
  const A = ctx.AuroraOrbeAssistant;
  const ui = { say: (...a) => hooks.push(['say', ...a]), state: (...a) => hooks.push(['state', ...a]), level() {}, voiceFallback: (...a) => hooks.push(['fallback', ...a]), notice: (...a) => hooks.push(['notice', ...a]), listening() {} };
  A.init({ getState: () => state, ui }); return { A, state, calls, spoken, hooks, store, created };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let t = make(); const A = t.A;
  // Emoción
  eq(A.parseEmotion('[e:feliz] ¡Hola!'), { text: '¡Hola!', emotion: 'feliz' }, 'parseEmotion con etiqueta');
  eq(A.parseEmotion('[E: Sorprendida ] Wow').emotion, 'sorprendida', 'etiqueta con mayúsculas y espacios');
  eq(A.parseEmotion('[e:inventada] Hola').text, 'Hola', 'etiqueta desconocida se elimina del texto');
  ok(!/\[e:/.test(A.parseEmotion('Hola [e:triste] mundo').text), 'etiqueta a mitad de texto se elimina');
  eq(A.inferEmotion('Lamento decirlo, estás en riesgo'), 'triste', 'infiere tristeza'); eq(A.inferEmotion('¡Felicitaciones, aprobaste!'), 'feliz', 'infiere alegría'); eq(A.inferEmotion('Vas en 3.5'), 'reposo', 'neutral');
  // Texto para voz
  const parts = A.splitSentences('Primera frase. Segunda frase muy larga que sigue. Tercera frase final.', 30); ok(parts.length >= 2 && parts.every(p => p.length <= 60), 'divide en frases cortas para voz');
  eq(A.cleanForSpeech('**Hola** [e:feliz] mira https://x.com/a [1] _bien_'), 'Hola mira bien', 'limpia markdown, enlaces y etiquetas antes de hablar');
  // Voz del dispositivo: elige voz femenina en español
  eq(A.pickVoice().name, 'Paulina', 'elige una voz femenina en español, nunca Jorge ni inglés');
  eq(make({ voices: [{ name: 'Samantha', lang: 'en-US' }] }).A.pickVoice(), null, 'sin voces en español devuelve null');
  // Modo de voz
  eq(A.speechMode(), 'gemini', 'con llave usa la voz natural'); eq(make({ set: { key: '' } }).A.speechMode(), 'device', 'sin llave usa la del dispositivo'); eq(make({ set: { tts: 'off' } }).A.speechMode(), 'off', 'respeta silencio');
  // Saludo al iniciar
  ok(t.hooks.some(h => h[0] === 'say' && h[2] === 'model' && h[1].length > 10), 'al iniciar Aurora saluda');
  // Conversación con Gemini
  t = make(); await t.A.ask('¿cómo voy?', { speak: false }); await wait(5);
  const body = t.calls[0].body, sys = body.systemInstruction.parts[0].text;
  ok(/suave, cálida, amable, delicada/.test(sys) && /\[e:feliz\]/.test(sys) && /sin markdown/.test(sys), 'el prompt define la personalidad y pide etiqueta de emoción');
  ok(/gemini-2\.5-flash/.test(t.calls[0].u), 'usa el modelo configurado');
  ok(t.hooks.some(h => h[0] === 'say' && h[1] === '¡Hola! Todo va bien.' && h[3] === 'feliz'), 'muestra la respuesta sin etiqueta y con su emoción');
  eq(JSON.parse(t.store.aurora_orbe_history_v1).length, 2, 'guarda la conversación (pregunta y respuesta)');
  // Sin llave: mensaje claro, sin llamar a Gemini
  t = make({ set: { key: '' } }); await t.A.ask('explícame la fotosíntesis', { speak: false }); eq(t.calls.length, 0, 'sin llave no llama a Gemini'); ok(t.hooks.some(h => h[0] === 'say' && /llave/.test(h[1])), 'explica que falta la llave');
  // Error 429
  t = make({ fetch: u => /preview-tts/.test(u) ? null : ({ ok: false, status: 429, json: async () => ({ error: { message: 'cuota' } }) }) }); await t.A.ask('explícame qué es una integral', { speak: false }); ok(t.hooks.some(h => h[0] === 'say' && /límite/.test(h[1])), 'maneja el límite de Gemini con un mensaje amable');
  // Voz natural femenina por Gemini TTS
  t = make({ set: { voice: 'Vindemiatrix' } }); await t.A.speak('Hola Karen. Vas muy bien.', 'feliz'); await wait(20);
  const tts = t.calls.find(c => /preview-tts/.test(c.u)); ok(tts, 'pide audio a Gemini TTS');
  eq(tts.body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Vindemiatrix', 'usa la voz elegida'); eq(tts.body.generationConfig.responseModalities, ['AUDIO'], 'solicita audio');
  ok(/voz de mujer joven, suave, cálida, amable y delicada/.test(tts.body.contents[0].parts[0].text) && /alegría/.test(tts.body.contents[0].parts[0].text), 'el estilo pedido es femenino, suave y con la emoción del momento');
  eq(t.created.buffers[0].rate, 24000, 'decodifica el audio a 24 kHz'); ok(Math.abs(t.created.buffers[0].data[0] - 0.5) < 1e-3 && Math.abs(t.created.buffers[0].data[1] + 0.5) < 1e-3, 'convierte correctamente el PCM de 16 bits');
  ok(!t.A.isSpeaking() && t.hooks.filter(h => h[0] === 'state').map(h => h[1]).slice(-2).join() === 'speaking,idle', 'pasa de hablando a reposo al terminar');
  // Respaldo cuando falla la voz natural
  t = make({ fetch: u => /preview-tts/.test(u) ? { ok: false, status: 500, json: async () => ({ error: { message: 'x' } }) } : null }); await t.A.speak('Lamento la noticia.', 'triste'); await wait(20);
  eq(t.spoken.length, 1, 'si falla la voz natural habla con la del dispositivo'); ok(t.spoken[0].voice === 'Paulina' && t.spoken[0].pitch <= 1.05 && t.spoken[0].rate < .9, 'con tono bajo y lento para tristeza'); ok(t.hooks.some(h => h[0] === 'fallback'), 'avisa a la interfaz del respaldo');
  const before = t.calls.length; await t.A.speak('Otra frase.', 'feliz'); await wait(20); eq(t.calls.filter(c => /preview-tts/.test(c.u)).length, before ? t.calls.filter(c => /preview-tts/.test(c.u)).length : 0, 'no insiste con la voz natural mientras está caída'); eq(t.calls.length, before, 'sin nuevas llamadas durante la espera'); eq(t.spoken.length, 2, 'sigue hablando con la voz del dispositivo');
  // Silencio
  t = make({ set: { tts: 'off' } }); await t.A.speak('No me oirás', 'reposo'); eq(t.spoken.length + t.calls.length, 0, 'en modo silencio no habla ni llama a Gemini');
  console.log(`Aurora Orbe assistant v2: ${n} assertions passed`);
})().catch(e => { console.error(e); process.exit(1); });
