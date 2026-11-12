---
name: Attach Image to Notes
description: Analyse an image, give it a short descriptive filename, copy it into the chiubaca/notes attachments folder, commit and push it, and return the markdown reference for use in fleeting or permanent notes. Handles both local files and images attached through the OpenCode client.
---

Use this skill when the user wants to attach, upload, or include an image in their `chiubaca/notes` repository. The image can come from a local file path or from an image attached to the current OpenCode conversation (e.g. from the Android or desktop client).

## Workflow

1. Identify the source image. Ask the user if it is not clear from context.
   - **Local file:** the user provides a path or the image is already on disk.
   - **OpenCode attachment:** the user pasted or attached the image in the OpenCode chat.
2. **Analyse the image before naming it.** Look at the image (use the `read` tool on the local/temp file, or view the attachment rendered in the conversation) and describe its subject in one to three words. See [Naming](#naming).
3. Pass that description to the helper script with `--name`. The script turns it into a lowercase, dash-separated slug of at most three words. If you genuinely cannot view the image, fall back to a slug derived from the source filename, or ask the user for a name — never use a generic name like `image` when the image is visible.
4. Optionally accept alt text for the markdown reference (defaults to the slug with dashes replaced by spaces).
5. Publish the image and return the markdown reference.
   - For **local files**, run the helper script directly.
   - For **OpenCode attachments**, extract the base64 data from the session message, write it to a temporary file, then run the helper script.
6. If the user also wants to save a fleeting note that references the image, call the `add_fleeting_note` MCP tool with the **adjusted** markdown reference. Because `add_fleeting_note` writes to the GitHub repository, make sure the attachment has already been committed and pushed.

## Naming

Analyse the image first, then name it after what you can actually see. Rules enforced by the script:

- lowercase only
- words separated by a single dash
- **no more than three words**
- no spaces, underscores, punctuation, or file extension in the name (the extension comes from the source file)

Examples:

| What is in the image | Slug | Resulting file |
|---|---|---|
| Sunlit street with long shadows and lens flare | `sunlit-street-shadows` | `sunlit-street-shadows.jpg` |
| Dog wearing mouse ears | `arthur-mouse-ears` | `arthur-mouse-ears.jpg` |
| Shiba Inu portrait | `shiba-inu-portrait` | `shiba-inu-portrait.jpg` |
| Screenshot of a dashboard | `dashboard-screenshot` | `dashboard-screenshot.png` |

Avoid `image`, `img`, `photo`, `screenshot` or `attachment` on their own. If a file with the same name already exists, the script appends a UTC timestamp rather than overwriting it.

## Local file path

```sh
node scripts/attach-image.mjs <source-path> [alt-text] --name "<slug>" [--commit]
```

- `--name` is the one-to-three-word description you derived from the image. The script slugifies it (lowercase, dashes, max three words); without it, the script falls back to the source filename, still slugified, and prints a hint.
- The script validates the file exists and has an allowed image extension.
- It copies the file to `~/Projects/notes/attachments/<slug>.<ext>`.
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
# Find the active session ID (there may be more than one; pick the one whose
# user messages contain a file)
opencode api get /api/session/active

# List recent user messages to find the message containing the image
opencode api get "/api/session/<sessionID>/message?type=user&limit=10" > /tmp/message.json

# Save the attachment base64 to a temp file and decode it. The API returns an
# array of messages, so select the one that actually has files.
jq -r '.data[] | select((.files // []) | length > 0) | .files[0].data' /tmp/message.json > /tmp/image.b64
base64 -d /tmp/image.b64 > /tmp/image.<ext>

# Look at /tmp/image.<ext> with the read tool and describe it in 1-3 words,
# then publish it with the helper script
node scripts/attach-image.mjs /tmp/image.<ext> [alt-text] --name "<slug>" --commit
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

OpenCode attachments usually have no `files[0].name`, so `--name` is effectively required here — derive it from the image contents. If the message contains multiple files, use `files[0].name` as a hint, otherwise fall back to `image.<ext>` as the temporary filename only (never as the published name).

## Markdown reference

The script returns a markdown reference relative to the repository root, for example:

```markdown
![sunlit street shadows](attachments/sunlit-street-shadows.jpg)
```

If the note referencing the image lives in a subdirectory (e.g. `fleeting-notes/2026-11-12.md`), adjust the path so GitHub resolves it correctly:

```markdown
![sunlit street shadows](../attachments/sunlit-street-shadows.jpg)
```

## Notes

- Always analyse the image and pass `--name`; the script enforces lowercase, dash-separated, at most three words.
- Default alt text is the slug with dashes replaced by spaces.
- Allowed image extensions: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.avif`.
- The script copies the file locally by default. Pass `--commit` to publish it immediately.
- If `git push` is rejected because the remote has newer commits (the `add_fleeting_note` MCP tool writes directly to GitHub), fetch, rebase and push again before creating the note:
  ```sh
  git -C /home/chiubaca/Projects/notes fetch origin
  git -C /home/chiubaca/Projects/notes rebase origin/main
  git -C /home/chiubaca/Projects/notes push origin main
  ```
- If the image will be referenced from a note that is stored in GitHub (including fleeting notes created via the `add_fleeting_note` MCP tool), the attachment must be committed and pushed or the image link will be broken.
- Set the `NOTES_DIR` environment variable to override the default notes repo path (`/home/chiubaca/Projects/notes`).
- Do not overwrite existing attachments; the script renames on collision automatically.
- For OpenCode attachments, clean up temporary files (`/tmp/image.b64`, `/tmp/message.json`, etc.) after publishing.
