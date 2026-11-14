package cat.exercicisacasa.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * La app nunca se dibuja debajo de la barra de estado ni de los botones de Android:
 * el contenido se separa de ellas con un margen (en cualquier versión de Android y del WebView).
 * Las barras quedan del color de fondo de la app; al arrancar, con iconos claros (tema oscuro), y luego la app
 * las cambia según el tema elegido (KasaNativePlugin.setBars).
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // funciones propias de Android (música, barras del sistema, abrir Spotify): ver KasaNativePlugin
        registerPlugin(KasaNativePlugin.class);
        super.onCreate(savedInstanceState);

        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.setAppearanceLightStatusBars(false);
        bars.setAppearanceLightNavigationBars(false);

        View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
            Insets sys = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(sys.left, sys.top, sys.right, Math.max(sys.bottom, ime.bottom));
            // la web ya no tiene que dejar sitio a las barras (env(safe-area-inset-*) = 0)
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
