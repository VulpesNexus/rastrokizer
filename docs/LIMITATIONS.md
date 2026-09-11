# Known limitations

This lists everything Rastrokizer does not reproduce exactly, and for each one shows that the cause is a property of Photoshop's compositing or a deliberate scope choice with an exact alternative — not an unexplored corner. Each divergence was measured on premultiplied pixels against Photoshop's own live render, on 256 px fixtures over an opaque backdrop, in Photoshop 27.9.1.

## The one irreducible divergence: the antialiased edge band

Everywhere the content's own edge is antialiased and the group is not fully opaque there, the converted layer can differ from the live render by at most about 68/255, on a band one pixel wide, right where the content meets the stroke. This is the only difference that survives when the input is otherwise in scope, and it cannot be removed by any better construction.

### Why it happens

At an antialiased join pixel, Photoshop's live render is exactly

```
O = a*G + (1 - a)*R
```

where `a` is the content's own coverage at that pixel, `G` is the color the group's content composites to there, and `R` is the color the stroke composites to just outside the content. Fitting this against the measured live pixels reproduces them to under 1/255 across seventeen configurations (Pass Through and Normal groups; group opacity 1, 25, 50, 75, and 99; fill 0, 50, and 99; Multiply, Screen, Overlay, and Hue; stroke opacity 1, 50, and 99; shallow and deep knockout). No blend-mode formula appears in the partition itself — the point is the *weight*. Photoshop composites the content and the stroke into a single buffer and antialiases their shared boundary with one coverage value `a`.

Once the stroke is a separate layer below the group, the group composites over the ring rather than over the backdrop, so the same edge pixel becomes

```
a*(group over R) + (1 - a)*R
```

and the difference from the live render is

```
a*((group over B) - (group over R))
```

where `B` is the backdrop. That term is zero only where the group is fully opaque at the pixel — where the content covers, so none of the ring shows through underneath. That is precisely the measured behavior: a Pass Through or Normal group at 100 % opacity and fill is pixel-exact, and any reduced-opacity, reduced-fill, or non-occluding-mode group shows the one-pixel band.

### Why it is irreducible, not just imperfect

The lost quantity is the *joint* coverage of the content and the stroke at their shared boundary, which a single buffer holds once and two separate layers cannot reconstruct from their two independent alphas. This was tested directly: harvesting Photoshop's own native stroke pixels — its exact stroke color and alpha, not a solid recolor — leaves the identical band. The error is therefore topological, a consequence of splitting one composite into two layers, not a coverage-reconstruction deficiency that a sharper stroke could fix. The only construction with no band is one where Photoshop composites the content and the stroke in a single buffer, which is exactly the live style on the group — the thing being moved off.

### How large it gets

- Non-occluding group modes (Screen, Overlay, Difference, Hue, and the rest), group opacity or fill below 100 %, and knockout: the one-pixel band, at most about 68/255.
- A stroke below 100 % opacity: the same band, at most about 55/255.
- Content that is partial-alpha *everywhere* (a 55 %-opacity child, a gradient ramp): the join condition fails across the whole silhouette rather than on a line, so the band spreads into an area, at most about 54/255.

## Refusals

Rastrokizer refuses the cases below with a dialog rather than convert them wrongly. Each is either a Photoshop boundary or a scoped choice that has an exact alternative.

| Refused input | Why | Exact alternative |
| --- | --- | --- |
| Inside and Center strokes | The layer construction cannot match Inside geometry — a fill-0 ring reconstruction diverges by more than 1600 px. | *Create Layers* is exact for an Inside stroke on a group; use it, or the Action recipe in [AS_AN_ACTION.md](AS_AN_ACTION.md). |
| Gradient and pattern strokes | The recolor step is a solid *Color Overlay*, which cannot carry a gradient or a pattern. | The Action recipe reproduces them exactly, because Photoshop renders the stroke itself. |
| A live text child | Fine concave glyph detail diverges by up to 40/255 — the same edge mechanism at a geometry the rebuilt stroke antialiases slightly differently. | Rasterize the text first, then convert, or use the Action recipe. |
| `transparencyShapesLayer` off | The flag changes where Photoshop inserts the effect in its compositing graph and makes the outside stroke vanish; that is a different, unsolved geometry, not the standard outside stroke. | Leave the stroke live on the group. |
| Any other effect in the style | The construction is proven only for a lone outside stroke; other effects were not verified to survive it. | Remove or rasterize the other effects first. |
| Masked or clipped groups | Out of the verified scope; the mask and clip interactions with the separated layer were not proven safe. | — |

The text, gradient, pattern, and Inside refusals are conservative on purpose: rather than emit a result that is close but wrong, the script declines and points at the route that is exact.

## What turned out not to be a limit

Several things an earlier audit recorded as limits were re-examined and are reproduced faithfully, so they are deliberately absent from the list above:

- **Knockout** (Shallow and Deep) is preserved on the group, edge-band only.
- **Blend If** is preserved on the group.
- **The transparency-shapes flag** and the group's **opacity and fill** are preserved with no reset.

The conversion removes only the Stroke and disturbs nothing else, so every other blending option rides along untouched. See [HOW_IT_WORKS.md](HOW_IT_WORKS.md) for the mechanism.
