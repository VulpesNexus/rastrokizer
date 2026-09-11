# Rastrokizer

A Photoshop script that moves a group's Outside stroke onto its own pixel layer, faithfully, in one history step.

## Why

In Photoshop 2026 (27.9.1), *Layer > Layer Style > Create Layers* is wrong when the styled layer is a group. It rebuilds each effect from the group's composite with the whole style already applied, then clips the result to the group's original effect bounds. An 8 px Outside stroke comes out 8 px along straight edges but about 16 px on the diagonal: doubled and squared. The same command is exact on a plain layer, and so are *Merge Group* and *Rasterize Layer Style* on a group, so this script builds the layer from those instead.

## Use

Select the group, then *File > Scripts > Browse…* and pick *Rastrokizer.jsx*. The group ends with no layer style and its blend mode, opacity, and fill unchanged, and a new layer sits directly below it, named after the group ("Border's Outer Stroke" for a group named "Border") and carrying the stroke's own blend mode. It is one history step, so *Undo* reverts everything. The script replaces whatever layer style you last copied with *Copy Layer Style*.

## What it converts, and how faithfully

Every number below is a measured difference from the live render (premultiplied RGBA, 256 px fixtures over an opaque backdrop, Photoshop 27.9.1). "Exact" is 0 px.

| Configuration | Result |
| --- | --- |
| Pass Through or Normal group, 100 % opacity and fill, opaque content | **exact** |
| Any of the 27 stroke blend modes | **exact** (copied onto the new layer; Dissolve stays Normal) |
| Lighten, Screen, Color Dodge, Linear Dodge, Lighter Color, Difference, Exclusion, or Subtract groups | **exact** |
| Screen group at 50 % opacity; group opacity 1 % | **exact** |
| Smart-object children, rectangles, partial-alpha content, two children | **exact** |
| Stroke sizes 0.5 to 250 px; RGB, Grayscale, CMYK, and Lab; 8, 16, and 32 bit | **exact** |
| Other group blend modes (Multiply, Overlay, Hue, …) | edge only: a one-pixel band at the content/stroke join, at most about 70/255 |
| Group opacity or fill below 100 % | edge only, same band; above 75 % a faint tint over the content instead (3/255 at 99 %) |
| Stroke at less than 100 % opacity | edge only, at most 54/255 at 1 % falling to 1/255 at 99 % |

The edge band is inherent to a stroke on its own layer: the live effect is composited with the content in one pass, a separate layer in two.

It **refuses**, with the reason in a dialog: Inside and Center strokes (*Create Layers* is exact for an Inside stroke on a group, so use that), gradient and pattern strokes, styles with any other effect, masked or clipped groups, and groups containing a live text layer (fine glyph detail diverges by up to 40/255; rasterize the text first).

**Knockout caveat.** Photoshop 27.9.1 does not report a layer's knockout, and *Clear Layer Style* discards it, so by default a group's knockout is reset to *None*. Set `PRESERVE_BLENDING_OPTIONS` to `true` at the top of the script to disable the stroke in place instead: every blending option survives, at the cost of a switched-off Stroke effect remaining in the group's style.

## How it works

1. Duplicate the group, clear the copy's style (which also resets the copy to 100 % opacity and fill, so the merged silhouette is the true full-alpha content), and merge it.
2. *Copy Layer Style* and *Paste Layer Style* onto the merged layer, then rasterize: the children plus the stroke exactly as Photoshop renders them. Photoshop's own copy is used because a stroke rebuilt from a read-back descriptor loses the half pixel of a fractional size.
3. Rasterize a Color Overlay in the stroke's color: solid stroke color on the stroked silhouette. That solid disc is exact for a Pass Through or Normal group at 100/100, because the opaque content covers it just as Photoshop's own Outer Stroke sits under the layer. For any other mode, or opacity or fill below 75 %, the content's own alpha is subtracted and only the ring is kept.
4. Place it below the group, give it the stroke's blend mode, clear the group's style, and restore the group's blend mode, opacity, and fill (*Clear Layer Style* resets the last two).

Two facts about Photoshop drive the design: a group's Outer Stroke is rendered outside the group's blend mode and opacity, so the layer must sit below the group rather than inside it, and *Clear Layer Style* resets opacity and fill to 100.

## As an Action

Every step is an ordinary command, so the same result can be recorded as an Action, and in one respect a better one: *Create Layers* is exact on a plain layer and is recordable through *Insert Menu Item*, which makes the construction color, gradient, and pattern agnostic. An Action cannot restore opacity and fill dynamically, so it is safe only for groups at 100/100.

With a document open, a group carrying an Outside stroke selected, and the *Layers* panel visible:

1. *Window > Actions*, then from the panel menu *New Set…*, then *New Action…* and *Record*.
2. *Layer > Layer Style > Copy Layer Style*.
3. *Layer > Duplicate Group…*, then *OK*. The copy is selected, above the original.
4. *Layer > Layer Style > Clear Layer Style* (on the copy).
5. *Layer > Merge Group* (*Ctrl+E*). The copy becomes a plain layer.
6. *Layer > Layer Style > Paste Layer Style*.
7. From the *Actions* panel menu, *Insert Menu Item…*, then choose *Layer > Layer Style > Create Layers* from the menu bar and click *OK*. This records the step without running it.
8. Now really run *Layer > Layer Style > Create Layers* from the menu so the document catches up (this records nothing). The merged content layer should still be highlighted, with the Outer Stroke layer directly below it.
9. *Alt+[* twice: select backward past the Outer Stroke onto the original group. (If the Outer Stroke was highlighted after step 8, press it once.)
10. *Ctrl+]* (*Bring Forward*): the original group moves above the Outer Stroke.
11. *Layer > Layer Style > Clear Layer Style* (on the original group).
12. *Alt+]* (select forward) onto the merged content layer, then *Layer > Delete > Layer*.
13. Stop recording. Test on a throwaway document, then on a group with a different name: every step is relative, so none depends on layer names.

## Verifying

*verify/verify.jsx* builds each case twice, exports the live render and the converted render, and *verify/grade.py* compares them and checks the group's structure. Run it with *verify/run.ps1* from a PowerShell prompt while Photoshop 2026 is open with no documents you care about; it only ever touches documents it creates.
