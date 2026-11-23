package cat.exercicisacasa.app;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.audiofx.LoudnessEnhancer;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.view.Window;
import androidx.annotation.RequiresApi;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Funciones de Android que la web no tiene:
 * - pausar o bajar la música de otras apps (Spotify, la radio...) mientras la app habla o pita: se pide el foco de
 *   audio transitorio («se puede bajar» o no) y Android pausa o baja las demás; al soltarlo, vuelven;
 * - la voz amplificada: el motor de voz del móvil escribe la frase en un archivo y se reproduce con un refuerzo de
 *   volumen (LoudnessEnhancer), para que se oiga por encima de la música bajada;
 * - el color de las barras del sistema (fondo e iconos) según el tema claro u oscuro de la app;
 * - abrir Spotify (o, si no está, la app de música del móvil);
 * - cerrar la app de verdad al salir con «atrás» (también desaparece de las apps recientes).
 */
@CapacitorPlugin(name = "KasaNative")
public class KasaNativePlugin extends Plugin {

    private static final String SPOTIFY = "com.spotify.music";

    private AudioManager audio;
    private AudioFocusRequest focusDuck;
    private AudioFocusRequest focusPause;
    private AudioFocusRequest focus;
    private final AudioManager.OnAudioFocusChangeListener onChange = (change) -> { };

    private AudioManager audio() {
        if (audio == null) audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        return audio;
    }

