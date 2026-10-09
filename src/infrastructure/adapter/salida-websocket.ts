export interface SocketSalida {
  readonly readyState: number;
  readonly bufferedAmount: number;
  send(bytes: string | Uint8Array, opciones: { binary: false }, callback: (error?: Error) => void): void;
}

export function enviarAcotado(socket: SocketSalida, bytes: string | Uint8Array, fallar: () => void, completar: () => void = () => {}): boolean {
  if (socket.readyState !== 1) return false;
  const longitud = typeof bytes === 'string' ? Buffer.byteLength(bytes) : bytes.byteLength;
  const cabecera = longitud <= 125 ? 2 : longitud <= 65535 ? 4 : 10;
  if (socket.bufferedAmount + longitud + cabecera > 65536) { fallar(); return false; }
  try {
    socket.send(bytes, { binary: false }, (error) => { completar(); if (error) fallar(); });
    return true;
  } catch { fallar(); return false; }
}
