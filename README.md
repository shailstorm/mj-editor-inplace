# Midjourney editor prototype

A React + Vite image editor, using the photos, icons, and fonts from the original Figma prototype. The workspace edits one image in a fixed canvas, with image resizing, non-destructive cropping, and selectable canvas proportions.

## Run

```sh
npm install
npm run dev
```

Open the URL printed by Vite. The editor starts with the current photo and an empty **Image Prompt** panel. Selecting a region switches it to **Region Prompt**; clearing the region or selecting the whole photo switches it back. **All Projects** shows the current image and an uploader.

## Try the flow

1. Type your edit into the prompt, or type `/` for a suggestion. Draw a region to target part of the photo. The prompt text and references survive changing targets.
2. Use the upload tile to add references. Hover over a reference to reveal its remove button and an inset weight slider, which adjusts influence from 0–100 (default 30). Keyboard focus also reveals these controls; on touch devices they stay visible. Each reference keeps its own weight. Image Prompt also includes **Aura**: two editable words with a balance slider, initially centered. Aura is hidden during region edits and restored when switching back.
3. Generate four prepared variations. Both variants show outputs inside the prompt panel; click an output to open it in the image area. Switching images preserves the prompt, references, Aura, output list, and selected region. All variations and the before image remain available in the desktop sidebar or mobile bottom strip. **Favorite X images** counts and marks all current outputs, or only those chosen using **Select**. Hovering or focusing a variation reveals an outlined heart; click it to favorite the image, or click its filled orange heart to remove the favorite. Heart controls stay visible on touch screens. Favorites stay marked for the browser session.

Favorite hearts sit at the top-right of each thumbnail. Section tooltips render in a document-level overlay above panels and controls, track scrolling and resizing, and flip or shift at viewport edges to stay readable.

New batches slide existing variations down in the sidebar or sideways in the mobile strip, with a subtle entrance for new thumbnails. Reduced-motion preferences disable this movement. Clicking outside the prompt or merely selecting the current photo preserves the generated output panel and its region; editing the image, prompt, or references still clears the batch from the prompt panel.
4. Use **Select (V)** to select the active image, then drag it or resize it with its corner handles. Clicking the empty workspace clears the selection.
5. Use Undo/Redo to restore document changes, including switching images and deleting the active image.

Tools: **V** select the image, **M** select a rectangular region, **L** draw a freehand region, **W** select a connected color region with the magic wand, **C** crop the image. On desktop, the prompt panel stays at the left, below **All Projects**. On smaller screens it follows the canvas and controls. Clearing or changing a region preserves the prompt text, references, and their weights. With the rectangle tool, drag inside the region to reposition it, or drag its corners to resize it within the photo. Each completed drag is one undoable change; Escape cancels it.

Command/Ctrl + A selects the active image. Command/Ctrl + Z undoes, Shift + Command/Ctrl + Z redoes, and Delete removes the selected image. Deleting the image leaves its variations available; choose a thumbnail or upload another image to continue.

## Frontend scope

- Uses locally hosted Figma photos and SVG assets, with DM Sans throughout the editor. The 300px region panel uses 14px text, compact spacing, and three evenly sized reference thumbnails per row. The image stays centered on screen, with balanced space around it.
- Prompt submission is a local, simulated preview using the four supplied results. Prompt text, reference weights, and image Aura are included in the request state but do not change the simulated images yet. Generate requires an image and a nonempty prompt; whole-image generation does not require an active selection.
- Magic-wand selection runs locally with a fixed tolerance of 12. It draws a tinted mask and dashed outline; semantic object segmentation is not connected yet.
- Image expansion displays additional transparent image area and fits it within the workspace. It does not synthesize new pixels.
- Uploads, references, selection, and history live in memory for the current browser session. There is no backend, authentication, model call, or persistence yet.
- Controls, icons, and text retain their CSS sizes as the window narrows. The workspace fits the image to the available area; navigation and toolbars scroll when needed, and prompts and dialogs stay within the viewport.

The compact layout applies at 1200px wide and below, with the same layout also used for touch tablets up to 1366px.

## Code structure

`src/editor/Editor.jsx` composes the editor and connects its controls. `Topbar` holds All Projects, shown as an arrow on phones. The toolbar is fixed at the bottom on every screen, immediately above variations on phones. `imageLayout` centers the canvas between the header and bottom controls, with `CanvasProportions` attached above its top-right corner.

`PromptPanel` shares its input, references, Aura, and output sections across both presentations. On phones and tablets, `CollapsiblePromptPanel` starts with just the prompt and a +/− toggle in the top row beside arrow-only All Projects and Help. Equal grid tracks keep it centered in the screen, including at tablet widths. It uses the desktop panel's 300px width and content sizes, shrinking only when needed to fit the header. Options expand over the canvas with a short height/fade transition and an animated toggle; reduced-motion preferences disable both animations. Collapsed controls stay mounted with their values preserved and are hidden from keyboard and assistive technology. Touch tablets up to 1366px also use this layout in landscape.

```text
src/editor/
  components/  Image workspace, variations, toolbar, navigation, prompt, and dialogs
  hooks/       Editor commands, history, image gestures, viewport sizing, shortcuts, and generation
  model/       Document operations, history reducer, geometry, image layout, selection, and tools
  services/    Image files, magic-wand sampling, and simulated generation
  styles/      Styles grouped by workspace, controls, prompt panel, navigation, and dialogs
```

Components render their inputs and call event handlers. `useEditor` coordinates document commands; `useImageGestures` handles region selection and rectangle adjustments. It does not intercept wheel events. `imageLayout` derives the active image's display placement from the window size and image expansion. Pointer coordinates and overlays share that mapping, keeping presentation geometry separate from document state.

`PromptPanel` composes shared input, references, output, and divider sections. Only Image Prompt includes `AuraSection`. The two variants share one draft, and `model/prompts.js` determines the target and builds generation requests. `PanelSlider` supplies the same accessible orange control for reference weights and Aura.

The history reducer keeps document changes immutable. Dragging previews intermediate region states and commits one undo entry on release. Variations store image identity and source, without canvas positions.

Change `services/generation.js` when connecting the backend. It accepts the current document and an abort signal, then returns result objects. Request cancellation and loading state live in `useGeneration`.

## Validation

```sh
npm test
npm run lint
npm run build
```

Tests cover startup, prompts and references, fixed image placement at different window sizes, region gestures, variation switching, deletion and undo/redo, cancelled generation, magic-wand masks, and local asset integrity.
