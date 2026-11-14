package cat.exercicisacasa.app;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Funciones de Android que la web no tiene:
 * - bajar la música de otras apps (Spotify, la radio...) mientras la app habla o pita: se pide el foco de audio
 *   «transitorio, se puede bajar» y Android baja el volumen de las demás; al soltarlo, vuelve a subir;
 * - el color de las barras del sistema (fondo e iconos) según el tema claro u oscuro de la app;
 * - abrir Spotify (o, si no está, la app de música del móvil).
 */
@CapacitorPlugin(name = "KasaNative")
public class KasaNativePlugin extends Plugin {

    private static final String SPOTIFY = "com.spotify.music";

    private AudioManager audio;
    private AudioFocusRequest focus;
    private final AudioManager.OnAudioFocusChangeListener onChange = (change) -> { };

    private AudioManager audio() {
        if (audio == null) audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        return audio;
    }

    @PluginMethod
    public void duck(PluginCall call) {
        AudioManager am = audio();
        if (am != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (focus == null) {
                    AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build();
                    focus = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                        .setAudioAttributes(attrs)
                        .setOnAudioFocusChangeListener(onChange)
                        .build();
                }
                am.requestAudioFocus(focus);
            } else {
                am.requestAudioFocus(onChange, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK);
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
}
