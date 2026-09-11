/* Rastrokizer: put a group's outside stroke on its own layer, faithfully.
 *
 * Why: in Photoshop 27.9.1, Layer > Layer Style > Create Layers on a GROUP does not build its
 * effect layers from the group's children.  It rebuilds them from the group's composite with
 * the whole style already applied, then clips each one to the group's original effect bounds.
 * An outside stroke therefore comes out about twice as wide: the clip hides that along straight
 * edges, and the stroke bulges out square toward corners and curves.  Merge Group and
 * Rasterize Layer Style are exact on groups, and so is Create Layers on a plain layer, so this
 * builds the layer from those instead:
 *
 *   1. duplicate the group, clear the copy's style (this also resets the copy to 100% opacity
 *      and fill, which is wanted: the merged silhouette must be the true full-alpha content),
 *      and merge it into one pixel layer: the children exactly as drawn;
 *   2. Copy and Paste Layer Style onto it and rasterize: the children plus the Stroke, exactly
 *      as rendered.  Photoshop's own copy is used because rebuilding the Stroke from a read-back
 *      descriptor lost the half pixel of a 4.5 px Stroke;
 *   3. rasterize a Color Overlay in the Stroke's color over that: solid stroke color on the
 *      stroked silhouette.  For a Pass Through or Normal group at 100% opacity and fill that
 *      solid disc is pixel-exact, because the opaque content covers it just as Photoshop's own
 *      Outer Stroke sits under the layer.  For any other group mode, opacity, or fill, the
 *      disc would show through the content, so the content's own alpha is subtracted and only
 *      the ring is kept;
 *   4. place it directly below the group, give it the Stroke's own blend mode, and remove the
 *      group's Stroke non-destructively: a setd that rewrites the group's style with an empty
 *      Stroke slot.  Unlike Clear Layer Style, this touches nothing else, so the group keeps
 *      its blend mode, opacity, fill, and every advanced blending option (knockout, Blend If,
 *      transparency-shapes flag, and the rest) with no reset and no restore.
 *
 * Measured fidelity against the live render (premultiplied, 256 px fixtures, 2026-09-11):
 *   exact (0 px)   Pass Through / Normal groups at 100/100; every one of the 27 stroke blend
 *                  modes; the occluding group modes; fill 0; smart-object children; rectangles
 *                  and hard, concave, and 55%-partial-alpha content; sizes 0.5-250;
 *                  RGB/Gray/CMYK/Lab, 8/16/32 bit.
 *   edge only      the antialiased join between content and stroke can differ by up to about
 *                  70/255 on a one-pixel band for: the non-occluding group modes (Screen, Hue,
 *                  Overlay, and the rest), group opacity or fill below 100, knockout, and a
 *                  Stroke at less than 100% opacity.  It widens to the whole silhouette when the
 *                  content is itself partial-alpha everywhere (a gradient ramp).  This band is
 *                  irreducible for a stroke on its own layer: the live render composites the
 *                  content and stroke in one buffer and antialiases their shared boundary with a
 *                  single coverage, while two layers composite it twice.  See
 *                  docs/LIMITATIONS.md.
 *   refused        Inside and Center strokes (Create Layers is exact for Inside on a group),
 *                  gradient and pattern strokes, styles with any other effect, masked or
 *                  clipped groups, and groups containing a text layer (fine concave detail
 *                  diverges by up to 40/255).
 *
 * Use: select the group, then File > Scripts > Browse... (Rastrokizer.jsx)  One history step.
 * ExtendScript (ES3).
 */

#target photoshop

