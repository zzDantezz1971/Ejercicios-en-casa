package cat.exercicisacasa.app

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle

/**
 * Health Connect la abre cuando el usuario pregunta por qué Kasa Fit pide permisos de salud:
 * muestra la política de privacidad (en el navegador) y se cierra.
 */
class HealthPrivacyActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(PRIVACY_URL)))
        } catch (e: ActivityNotFoundException) {
            // sin navegador: no se puede mostrar
        }
        finish()
    }

    companion object {
        const val PRIVACY_URL = "https://zzdantezz1971.github.io/kasa-fit-privacidad/privacidad.html#health-connect"
    }
}
