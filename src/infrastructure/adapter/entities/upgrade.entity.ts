export class UpgradeEntity {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  constructor(
    readonly method: string,
    readonly url: string,
    headers: Readonly<Record<string, string | string[] | undefined>>,
  ) {
    this.headers = Object.freeze({ ...headers });
    Object.freeze(this);
  }
}