    /** Foco de audio transitorio: con pause, las demás apps se paran; si no, bajan el volumen. */
    @RequiresApi(Build.VERSION_CODES.O)
    private AudioFocusRequest focusRequest(boolean pause) {
        AudioFocusRequest r = pause ? focusPause : focusDuck;
        if (r == null) {
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build();
            r = new AudioFocusRequest.Builder(pause ? AudioManager.AUDIOFOCUS_GAIN_TRANSIENT : AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(attrs)
                .setOnAudioFocusChangeListener(onChange)
                .build();
            if (pause) focusPause = r; else focusDuck = r;
        }
        return r;
    }

    @PluginMethod
    public void duck(PluginCall call) {
        boolean pause = Boolean.TRUE.equals(call.getBoolean("pause", false));
        int gain = pause ? AudioManager.AUDIOFOCUS_GAIN_TRANSIENT : AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK;
        AudioManager am = audio();
        if (am != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // el mismo oyente en los dos: pedir el otro sustituye al que se tenía (de «bajar» a «pausar»)
                focus = focusRequest(pause);
                am.requestAudioFocus(focus);
            } else {
                am.requestAudioFocus(onChange, AudioManager.STREAM_MUSIC, gain);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void release(PluginCall call) {
        AudioManager am = audio();
        if (am != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (focus != null) am.abandonAudioFocusRequest(focus);
            } else {
                am.abandonAudioFocus(onChange);
            }
        }
        call.resolve();
    }

    /** Cierra la app y la quita de las apps recientes (con «atrás» desde Inicio). */
    @PluginMethod
    public void closeApp(PluginCall call) {
        call.resolve();
        getActivity().runOnUiThread(() -> {
            stopAll();
            getActivity().finishAndRemoveTask();
        });
    }

    @PluginMethod
    public void setBars(PluginCall call) {
        final boolean light = Boolean.TRUE.equals(call.getBoolean("light", false));
        int parsed;
        try {
            parsed = Color.parseColor(call.getString("color", "#0A0D12"));
        } catch (IllegalArgumentException e) {
            parsed = light ? Color.parseColor("#F3F5F9") : Color.parseColor("#0A0D12");
        }
        final int color = parsed;
        getActivity().runOnUiThread(() -> {
            Window w = getActivity().getWindow();
            // el contenido va separado de las barras con un margen: lo que se ve detrás de ellas es el fondo de la ventana
            w.getDecorView().setBackgroundColor(color);
            w.setStatusBarColor(color);
            w.setNavigationBarColor(color);
            WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(w, w.getDecorView());
            bars.setAppearanceLightStatusBars(light);
            bars.setAppearanceLightNavigationBars(light);
        });
        call.resolve();
    }

    private boolean hasSpotify() {
        try {
            getContext().getPackageManager().getPackageInfo(SPOTIFY, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    @PluginMethod
    public void musicApp(PluginCall call) {
        JSObject r = new JSObject();
        r.put("spotify", hasSpotify());
        call.resolve(r);
    }

    @PluginMethod
    public void openMusic(PluginCall call) {
        JSObject r = new JSObject();
        Context ctx = getContext();
        Intent i = hasSpotify() ? ctx.getPackageManager().getLaunchIntentForPackage(SPOTIFY) : null;
        if (i == null) i = Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, Intent.CATEGORY_APP_MUSIC);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            ctx.startActivity(i);
            r.put("opened", true);
        } catch (ActivityNotFoundException e) {
            r.put("opened", false);
        }
        call.resolve(r);
    }

    /** Abre la pantalla del móvil para instalar voces (datos de voz del motor); si no la hay, los ajustes de texto a voz. */
    @PluginMethod
    public void openVoiceInstall(PluginCall call) {
        JSObject r = new JSObject();
        Context ctx = getContext();
        boolean ok = false;
        // con «store»: busca esa app en Google Play (p. ej., un motor de voz con el idioma que falta)
        String store = call.getString("store", null);
        if (store != null) {
            for (String url : new String[] { "market://search?q=" + Uri.encode(store) + "&c=apps", "https://play.google.com/store/search?q=" + Uri.encode(store) + "&c=apps" }) {
                try {
                    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(i);
                    r.put("opened", true);
                    call.resolve(r);
                    return;
                } catch (ActivityNotFoundException e) { /* la siguiente */ }
            }
        }
        for (String action : new String[] { TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA, "com.android.settings.TTS_SETTINGS" }) {
            try {
                Intent i = new Intent(action);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
                ok = true;
                break;
            } catch (ActivityNotFoundException e) { /* la siguiente */ }
        }
        r.put("opened", ok);
        call.resolve(r);
    }

    // ---------- otro motor de voz para el idioma ----------

    /**
     * Busca, entre los motores de voz instalados, uno que tenga el idioma (p. ej., gallego o euskera, que el de Google
     * no tiene). Se prueban uno a uno: se arranca cada motor, se le pregunta por el idioma y se apaga. Devuelve el
     * paquete del motor, su nombre y sus voces de ese idioma; o nada si ninguno lo tiene. No cambia el motor del móvil.
     */
    @PluginMethod
    public void findEngine(PluginCall call) {
        final Locale loc = Locale.forLanguageTag(call.getString("lang", "es-ES"));
        List<ResolveInfo> found = getContext().getPackageManager().queryIntentServices(new Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE), 0);
        final List<String[]> engines = new ArrayList<>();
        for (ResolveInfo ri : found) {
            if (ri.serviceInfo == null) continue;
            CharSequence label = ri.loadLabel(getContext().getPackageManager());
            engines.add(new String[] { ri.serviceInfo.packageName, label == null ? ri.serviceInfo.packageName : label.toString() });
        }
        main.post(() -> probe(engines, 0, loc, call));
    }

    private void probe(List<String[]> engines, int i, Locale loc, PluginCall call) {
        if (i >= engines.size()) { call.resolve(new JSObject()); return; }
        final String pkg = engines.get(i)[0], label = engines.get(i)[1];
        final TextToSpeech[] holder = new TextToSpeech[1];
        final boolean[] done = { false };
        // si un motor no contesta en 4 s, el siguiente
        final Runnable timeout = () -> {
            if (done[0]) return;
            done[0] = true;
            try { if (holder[0] != null) holder[0].shutdown(); } catch (RuntimeException ignored) { }
            probe(engines, i + 1, loc, call);
        };
        main.postDelayed(timeout, 4000);
        holder[0] = new TextToSpeech(getContext(), (status) -> main.post(() -> {
            if (done[0]) return;
            done[0] = true;
            main.removeCallbacks(timeout);
            TextToSpeech t = holder[0];
            JSObject r = null;
            try {
                if (status == TextToSpeech.SUCCESS && t != null) {
                    JSArray voices = new JSArray();
                    try {
                        for (Voice v : t.getVoices()) {
                            Locale vl = v.getLocale();
                            if (vl != null && sameLang(vl, loc)) {
                                JSObject o = new JSObject();
                                o.put("name", v.getName());
                                o.put("lang", vl.toLanguageTag());
                                voices.put(o);
                            }
                        }
                    } catch (RuntimeException ignored) { }
                    int a = t.isLanguageAvailable(loc);
                    if (a < TextToSpeech.LANG_AVAILABLE) a = t.isLanguageAvailable(new Locale(loc.getLanguage()));
                    if (a >= TextToSpeech.LANG_AVAILABLE || voices.length() > 0) {
                        r = new JSObject();
                        r.put("engine", pkg);
                        r.put("label", label);
                        r.put("voices", voices);
                    }
                }
            } catch (RuntimeException ignored) { }
            try { if (t != null) t.shutdown(); } catch (RuntimeException ignored) { }
            if (r != null) call.resolve(r); else probe(engines, i + 1, loc, call);
        }), pkg);
    }

    /** ¿Mismo idioma? (gl = glg, eu = eus: algunos motores usan el código de tres letras) */
    private static boolean sameLang(Locale a, Locale b) {
        if (a.getLanguage().equalsIgnoreCase(b.getLanguage())) return true;
        try { return a.getISO3Language().equalsIgnoreCase(b.getISO3Language()); } catch (RuntimeException e) { return false; }
    }

    // ---------- voz amplificada ----------

    /** Refuerzo de volumen de la voz, en milésimas de decibelio (+10 dB). El efecto ya limita para que no sature. */
    private static final int LOUD_GAIN_MB = 1000;

    private static class Phrase {
        final String text, lang, voice;
        final float rate;
        final boolean loud;
        final PluginCall call;
        File file;
        Phrase(String text, String lang, String voice, float rate, boolean loud, PluginCall call) {
            this.text = text; this.lang = lang; this.voice = voice; this.rate = rate; this.loud = loud; this.call = call;
        }
    }

    private final Handler main = new Handler(Looper.getMainLooper());
    private TextToSpeech tts;
    /** Motor con que se ha arrancado tts (null = el del móvil). */
    private String ttsEngine;
    /** 0 = arrancando, 1 = listo, -1 = no hay motor de voz. */
    private int ttsState = 0;
    private final ArrayDeque<Phrase> phrases = new ArrayDeque<>();
    private Phrase current;
    private MediaPlayer player;
    private LoudnessEnhancer enhancer;
    private int utterances = 0;

    private void startTts() {
        if (tts != null) return;
        TextToSpeech.OnInitListener onInit = (status) -> main.post(() -> {
            ttsState = status == TextToSpeech.SUCCESS ? 1 : -1;
            if (ttsState == 1) {
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { }
                    @Override public void onDone(String id) { main.post(() -> synthesized(id, true)); }
                    @Override public void onError(String id) { main.post(() -> synthesized(id, false)); }
                    @Override public void onError(String id, int code) { main.post(() -> synthesized(id, false)); }
                });
            }
            next();
        });
        tts = ttsEngine == null ? new TextToSpeech(getContext(), onInit) : new TextToSpeech(getContext(), onInit, ttsEngine);
    }

