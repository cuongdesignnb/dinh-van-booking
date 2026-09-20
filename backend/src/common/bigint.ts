// VND amounts are bigint in the database and must cross the wire as strings so
// no value is silently rounded by JSON number parsing.
export function enableBigIntJson(): void {
  const proto = BigInt.prototype as unknown as { toJSON?: () => string };
  if (!proto.toJSON) proto.toJSON = function toJSON(this: bigint) { return this.toString(); };
}
