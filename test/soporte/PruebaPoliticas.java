package dev.controlparental.parent.policy;

import dev.controlparental.parent.data.*;
import dev.controlparental.parent.network.RelayConnection;
import dev.controlparental.parent.security.CifradoMetadatos;
import dev.controlparental.protocol.*;
import java.io.BufferedReader;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.concurrent.*;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import kotlin.ResultKt;
import kotlin.Unit;
import kotlin.coroutines.*;
import kotlin.coroutines.intrinsics.IntrinsicsKt;
import kotlin.jvm.functions.Function1;
import kotlinx.coroutines.*;

public class PruebaPoliticas {
    private static void exigir(boolean valor) {
        if (!valor) throw new IllegalStateException("Comprobación de políticas JVM fallida");
    }
    private static <T> T esperar(Function1<Continuation<? super T>, Object> operacion) throws Exception {
        CompletableFuture<T> terminado = new CompletableFuture<>();
        Continuation<T> continuacion = new Continuation<>() {
            public CoroutineContext getContext() { return Dispatchers.getIO(); }
            @SuppressWarnings("unchecked")
            public void resumeWith(Object resultado) {
                try { ResultKt.throwOnFailure(resultado); terminado.complete((T) resultado); }
                catch (Throwable error) { terminado.completeExceptionally(error); }
            }
        };
        Object resultado = operacion.invoke(continuacion);
        if (resultado != IntrinsicsKt.getCOROUTINE_SUSPENDED()) continuacion.resumeWith(resultado);
        return terminado.get(10, TimeUnit.SECONDS);
    }
    private static MetadatosPadre leer(ParentStore store) throws Exception { return PruebaPoliticas.<MetadatosPadre>esperar(store::leer); }
    private static class ArchivoRam implements ArchivoMetadatos {
        private byte[] bytes;
        public boolean existe() { return bytes != null; }
        public byte[] leer() { return bytes.clone(); }
        public void escribir(byte[] nuevos) { bytes = nuevos.clone(); }
    }
    private static ControlPoliticas control(ParentStore store, RelayConnection conexion, long[] tiempo,
            Function1<Mensaje, SobreFirmado> firmar, int[] envios) {
        CanalPoliticas canal = new CanalPoliticas() {
            public Long actual() { return conexion.sesionPoliticas(); }
            public boolean enviar(long ticket, byte[] frame) {
                SobreFirmado sobre = (SobreFirmado) CodecProtocolo.INSTANCE.leerFrame(frame);
                Mensaje mensaje = CodecProtocolo.INSTANCE.leerPayloadSinVerificar(CodecProtocolo.INSTANCE.bytesPayload(sobre), Proposito.MESSAGE);
                if (mensaje instanceof OrdenPolitica) {
                    try {
                        PendingIntentRecord pendiente = leer(store).getPendiente();
                        exigir(pendiente != null && pendiente.getEtapa() == EtapaIntencion.ENVIADA_SIN_CONFIRMAR);
                        exigir(Arrays.equals(frame, Base64.getUrlDecoder().decode(pendiente.getFrameB64())));
                        envios[0]++;
                    } catch (Exception error) { throw new IllegalStateException("Persistencia previa al envío fallida", error); }
                }
                return conexion.enviarPolitica(ticket, frame);
            }
        };
        return new ControlPoliticas(store, canal, () -> tiempo[0], () -> Unit.INSTANCE, firmar, new SecureRandom());
    }
    private static void recibir(ControlPoliticas control, RelayConnection conexion, BlockingQueue<byte[]> frames) throws Exception {
        byte[] frame = frames.poll(10, TimeUnit.SECONDS); exigir(frame != null);
        Long ticket = conexion.sesionPoliticas(); exigir(ticket != null);
        PruebaPoliticas.<Unit>esperar(c -> control.recibir(ticket, frame, c));
    }
    public static void ejecutar(RelayConnection conexion, BlockingQueue<byte[]> frames, BufferedReader canal,
            String publica, String publicaHijo, String pareja, String origen, Function1<Mensaje, SobreFirmado> firmar,
            boolean reiniciarRelay) throws Exception {
        CoroutineScope scope = CoroutineScopeKt.CoroutineScope(Dispatchers.getIO());
        KeyGenerator generador = KeyGenerator.getInstance("AES"); generador.init(256);
        SecretKey aes = generador.generateKey();
        CifradoMetadatos cifrador = new CifradoMetadatos(() -> Unit.INSTANCE, () -> aes);
        ArchivoRam archivo = new ArchivoRam();
        ParentStore store = new ParentStore(archivo, cifrador, scope);
        ParentStore reabierto = null;
        try {
            MetadatosPadre datos = new MetadatosPadre(3, "cp.parent.sign.v1", publica, pareja, publicaHijo,
                origen, "0", VinculoPersistido.VINCULADO, null, null, null, null);
            PruebaPoliticas.<MetadatosPadre>esperar(c -> store.inicializar(datos, c));
            long[] tiempo = {0}; int[] envios = {0};
            ControlPoliticas control = control(store, conexion, tiempo, firmar, envios);
            PruebaPoliticas.<Unit>esperar(control::sincronizar);
            recibir(control, conexion, frames);
            ConfirmacionIntencion confirmacion = esperar(c -> control.prepararIntencion(Accion.LOCK_FOR, 60, c));
            exigir(leer(store).getPendiente() == null);
            PruebaPoliticas.<Unit>esperar(c -> control.enviarConfirmada(confirmacion, c));
            PendingIntentRecord original = leer(store).getPendiente();
            exigir(original != null && leer(store).getContadorLocal().equals("1"));
            System.out.println("ORDEN_DURADERA");
            for (int i = 1; i <= 3; i++) {
                exigir(("AVANZAR_" + (i * 5000)).equals(canal.readLine()));
                exigir(frames.isEmpty());
                tiempo[0] = i * 5000L;
                PruebaPoliticas.<Unit>esperar(control::avanzarReloj);
                exigir(original.equals(leer(store).getPendiente()));
                exigir(control.getResultado().getValue().getFase() != FasePolitica.APLICADA);
                System.out.println(i < 3 ? "REINTENTO_" + i : "REINTENTOS_AGOTADOS");
            }
            exigir(envios[0] == 3);
            recibir(control, conexion, frames);
            exigir(original.equals(leer(store).getPendiente()));
            exigir(control.getResultado().getValue().getFase() == FasePolitica.REQUIERE_CONFIRMACION);
            System.out.println("HASH_AJENO_NO_RESUELVE");
            recibir(control, conexion, frames);
            exigir(control.getResultado().getValue().getFase() == FasePolitica.PENDIENTE_APLICACION);
            exigir(original.equals(leer(store).getPendiente()));
            if (reiniciarRelay) {
                Long anterior = conexion.sesionPoliticas(); exigir(anterior != null);
                System.out.println("PENDIENTE_PERSISTIDO");
                exigir("RELAY_REINICIADO".equals(canal.readLine()));
                long vence = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
                while ((anterior.equals(conexion.sesionPoliticas()) || !conexion.getEstado().getValue().getCanalSano()) && System.nanoTime() < vence) {
                    conexion.avanzarReloj(); Thread.sleep(10);
                }
                Long actual = conexion.sesionPoliticas(); exigir(actual != null && !anterior.equals(actual));
                exigir(!conexion.enviarPolitica(anterior, Base64.getUrlDecoder().decode(original.getFrameB64())));
                PruebaPoliticas.<Unit>esperar(control::avanzarReloj);
                exigir(control.getResultado().getValue().getFase() == FasePolitica.SIN_ESTADO);
                exigir(original.equals(leer(store).getPendiente()) && envios[0] == 3 && frames.isEmpty());
                System.out.println("RECONECTADO_POLITICAS");
                exigir("HIJO_LISTO".equals(canal.readLine()));
            }
            PruebaPoliticas.<Unit>esperar(store::cerrar);
            reabierto = new ParentStore(archivo, cifrador, scope);
            exigir(original.equals(leer(reabierto).getPendiente()));
            ControlPoliticas nuevo = control(reabierto, conexion, tiempo, firmar, envios);
            PruebaPoliticas.<Unit>esperar(nuevo::avanzarReloj);
            exigir(envios[0] == 3);
            PruebaPoliticas.<Unit>esperar(nuevo::sincronizar);
            System.out.println("ALMACEN_REABIERTO");
            recibir(nuevo, conexion, frames);
            exigir(nuevo.getResultado().getValue().getFase() == FasePolitica.FALLO_APLICACION);
            exigir(leer(reabierto).getPendiente() == null && leer(reabierto).getContadorLocal().equals("1"));
            exigir(envios[0] == 3 && frames.isEmpty());
            conexion.segundoPlano(); exigir(conexion.sesionPoliticas() == null);
            System.out.println(reiniciarRelay ? "OK\tPOLITICAS_REINICIO_SIN_REPLAY_RECONCILIACION_RAM"
                : "OK\tPOLITICAS_SIN_ACK_DOS_REINTENTOS_RECONCILIACION_RAM");
        } finally {
            if (reabierto != null) PruebaPoliticas.<Unit>esperar(reabierto::cerrar);
            PruebaPoliticas.<Unit>esperar(store::cerrar);
            CoroutineScopeKt.cancel(scope, null);
        }
    }
}