    /** Cambia de motor de voz (null = el del móvil): se apaga el que había y se arrancará el nuevo. */
    private void useEngine(String engine) {
        if (engine == null ? ttsEngine == null : engine.equals(ttsEngine)) return;
        stopAll();
        if (tts != null) { try { tts.shutdown(); } catch (RuntimeException ignored) { } tts = null; }
        ttsState = 0;
        ttsEngine = engine;
    }

    @PluginMethod
    public void speakLoud(PluginCall call) {
        String text = call.getString("text", "");
        Float rate = call.getFloat("rate", 1.0f);
        // loud = false: el mismo camino (para usar otro motor de voz), pero sin el refuerzo de volumen
        Phrase p = new Phrase(text == null ? "" : text, call.getString("lang", "es-ES"), call.getString("voice", null),
            rate == null ? 1.0f : rate, !Boolean.FALSE.equals(call.getBoolean("loud", true)), call);
        boolean queue = Boolean.TRUE.equals(call.getBoolean("queue", false));
        String engine = call.getString("engine", null);
        main.post(() -> {
            useEngine(engine);
            if (!queue) stopAll();
            phrases.add(p);
            startTts();
            next();
        });
    }

    @PluginMethod
    public void stopLoud(PluginCall call) {
        main.post(this::stopAll);
        call.resolve();
    }

