export class UpgradeEntity {
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  constructor(
    readonly method: string,
    readonly url: string,
    headers: Readonly<Record<string, string | readonly string[] | undefined>>,
  ) {
    this.headers = Object.freeze(Object.fromEntries(Object.entries(headers).map(([nombre, valor]) =>
      [nombre, Array.isArray(valor) ? Object.freeze([...valor]) : valor],
    )));
    Object.freeze(this);
  }
}
