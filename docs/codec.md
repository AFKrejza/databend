# Codec: bytes ⇄ samples

`src/core/codec/` turns the byte stream into floating-point audio samples in `[-1, 1)` and back. This is what Audacity's "Import Raw → encoding" setting did. The choice of codec changes the look a lot, because it decides which byte values count as "loud" and which as "quiet".

```ts
type Encoding = 'mulaw' | 'alaw' | 'u8' | 's8' | 's16be' | 's16le';
decode(bytes: Uint8Array, enc: Encoding): Float32Array
encode(samples: Float32Array, enc: Encoding, outLength: number): Uint8Array
```

Shared encoder rules:
- `NaN` becomes 0, and values outside the range are clamped to `[-1, 1)`.
- `encode` always returns exactly `outLength` bytes, the original stream length.

## μ-law (default, `mulaw.ts`)
This is ITU G.711 μ-law, the same codec libsndfile/Audacity use. One byte is one sample.

Decode:
```
u = ~byte & 0xFF
sign = u & 0x80, exponent = (u >> 4) & 7, mantissa = u & 0x0F
magnitude = (((mantissa << 3) + 0x84) << exponent) - 0x84      // 0 … 32124
sample = (sign ? -magnitude : magnitude) / 32768
```
Encode reverses this: add the 0x84 bias, find the exponent (highest set bit), take 4 mantissa bits, and invert. For speed, decode with a 256-entry lookup table. Encode with the formula, or with a 16384-entry table indexed by `sample >> 2`.

**Why it looks the way it does:** the mapping isn't monotonic in brightness.

| Byte (pixel value) | Sample |
|---|---|
| `0x00` (black) | loudest negative |
| `0x7F` (127) | −0 |
| `0x80` (128) | loudest positive |
| `0xFF` (white) | +0 |

So white and mid-grey are both "silence", while black and 128 are "loud". A small change in amplitude can flip a pixel from dark to bright, which causes much of the classic databend colour noise.

**The double zero:** `0x7F` and `0xFF` both mean zero. To keep a no-op chain lossless, decode `0x7F` to `-0` and make the encoder check the sign bit (`Object.is(x, -0)` or `1/x < 0`), not `x < 0`. Audacity doesn't do this, so pixel value 127 turns into 255 there. We could add an "Audacity quirk" toggle later to recreate that.

## A-law (`alaw.ts`)
G.711 A-law: XOR the byte with `0x55`, then apply a segment/mantissa decode similar to μ-law. It has no exact zero (`0xD5`/`0x55` → ±8/32768), so a round trip is exact. It looks similar to μ-law but with different segment boundaries.

## Linear PCM (`pcm.ts`)
| Encoding | Decode | Notes |
|---|---|---|
| `u8` | `(b - 128) / 128` | Brightness maps directly to amplitude, and 128 is silence. Cleanest results. |
| `s8` | `((b << 24) >> 24) / 128` | 0 is silence, 127 is loudest, and 128 wraps to most negative. Bright/dark flips at mid-grey. |
| `s16be` | `int16(b[2i] << 8 \| b[2i+1]) / 32768` | Two bytes make one sample, so one sample straddles two channels (R+G, B+next R…). High byte first. |
| `s16le` | `int16(b[2i+1] << 8 \| b[2i]) / 32768` | Low byte first. The low byte gets mangled more, giving finer noise. |

For the 16-bit modes an odd-length stream is padded with one zero byte before decoding, and that byte is dropped on encode. Effects then work on `n/2` samples, so the engine's pixel→sample unit conversion must use `bytesPerSample = 2`. See [effects.md](effects.md#units).

## Tests
- Round trip `encode(decode(b))` is identical for all 256 byte values, for every encoding (with the −0 rule for μ-law).
- μ-law decode matches a reference table taken from G.711.
- The encoder clamps ±2, `NaN` and ±Infinity without throwing.
