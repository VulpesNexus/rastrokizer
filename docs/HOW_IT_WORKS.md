# How it works

Rastrokizer never runs *Create Layers* on the group, because that is the command that produces the doubled, clipped stroke. It builds the stroke layer from commands that are exact on a group instead.

1. Duplicate the group, clear the copy's style (which also resets the copy to 100 % opacity and fill, so the merged silhouette is the true full-alpha content), and merge it into one pixel layer: the children exactly as drawn.
2. *Copy Layer Style* and *Paste Layer Style* onto that layer, then rasterize: the children plus the stroke exactly as Photoshop renders them. Photoshop's own copy is used because a stroke rebuilt from a read-back descriptor loses the half pixel of a fractional size.
3. Rasterize a *Color Overlay* in the stroke's color over that: solid stroke color on the stroked silhouette. For a Pass Through or Normal group at 100 % opacity and fill, that solid disc is exact, because the opaque content covers it just as Photoshop's own Outer Stroke sits under the layer. For any other mode, or opacity or fill below 100 %, the disc would show through the content, so the content's own alpha is subtracted and only the ring is kept.
4. Place it directly below the group, give it the stroke's own blend mode, and remove the group's Stroke non-destructively: a write that rewrites the group's style with an empty Stroke slot.

## Why the removal is non-destructive

Step 4 does not use *Clear Layer Style* on the group. *Clear Layer Style* resets the group's opacity, fill, and knockout to their defaults, which is why it is used only on the throwaway copy in step 1, where the reset to full alpha is exactly what is wanted. On the group itself, the Stroke is removed by rewriting the style with an empty Stroke slot, which touches nothing else — the group keeps its blend mode, opacity, fill, knockout, Blend If, transparency-shapes flag, and every other blending option, with no read and no restore. The whole conversion is one history step, so a single *Undo* reverts it.

## Two facts about Photoshop that drive the design

- A group's Outer Stroke is rendered *outside* the group's blend mode and opacity. A Screen group at 50 % still shows a full-strength stroke. So the separated stroke layer must sit below the group, at Normal, carrying the stroke's own effect blend mode — not inside the group, where the group's mode and opacity would wrongly attenuate it.
- *Clear Layer Style* resets opacity, fill, and knockout. That reset is wanted on the merge copy and unwanted on the group, which is the whole reason the group's Stroke is removed by the empty-slot write instead.

For where this construction diverges from the live render, and why those differences are Photoshop's and not the construction's, see [LIMITATIONS.md](LIMITATIONS.md).
