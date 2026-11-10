---
name: Attach Image to Notes
description: Copy a local image into the chiubaca/notes attachments folder and return the markdown reference for use in fleeting or permanent notes.
---

Use this skill when the user wants to attach, upload, or include a local image file in their `chiubaca/notes` repository.

## Workflow

1. Identify the source image path. Ask the user if it is not clear from context.
2. Optionally accept alt text for the markdown reference (defaults to `image`).
3. Run the helper script to copy the image into the notes attachments directory:
   ```sh
   node scripts/attach-image.mjs <source-path> [alt-text]
   ```
   - The script validates the file exists and has an allowed image extension.
   - It sanitizes the filename and copies the file to `~/Projects/notes/attachments/<filename>`.
   - If the filename already exists, it appends a UTC timestamp to avoid overwriting.
4. If the user asks to commit the attachment, stage and commit it in the notes repo:
   ```sh
   git -C /home/chiubaca/Projects/notes add attachments/<filename>
   git -C /home/chiubaca/Projects/notes commit -m "Add attachment: <filename>"
   git -C /home/chiubaca/Projects/notes push
   ```
5. Return the markdown reference printed by the script, for example:
   ```markdown
   ![alt text](attachments/<filename>)
   ```

## Notes

- Allowed image extensions: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.avif`.
- The script does **not** commit or push by default. Only commit if the user explicitly asks.
- Set the `NOTES_DIR` environment variable to override the default notes repo path (`/home/chiubaca/Projects/notes`).
- Do not overwrite existing attachments; the script renames on collision automatically.
- If the user also wants to save a fleeting note that references the image, call the `add_fleeting_note` MCP tool with the returned markdown reference.
