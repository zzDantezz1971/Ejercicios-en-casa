package cat.exercicisacasa.app

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.Device
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Mass
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.Instant
import java.time.ZoneId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Health Connect: la app SOLO ESCRIBE (nunca lee) los entrenamientos (sesión de fuerza, calorías y pulsaciones del
 * reloj) y el peso, si el usuario lo activa en Configuració y da permiso. Así salen en Samsung Health, Google Fit,
 * Fitbit... Necesita Android 9 o superior (en Android 9-13, la app «Health Connect» de Google instalada).
 */
@CapacitorPlugin(name = "KasaHealth")
class KasaHealthPlugin : Plugin() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val exercisePerm = HealthPermission.getWritePermission(ExerciseSessionRecord::class)
    private val perms = setOf(
        exercisePerm,
        HealthPermission.getWritePermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getWritePermission(HeartRateRecord::class),
        HealthPermission.getWritePermission(WeightRecord::class),
    )

    private fun sdk(): Int =
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) HealthConnectClient.SDK_UNAVAILABLE
        else HealthConnectClient.getSdkStatus(context, PROVIDER)

    private fun client(): HealthConnectClient = HealthConnectClient.getOrCreate(context)

    /** status: "available" (lo tiene), "install" (hay que instalarlo o actualizarlo) o "unsupported"; y si hay permiso. */
    @PluginMethod
    fun status(call: PluginCall) {
        val s = sdk()
        val ret = JSObject()
        ret.put("status", when (s) {
            HealthConnectClient.SDK_AVAILABLE -> "available"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "install"
            else -> "unsupported"
        })
        if (s != HealthConnectClient.SDK_AVAILABLE) {
            ret.put("granted", false)
            call.resolve(ret)
            return
        }
        scope.launch {
            try {
                val granted = client().permissionController.getGrantedPermissions()
                ret.put("granted", granted.contains(exercisePerm))
            } catch (e: Exception) {
                ret.put("granted", false)
            }
            call.resolve(ret)
        }
    }

    /** Pantalla del sistema para dar permiso; al volver, responde como status(). */
    @PluginMethod
    fun request(call: PluginCall) {
        if (sdk() != HealthConnectClient.SDK_AVAILABLE) {
            status(call)
            return
        }
        val intent = PermissionController.createRequestPermissionResultContract(PROVIDER).createIntent(context, perms)
        startActivityForResult(call, intent, "onPermissions")
    }

    @ActivityCallback
    fun onPermissions(call: PluginCall?, result: ActivityResult) {
        if (call != null) status(call)
    }

    /** Abre Health Connect en Play Store (para instalarlo o actualizarlo). */
    @PluginMethod
    fun install(call: PluginCall) {
        val market = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$PROVIDER&url=healthconnect%3A%2F%2Fonboarding"))
            .setPackage("com.android.vending")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            context.startActivity(market)
        } catch (e: ActivityNotFoundException) {
            context.startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$PROVIDER"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
        }
        call.resolve()
    }

    /**
     * Guarda un entrenamiento: start/end (ISO), title, kcal (opcional) y pulsaciones (opcional): hr = lista de bpm,
     * una cada hrStep segundos desde el inicio. id = identificador propio (si se guarda dos veces, no se duplica).
     */
    @PluginMethod
    fun writeWorkout(call: PluginCall) {
        val start: Instant
        val end: Instant
        try {
            start = Instant.parse(call.getString("start"))
            end = Instant.parse(call.getString("end"))
        } catch (e: Exception) {
            call.reject("fechas no válidas")
            return
        }
        if (!end.isAfter(start)) {
            call.reject("duración no válida")
            return
        }
        val id = call.getString("id") ?: start.toString()
        val zs = ZoneId.systemDefault().rules.getOffset(start)
        val ze = ZoneId.systemDefault().rules.getOffset(end)
        val records = mutableListOf<Record>()
        records.add(ExerciseSessionRecord(
            startTime = start, startZoneOffset = zs, endTime = end, endZoneOffset = ze,
            metadata = meta("sesion-$id"),
            exerciseType = ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING,
            title = call.getString("title"),
        ))
        val kcal = call.getDouble("kcal")
        if (kcal != null && kcal > 0) {
            records.add(ActiveCaloriesBurnedRecord(
                startTime = start, startZoneOffset = zs, endTime = end, endZoneOffset = ze,
                energy = Energy.kilocalories(kcal),
                metadata = meta("kcal-$id"),
            ))
        }
        val hr = call.getArray("hr")
        val step = (call.getInt("hrStep") ?: 5).toLong()
        if (hr != null && hr.length() > 0) {
            val samples = mutableListOf<HeartRateRecord.Sample>()
            for (i in 0 until hr.length()) {
                val t = start.plusSeconds(i * step)
                if (t.isAfter(end)) break
                val bpm = hr.optLong(i, 0L)
                if (bpm in 30L..230L) samples.add(HeartRateRecord.Sample(time = t, beatsPerMinute = bpm))
            }
            if (samples.isNotEmpty()) {
                records.add(HeartRateRecord(
                    startTime = start, startZoneOffset = zs, endTime = end, endZoneOffset = ze,
                    samples = samples,
                    metadata = meta("pulso-$id"),
                ))
            }
        }
        insert(call, records)
    }

    /** Guarda el peso (kg) en una fecha (ISO). */
    @PluginMethod
    fun writeWeight(call: PluginCall) {
        val kg = call.getDouble("kg")
        val time = try { Instant.parse(call.getString("date")) } catch (e: Exception) { null }
        if (kg == null || kg <= 0 || time == null) {
            call.reject("peso no válido")
            return
        }
        val day = time.atZone(ZoneId.systemDefault()).toLocalDate().toString()
        insert(call, listOf(WeightRecord(
            time = time, zoneOffset = ZoneId.systemDefault().rules.getOffset(time),
            weight = Mass.kilograms(kg),
            metadata = Metadata.manualEntry(clientRecordId = "peso-$day"),
        )))
    }

    private fun meta(clientId: String): Metadata =
        Metadata.activelyRecorded(device = Device(type = Device.TYPE_PHONE), clientRecordId = clientId)

    private fun insert(call: PluginCall, records: List<Record>) {
        if (sdk() != HealthConnectClient.SDK_AVAILABLE) {
            call.reject("no disponible")
            return
        }
        scope.launch {
            try {
                // solo lo que tiene permiso (el usuario puede haber quitado alguno)
                val granted = client().permissionController.getGrantedPermissions()
                val ok = records.filter { granted.contains(HealthPermission.getWritePermission(it::class)) }
                if (ok.isNotEmpty()) client().insertRecords(ok)
                val ret = JSObject()
                ret.put("written", ok.size)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject(e.message ?: "error")
            }
        }
    }

    companion object {
        const val PROVIDER = "com.google.android.apps.healthdata"
    }
}
