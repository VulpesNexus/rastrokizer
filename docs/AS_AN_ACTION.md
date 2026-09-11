# Recording the same result as an Action

Every step Rastrokizer performs is an ordinary Photoshop command, so the same result can be recorded as an Action. In one respect the Action is more capable: *Create Layers* is exact on a *plain* layer and can be recorded through *Insert Menu Item*, which makes the construction color, gradient, and pattern agnostic — so an Action handles gradient and pattern strokes, and Inside strokes, that the script refuses. Its one limitation is the reverse: an Action cannot restore opacity and fill dynamically, so it is faithful only for groups at 100 % opacity and fill.

With a document open, a group carrying an outside stroke selected, and the *Layers* panel visible:

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

Because step 7 records *Create Layers* through *Insert Menu Item*, Photoshop reruns the real command on playback and renders the stroke itself, gradient, pattern, or solid alike. The script cannot do this: *Create Layers* is not available to scripts in Photoshop 27.9.1, which is why the script rebuilds the stroke instead and refuses the paint types it cannot recolor.