$.global.Rastrokizer = (function () {

    function cid(s) { return charIDToTypeID(s); }
    function sid(s) { return stringIDToTypeID(s); }
    function t2s(t) { return typeIDToStringID(t); }

    var STROKE_MODE_TO_DOM = {
        normal: 'NORMAL', dissolve: 'DISSOLVE', darken: 'DARKEN', multiply: 'MULTIPLY',
        colorBurn: 'COLORBURN', linearBurn: 'LINEARBURN', darkerColor: 'DARKERCOLOR',
        lighten: 'LIGHTEN', screen: 'SCREEN', colorDodge: 'COLORDODGE', linearDodge: 'LINEARDODGE',
        lighterColor: 'LIGHTERCOLOR', overlay: 'OVERLAY', softLight: 'SOFTLIGHT', hardLight: 'HARDLIGHT',
        vividLight: 'VIVIDLIGHT', linearLight: 'LINEARLIGHT', pinLight: 'PINLIGHT', hardMix: 'HARDMIX',
        difference: 'DIFFERENCE', exclusion: 'EXCLUSION', blendSubtraction: 'SUBTRACT',
        blendDivide: 'DIVIDE', hue: 'HUE', saturation: 'SATURATION', color: 'COLORBLEND',
        luminosity: 'LUMINOSITY'
    };

    function targetRef() {
        var ref = new ActionReference();
        ref.putEnumerated(cid('Lyr '), cid('Ordn'), cid('Trgt'));
        return ref;
    }

    function describe(doc, layer) {
        doc.activeLayer = layer;
        return executeActionGet(targetRef());
    }

    function onTarget(doc, layer, eventId) {
        doc.activeLayer = layer;
        var d = new ActionDescriptor();
        d.putReference(cid('null'), targetRef());
        executeAction(eventId, d, DialogModes.NO);
    }

    function clearStyle(doc, layer) { onTarget(doc, layer, sid('disableLayerStyle')); }

    function rasterizeStyle(doc, layer) {
        doc.activeLayer = layer;
        var d = new ActionDescriptor();
        d.putReference(cid('null'), targetRef());
        d.putEnumerated(cid('What'), sid('rasterizeItem'), sid('layerStyle'));
        executeAction(sid('rasterizeLayer'), d, DialogModes.NO);
    }

    function copyStyle(doc, layer) {
        doc.activeLayer = layer;
        executeAction(cid('CpFX'), undefined, DialogModes.NO);
    }

    function pasteStyle(doc, layer) {
        doc.activeLayer = layer;
        executeAction(cid('PaFX'), undefined, DialogModes.NO);
    }

    function setLayerEffects(doc, layer, fx) {
        doc.activeLayer = layer;
        var ref = new ActionReference();
        ref.putProperty(cid('Prpr'), cid('Lefx'));
        ref.putEnumerated(cid('Lyr '), cid('Ordn'), cid('Trgt'));
        var d = new ActionDescriptor();
        d.putReference(cid('null'), ref);
        d.putObject(cid('T   '), cid('Lefx'), fx);
        executeAction(cid('setd'), d, DialogModes.NO);
    }

    /* A Color Overlay in the Stroke's color and nothing else, so no size is re-encoded. */
    function setOverlay(doc, layer, stroke) {
        var overlay = new ActionDescriptor();
        overlay.putBoolean(cid('enab'), true);
        overlay.putEnumerated(cid('Md  '), cid('BlnM'), cid('Nrml'));
        overlay.putUnitDouble(cid('Opct'), cid('#Prc'), 100);
        overlay.putObject(cid('Clr '), stroke.getObjectType(sid('color')),
                          stroke.getObjectValue(sid('color')));
        var fx = new ActionDescriptor();
        fx.putUnitDouble(cid('Scl '), cid('#Prc'), 100);
        fx.putObject(cid('SoFi'), cid('SoFi'), overlay);
        setLayerEffects(doc, layer, fx);
    }

    /* Remove the group's Stroke without disturbing anything else.  A setd on Lefx replaces the
     * whole style object, so writing a style that holds only an empty Stroke list (frameFXMulti)
     * leaves no Stroke and no other effect, while the layer's own blending options -- blend mode,
     * opacity, fill, knockout, Blend If, the transparency-shapes flag -- are separate from Lefx
     * and ride through untouched.  Clear Layer Style, by contrast, resets opacity, fill, and
     * knockout, which is why it is used only on the throwaway copy, never on the group itself. */
    function removeStroke(doc, layer) {
        var fx = new ActionDescriptor();
        fx.putUnitDouble(cid('Scl '), cid('#Prc'), 100);
        fx.putList(sid('frameFXMulti'), new ActionList());
        setLayerEffects(doc, layer, fx);
    }

    /* Subtract the content's own silhouette from the solid disc, leaving only the ring. */
    function ringify(doc, disc, contentOnly) {
        var d = new ActionDescriptor();
        var sel = new ActionReference();
        sel.putProperty(cid('Chnl'), cid('fsel'));
        d.putReference(cid('null'), sel);
        var alpha = new ActionReference();
        alpha.putEnumerated(cid('Chnl'), cid('Chnl'), cid('Trsp'));
        alpha.putIdentifier(cid('Lyr '), contentOnly.id);
        d.putReference(cid('T   '), alpha);
        executeAction(cid('setd'), d, DialogModes.NO);
        doc.activeLayer = disc;
        executeAction(cid('Dlt '), undefined, DialogModes.NO);
        doc.selection.deselect();
    }

    function enumOf(desc, name) {
        return desc.hasKey(sid(name)) ? t2s(desc.getEnumerationValue(sid(name))) : '';
    }

    /* A percentage stored either as a percent unit or as 0-255, whichever Photoshop used. */
    function percentOf(desc, name) {
        var key = sid(name);
        if (!desc.hasKey(key)) { return 100; }
        return desc.getType(key) === DescValueType.UNITDOUBLE ? desc.getUnitDoubleValue(key)
                                                               : desc.getInteger(key) * 100 / 255;
    }

    /* Every effect that is part of the style, as [name, descriptor].  Photoshop 27.9.1 also
     * reports a placeholder for each multi-capable effect the style does not use, marked
     * present=false; those are skipped.  A switched-off effect reads present=true,
     * enabled=false and is kept.  Where a "...Multi" list and the single key both exist, the
     * single key mirrors the list's first entry and is skipped. */
    function effectEntries(fx) {
        var out = [];
        function add(name, effect) {
            if (effect.hasKey(sid('present')) && !effect.getBoolean(sid('present'))) { return; }
            out.push([name, effect]);
        }
        for (var i = 0; i < fx.count; i++) {
            var key = fx.getKey(i);
            var name = t2s(key);
            if (name === 'scale' || name === 'masterFXSwitch') { continue; }
            if (fx.getType(key) === DescValueType.LISTTYPE) {
                var list = fx.getList(key);
                for (var j = 0; j < list.count; j++) {
                    add(name.replace(/Multi$/, ''), list.getObjectValue(j));
                }
            } else if (fx.getType(key) === DescValueType.OBJECTTYPE
                       && !fx.hasKey(sid(name + 'Multi'))) {
                add(name, fx.getObjectValue(key));
            }
        }
        return out;
    }

    function hasTextLayer(layers) {
        for (var i = 0; i < layers.length; i++) {
            var l = layers[i];
            if (l.typename === 'LayerSet') { if (hasTextLayer(l.layers)) { return true; } }
            else if (l.kind === LayerKind.TEXT) { return true; }
        }
        return false;
    }

    /* What convert() needs, or an Error saying why this group is not converted. */
    function inspect(doc, group) {
        if (!group || group.typename !== 'LayerSet') { throw new Error('Select a group.'); }
        var layer = describe(doc, group);
        if ((layer.hasKey(sid('hasUserMask')) && layer.getBoolean(sid('hasUserMask')))
            || (layer.hasKey(sid('hasVectorMask')) && layer.getBoolean(sid('hasVectorMask')))) {
            throw new Error('The group has a mask; that case is not verified.');
        }
        if (layer.hasKey(sid('group')) && layer.getBoolean(sid('group'))) {
            throw new Error('The group is clipped to the layer below; a layer inserted under '
                            + 'it would break the clipping.');
        }
        if (!layer.hasKey(sid('layerEffects'))) { throw new Error('The group has no layer style.'); }
        var fx = layer.getObjectValue(sid('layerEffects'));
        if (fx.hasKey(sid('masterFXSwitch')) && !fx.getBoolean(sid('masterFXSwitch'))) {
            throw new Error("The group's effects are switched off.");
        }
        var entries = effectEntries(fx);
        if (!entries.length) { throw new Error('The group has no Stroke.'); }
        if (entries.length > 1 || entries[0][0] !== 'frameFX') {
            var names = [];
            for (var i = 0; i < entries.length; i++) { names.push(entries[i][0]); }
            throw new Error("The group's style is not a single Stroke (it holds " + names.join(', ')
                            + '). Only that is verified, because the Stroke is removed with Clear '
                            + 'Layer Style, which would take the rest with it.');
        }
        var stroke = entries[0][1];
        if (stroke.hasKey(sid('enabled')) && !stroke.getBoolean(sid('enabled'))) {
            throw new Error('The Stroke is switched off.');
        }
        var position = enumOf(stroke, 'style');
        if (position === 'insetFrame') {
            throw new Error('The Stroke is Inside. Layer Style > Create Layers measured exact for '
                            + 'an Inside Stroke on a group, so use that.');
        }
        if (position !== 'outsetFrame') {
            throw new Error('The Stroke is not Outside; only Outside is verified.');
        }
        if (enumOf(stroke, 'paintType') !== 'solidColor') {
            throw new Error('The Stroke is not a solid color; the recolor step would destroy '
                            + 'a gradient or pattern.');
        }
        if (hasTextLayer(group.layers)) {
            throw new Error('The group contains a text layer; the rebuilt stroke differs by up to '
                            + '40/255 around fine glyph detail. Rasterize the text first.');
        }
        var blend = String(group.blendMode).replace('BlendMode.', '');
        var opacity = group.opacity;
        var fill = percentOf(layer, 'fillOpacity');
        var strokeMode = enumOf(stroke, 'mode') || 'normal';
        return {
            stroke: stroke,
            strokeMode: strokeMode,
            // The solid disc is exact when opaque content at Pass Through / Normal covers it.
            // Below 100% opacity or fill the disc bleeds through by up to (1 - value) * 255,
            // while the hollow ring costs a fixed antialiased seam of at most about 64/255;
            // the two are equal at 75%, so the ring is used only below that.  Any other group
            // mode can let the disc show through in full, so the ring is always used there.
            useRing: !(blend === 'PASSTHROUGH' || blend === 'NORMAL') || opacity < 75 || fill < 75
        };
    }

    function convert(doc, group) {
        var found = inspect(doc, group);
        var copy = group.duplicate();
        clearStyle(doc, copy);                    // also normalizes the copy to 100/100
        copy.blendMode = BlendMode.PASSTHROUGH;
        var layer = copy.merge();                 // the children, exactly as drawn, full alpha
        var contentOnly = null;
        if (found.useRing) {
            contentOnly = layer.duplicate();
            contentOnly.name = "content silhouette";
            contentOnly.visible = false;
            doc.activeLayer = layer;
        }
        copyStyle(doc, group);
        pasteStyle(doc, layer);
        rasterizeStyle(doc, layer);               // children plus Stroke, exactly as rendered
        setOverlay(doc, layer, found.stroke);
        rasterizeStyle(doc, layer);               // stroke color, same alpha
        if (contentOnly) { ringify(doc, layer, contentOnly); contentOnly.remove(); }
        layer.move(group, ElementPlacement.PLACEAFTER);
        layer.name = group.name + "'s Outer Stroke";
        if (found.strokeMode !== 'normal' && found.strokeMode !== 'dissolve'
            && STROKE_MODE_TO_DOM[found.strokeMode]) {
            layer.blendMode = BlendMode[STROKE_MODE_TO_DOM[found.strokeMode]];
        }
        removeStroke(doc, group);                 // empties the Stroke slot; keeps every blending option
        doc.activeLayer = layer;
        return layer;
    }

    function run() {
        var title = 'Rastrokizer\n\n';
        if (!app.documents.length) { alert(title + 'Open a document and select a group.'); return; }
        var doc = app.activeDocument;
        var group = doc.activeLayer;
        try {
            inspect(doc, group);
        } catch (e) {
            alert(title + e.message);
            return;
        }
        // suspendHistory evaluates a string in the global scope, so the step is parked there
        // for the call and removed straight after.
        $.global.__rastrokizerStep = function () { convert(doc, group); };
        try {
            doc.suspendHistory('Rastrokizer', '__rastrokizerStep()');
        } catch (e) {
            alert(title + e.message);
        } finally {
            try { delete $.global.__rastrokizerStep; } catch (e) { }
        }
    }

    return { inspect: inspect, convert: convert, run: run };
})();

if (!$.global.RastrokizerNoMain) { $.global.Rastrokizer.run(); }