    /** Siguiente frase de la cola (si no se está diciendo otra). */
    private void next() {
        if (current != null || phrases.isEmpty() || ttsState == 0) return;
        Phrase p = phrases.poll();
        if (ttsState < 0) {
            p.call.reject("Sin motor de voz");
            next();
            return;
        }
        current = p;
        try {
            Locale loc = Locale.forLanguageTag(p.lang);
            tts.setLanguage(loc);
            if (p.voice != null) {
                for (Voice v : tts.getVoices()) {
                    if (p.voice.equals(v.getName())) { tts.setVoice(v); break; }
                }
            }
            tts.setSpeechRate(p.rate);
            p.file = new File(getContext().getCacheDir(), "voz-" + (++utterances) + ".wav");
            int r = tts.synthesizeToFile(p.text, new Bundle(), p.file, "k" + utterances);
            if (r != TextToSpeech.SUCCESS) finish(false);
        } catch (Exception e) {
            finish(false);
        }
    }

    /** El motor de voz ha acabado de escribir el archivo: se reproduce con el refuerzo de volumen. */
    private void synthesized(String id, boolean ok) {
        if (current == null || !("k" + utterances).equals(id)) return;
        if (!ok) { finish(false); return; }
        try {
            MediaPlayer mp = new MediaPlayer();
            mp.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build());
            mp.setDataSource(current.file.getPath());
            mp.prepare();
            player = mp;
            if (current.loud) {
                try {
                    enhancer = new LoudnessEnhancer(mp.getAudioSessionId());
                    enhancer.setTargetGain(LOUD_GAIN_MB);
                    enhancer.setEnabled(true);
                } catch (RuntimeException e) {
                    enhancer = null; // este móvil no tiene el efecto: suena al volumen normal
                }
            }
            mp.setOnCompletionListener((m) -> finish(true));
            mp.setOnErrorListener((m, what, extra) -> { finish(false); return true; });
            mp.start();
        } catch (Exception e) {
            finish(false);
        }
    }

    private void releasePlayer() {
        if (enhancer != null) { try { enhancer.release(); } catch (RuntimeException ignored) { } enhancer = null; }
        if (player != null) { try { player.stop(); } catch (RuntimeException ignored) { } player.release(); player = null; }
    }

    /** Acaba la frase actual (bien o mal) y pasa a la siguiente. */
    private void finish(boolean ok) {
        releasePlayer();
        Phrase p = current;
        current = null;
        if (p != null) {
            if (p.file != null) p.file.delete();
            if (ok) p.call.resolve(); else p.call.reject("No se ha podido decir la frase");
        }
        next();
    }

    /** Corta lo que esté diciendo y vacía la cola (las frases cortadas se dan por acabadas). */
    private void stopAll() {
        if (tts != null && ttsState == 1) tts.stop();
        releasePlayer();
        if (current != null) {
            if (current.file != null) current.file.delete();
            current.call.resolve();
            current = null;
        }
        while (!phrases.isEmpty()) phrases.poll().call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        stopAll();
        if (tts != null) { tts.shutdown(); tts = null; }
    }
}
