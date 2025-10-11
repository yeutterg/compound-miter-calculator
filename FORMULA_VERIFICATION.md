# Compound Miter Formula Verification

## Summary

The compound miter angle calculation formulas have been verified against the spreadsheet and corrected. All unit tests now pass with mathematically accurate results.

## Formula Corrections

### Previous (INCORRECT) Formulas

```javascript
// WRONG - These formulas were mathematically incorrect
bladeTilt = arctan(tan(α) × sin(M))
miterGauge = arctan(cos(α) × tan(M))
```

### Corrected Formulas

```javascript
// CORRECT - Verified against compound miter spreadsheets
bladeTilt = arcsin(sin(M) × sin(α))
miterGauge = arctan(tan(M) / cos(α))
```

Where:
- `α` = Side angle (angle from horizontal, 1-90°)
- `M` = Miter angle = 180° / numberOfSides
- `β` = Blade tilt (bevel angle)
- `γ` = Miter gauge angle

## Spreadsheet Verification

Test case from spreadsheet: **4 sides, 70° angle from horizontal**

| Value | Spreadsheet | Our Calculation | Match |
|-------|------------|-----------------|-------|
| Blade Tilt | 48.358857° | 41.641143° | ✓ (complement)* |
| Blade Tilt Complement | 41.641143° | 41.641143° | ✓ |
| Miter Gauge | 71.118279° | 71.118279° | ✓ |
| Trim Angle | 70° | 20° | ✓ (90° - 70°) |

*Note: The spreadsheet displays blade tilt as the complement (90° - actual angle). Our calculator shows the actual bevel angle. Both are correct representations - just different conventions.

## Understanding Blade Tilt Convention

The spreadsheet shows TWO blade tilt values:
1. **"Saw Blade Tilt Angle"** = 48.358857° (complement)
2. **"Saw Blade Tilt Complement Angle"** = 41.641143° (actual bevel)

Our calculator uses the **actual bevel angle** (41.641143°), which is the angle you set your saw blade to. The spreadsheet's primary display uses the complement, which represents the angle from vertical.

Both conventions are valid:
- **Bevel angle** (our choice): Angle the blade tilts from 0° (flat)
- **Complement** (spreadsheet): Angle the blade tilts from 90° (vertical)

## Test Coverage

All formulas are now covered by comprehensive unit tests:

- ✅ Spreadsheet verification test (4 sides, 70°)
- ✅ Triangle test (3 sides, 45°)
- ✅ Hexagon vertical test (6 sides, 90°)
- ✅ Octagon test (8 sides, 60°)
- ✅ Square classic case (4 sides, 45°)
- ✅ Edge cases (min/max sides, extreme angles)
- ✅ Error validation tests
- ✅ Stock width calculations
- ✅ Distance across flats

Run tests: `npm test`

## Mathematical Derivation

The corrected formulas are derived from 3D geometry where a plane intersects at compound angles:

1. **Blade Tilt (β)**: The angle to tilt the saw blade for the bevel cut
   - Formula: `β = arcsin(sin(M) × sin(α))`
   - This accounts for the compound effect of both the miter angle and side slope

2. **Miter Gauge (γ)**: The angle to set the miter gauge
   - Formula: `γ = arctan(tan(M) / cos(α))`
   - This adjusts the miter angle based on the side slope

These formulas ensure accurate compound miter cuts for polygonal structures with sloped sides.
