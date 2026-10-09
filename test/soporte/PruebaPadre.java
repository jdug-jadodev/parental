package dev.controlparental.parent.network;

import dev.controlparental.protocol.*;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.*;
import kotlin.Unit;
import okhttp3.OkHttpClient;
import okhttp3.tls.HandshakeCertificates;
import okhttp3.tls.HeldCertificate;

public class PruebaPadre {
    private static void exigir(boolean valor) {
        if (!valor) throw new IllegalStateException("Comprobación JVM del padre fallida");
    }
    private static String b64(byte[] bytes) { return Base64.getEncoder().encodeToString(bytes); }
    private static String nonce() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    public static void main(String[] args) throws Exception {
        HeldCertificate certificado = new HeldCertificate.Builder().commonName("127.0.0.1")
            .addSubjectAlternativeName("127.0.0.1").build();
        KeyPairGenerator generador = KeyPairGenerator.getInstance("EC");
        generador.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair identidad = generador.generateKeyPair();
        String publica = Base64.getUrlEncoder().withoutPadding().encodeToString(identidad.getPublic().getEncoded());
        System.out.println("LISTO\t" + publica + "\t" + b64(certificado.certificatePem().getBytes(StandardCharsets.US_ASCII))
            + "\t" + b64(certificado.privateKeyPkcs8Pem().getBytes(StandardCharsets.US_ASCII)));
        String[] entrada = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8)).readLine().split("\t");
        String origen = entrada[0], pareja = entrada[1];
        ClaveVerificacion clavePadre = ClaveVerificacion.Companion.desdeSpki(Rol.PARENT, publica);
        ClaveVerificacion claveHijo = ClaveVerificacion.Companion.desdeSpki(Rol.CHILD, entrada[2]);
        FirmanteMensaje firmante = bytes -> {
            try {
                Signature firma = Signature.getInstance("SHA256withECDSA");
                firma.initSign(identidad.getPrivate()); firma.update(bytes); return firma.sign();
            } catch (GeneralSecurityException error) { throw new IllegalStateException("Firma de prueba fallida"); }
        };
        TransporteOkHttp sinConfianza = new TransporteOkHttp();
        CountDownLatch rechazado = new CountDownLatch(1);
        try {
            sinConfianza.abrir(origen.replace("https:", "wss:") + "/ws", new EventosRelay() {
                public void abierto(String protocolo) { throw new IllegalStateException("TLS no confiable aceptado"); }
                public void texto(String texto) { throw new IllegalStateException("Texto sobre TLS no confiable"); }
                public void fallo(boolean permanente) { if (permanente) rechazado.countDown(); }
            });
            exigir(rechazado.await(10, TimeUnit.SECONDS));
        } finally { sinConfianza.liberar(); }
        HandshakeCertificates confianza = new HandshakeCertificates.Builder().addTrustedCertificate(certificado.certificate()).build();
        OkHttpClient cliente = TransporteOkHttp.Companion.clienteSeguro().newBuilder()
            .sslSocketFactory(confianza.sslSocketFactory(), confianza.trustManager()).build();
        TransporteOkHttp transporte = new TransporteOkHttp(cliente);
        BlockingQueue<byte[]> recibidos = new ArrayBlockingQueue<>(8);
        TransporteRelay observado = (endpoint, eventos) -> transporte.abrir(endpoint, new EventosRelay() {
            public void abierto(String protocolo) { eventos.abierto(protocolo); }
            public void fallo(boolean permanente) { eventos.fallo(permanente); }
            public void texto(String texto) {
                eventos.texto(texto);
                byte[] bytes = texto.getBytes(StandardCharsets.UTF_8);
                if (CodecProtocolo.INSTANCE.leerFrame(bytes) instanceof SobreFirmado) exigir(recibidos.offer(bytes));
            }
        });
        RelayConnection conexion = new RelayConnection(observado, () -> System.nanoTime() / 1_000_000,
            () -> Unit.INSTANCE, prueba -> CriptografiaProtocolo.INSTANCE.firmarSobre(prueba, Proposito.AUTH, clavePadre, firmante), new SecureRandom());
        try {
            conexion.primerPlano();
            conexion.conectar(new ConfiguracionRelay(pareja, origen, publica));
            long vence = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
            while (!conexion.getEstado().getValue().getCanalSano() && System.nanoTime() < vence) {
                conexion.avanzarReloj(); Thread.sleep(10);
            }
            exigir(conexion.getEstado().getValue().getFase() == FaseRelay.AUTENTICADO);
            exigir(conexion.getEstado().getValue().getCanalSano());
            Long ticket = conexion.sesionPoliticas(); exigir(ticket != null);
            String syncNonce = nonce();
            SolicitudSincronizacion sync = new SolicitudSincronizacion(pareja, syncNonce, "PARENT", 1);
            SobreFirmado solicitud = CriptografiaProtocolo.INSTANCE.firmarSobre(sync, Proposito.MESSAGE, clavePadre, firmante);
            exigir(conexion.enviarPolitica(ticket, CodecProtocolo.INSTANCE.codificarFrame(solicitud)));
            byte[] stateFrame = recibidos.poll(10, TimeUnit.SECONDS); exigir(stateFrame != null);
            DocumentoVerificado estado = CriptografiaProtocolo.INSTANCE.verificarSobre(stateFrame, claveHijo, Proposito.MESSAGE);
            exigir(estado.getMensaje() instanceof EstadoDispositivo);
            EstadoDispositivo state = (EstadoDispositivo) estado.getMensaje();
            exigir(state.getPairId().equals(pareja) && state.getSyncNonce().equals(syncNonce));
            OrdenPolitica orden = new OrdenPolitica(pareja, state.getBootId(), state.getChildSessionId(), UUID.randomUUID().toString(),
                state.getCommandNonce(), "1", Accion.LOCK, null, "PARENT", 1);
            SobreFirmado comando = CriptografiaProtocolo.INSTANCE.firmarSobre(orden, Proposito.MESSAGE, clavePadre, firmante);
            byte[] commandFrame = CodecProtocolo.INSTANCE.codificarFrame(comando);
            exigir(conexion.enviarPolitica(ticket, commandFrame));
            byte[] ackFrame = recibidos.poll(10, TimeUnit.SECONDS); exigir(ackFrame != null);
            DocumentoVerificado respuesta = CriptografiaProtocolo.INSTANCE.verificarSobre(ackFrame, claveHijo, Proposito.MESSAGE);
            exigir(respuesta.getMensaje() instanceof Confirmacion);
            Confirmacion ack = (Confirmacion) respuesta.getMensaje();
            exigir(ack.getPairId().equals(pareja) && ack.getBootId().equals(state.getBootId()) && ack.getChildSessionId().equals(state.getChildSessionId()));
            exigir(ack.getCommandId().equals(orden.getCommandId()) && ack.getSeq().equals(orden.getSeq()));
            String hash = CriptografiaProtocolo.INSTANCE.verificarSobre(commandFrame, clavePadre, Proposito.MESSAGE).getPayloadSha256B64();
            exigir(ack.getCommandPayloadSha256B64().equals(hash));
            exigir(ack.getResult() == ResultadoAck.ACCEPTED_PENDING_ENFORCEMENT);
            conexion.segundoPlano(); exigir(conexion.sesionPoliticas() == null);
            System.out.println("OK\tTLS_AUTH_PONG_SYNC_STATE_POLICY_ACK_FONDO");
        } finally { conexion.desconectar(); transporte.liberar(); }
    }
}
