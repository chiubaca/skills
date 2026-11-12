---
name: Attach Image to Notes
description: Copy an image into the chiubaca/notes attachments folder, commit and push it, and return the markdown reference for use in fleeting or permanent notes. Handles both local files and images attached through the OpenCode client.
---

Use this skill when the user wants to attach, upload, or include an image in their `chiubaca/notes` repository. The image can come from a local file path or from an image attached to the current OpenCode conversation (e.g. from the Android or desktop client).

## Workflow

1. Identify the source image. Ask the user if it is not clear from context.
   - **Local file:** the user provides a path or the image is already on disk.
   - **OpenCode attachment:** the user pasted or attached the image in the OpenCode chat.
2. Optionally accept alt text for the markdown reference (defaults to `image`).
3. Publish the image and return the markdown reference.
   - For **local files**, run the helper script directly.
   - For **OpenCode attachments**, extract the base64 data from the session message, write it to a temporary file, then run the helper script.
4. If the user also wants to save a fleeting note that references the image, call the `add_fleeting_note` MCP tool with the **adjusted** markdown reference. Because `add_fleeting_note` writes to the GitHub repository, make sure the attachment has already been committed and pushed.

## Local file path

```sh
node scripts/attach-image.mjs <source-path> [alt-text] [--commit]
```

- The script validates the file exists and has an allowed image extension.
- It sanitizes the filename and copies the file to `~/Projects/notes/attachments/<filename>`.
- If the filename already exists, it appends a UTC timestamp to avoid overwriting.
- Pass `--commit` to stage, commit, and push the attachment so the file is available on GitHub.

If you did not pass `--commit`, stage and commit it manually in the notes repo:

```sh
git -C /home/chiubaca/Projects/notes add attachments/<filename>
git -C /home/chiubaca/Projects/notes commit -m "Add attachment: <filename>"
git -C /home/chiubaca/Projects/notes push
```

## OpenCode attachment

When the image is attached to the OpenCode conversation, extract it from the session message and publish it through the local notes repo.

```sh
# Find the active session ID
opencode api get /api/session/active

# List recent user messages to find the message containing the image
opencode api get "/api/session/<sessionID>/message?type=user&limit=10"

# Save the attachment base64 to a temp file and decode it
jq -r '.data.files[0].data' /tmp/message.json > /tmp/image.b64
base64 -d /tmp/image.b64 > /tmp/image.<ext>

# Publish it with the helper script
node scripts/attach-image.mjs /tmp/image.<ext> [alt-text] --commit
```

Choose the `<ext>` from the attachment MIME type:

| MIME type | Extension |
|-----------|-----------|
| `image/jpeg` | `.jpg` |
| `image/png` | `.png` |
| `image/gif` | `.gif` |
| `image/webp` | `.webp` |
| `image/svg+xml` | `.svg` |
| `image/avif` | `.avif` |

If the message contains multiple files, use the filename in `files[0].name` when available, otherwise fall back to `image.<ext>`.

## Markdown reference

The script returns a markdown reference relative to the repository root, for example:

```markdown
![alt text](attachments/<filename>)
```

If the note referencing the image lives in a subdirectory (e.g. `fleeting-notes/2026-11-10.md`), adjust the path so GitHub resolves it correctly:

```markdown
![alt text](../attachments/<filename>)
```

## Notes

- Allowed image extensions: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.avif`.
- The script copies the file locally by default. Pass `--commit` to publish it immediately.
- If the image will be referenced from a note that is stored in GitHub (including fleeting notes created via the `add_fleeting_note` MCP tool), the attachment must be committed and pushed or the image link will be broken.
- Set the `NOTES_DIR` environment variable to override the default notes repo path (`/home/chiubaca/Projects/notes`).
- Do not overwrite existing attachments; the script renames on collision automatically.
- For OpenCode attachments, clean up temporary files (`/tmp/image.b64`, `/tmp/message.json`, etc.) after publishing.
