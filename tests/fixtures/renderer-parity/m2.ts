export const m2SocketUrl =
  "https://raw.githubusercontent.com/Kmshanley/PicoSat-Initiative/9b3e0e6cb27fabb48df7f36363ebddf051e3932b/Hardware/OBC-Flight_Rev0/Parts/MDT350M01401VT/MDT350M01401VT.stp"
export const m2SocketSha256 =
  "547748baa39bc6eca21e192a1f2f2c7068403ddbc8096a4c1c7375fb7508cb55"
export const m2DrawingUrl =
  "https://raw.githubusercontent.com/Kmshanley/PicoSat-Initiative/9b3e0e6cb27fabb48df7f36363ebddf051e3932b/Hardware/OBC-Flight_Rev0/Parts/MDT350M01401VT/mdt350x01401vt.pdf"
export const m2CardContactReferenceUrl =
  "https://raw.githubusercontent.com/adryzz/M.2-kicad-lib/5bc128e8b7f72c07326cd24eef6d57e996072a99/footprints/M.2-Key-M.pretty/M.2-Key-M-2230.kicad_mod"

// GS-12-1248 rev B pp.8-9 specifies a 0.55 MAX gold leading-edge inset,
// not a 3.50 pad length (3.50 +/-0.15 is the full-radius notch depth).
// The reference CARD footprint above places 1.45-long pads at y=29.725
// behind the y=31 insertion edge: its copper window is 0.55..2.00.
// We retain that 2.00 rear edge and choose a nominal 0.50 leading inset,
// giving 1.50-long pads and 0.05 allowance against the published inset limit.
// These are coupon design choices, not a claimed normative pad length.
// Only its longitudinal pad datum is used, not its pin bank or key placement.

// MDT350X01401VT revision 2, M key: positions 59-66 are absent.
export const m2OddPins = Array.from({ length: 38 }, (_, i) => 2 * i + 1).filter(
  (pin) => pin < 59 || pin > 66,
)
export const m2EvenPins = Array.from(
  { length: 37 },
  (_, i) => 2 * i + 2,
).filter((pin) => pin < 59 || pin > 66)

// Unmodified shared-family STEP "MDT350M0X001VT_C3D", in mm:
// native X spans the contacts, +Y rises from the solder plane, Z is thickness.
// The housing is X +/-12.1, Y 0..5.5, Z +/-1.75; pegs reach Y=-0.6.
// Slot floor Y=2.839, walls Z=+/-0.46, ends X=+/-10.075.
// Key X=-6.125 +/-0.55; the card notch is 1.20 wide, leaving 0.05 per side.
// Fully seated insertion depth is 5.500-2.839=2.661, NOT the notch depth.
// The undeflected springs enter the +/-0.40 card faces at native
// Y=3.818161..4.265668 (0.979161..1.426668 from the insertion edge).
// The coupon's 0.50..2.00 copper window covers that engagement band.
// This measured model datum is not a certified fit for every family revision.
export const m2InsertionHeight = 2.839
