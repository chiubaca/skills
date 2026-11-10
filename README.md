# skills

Personal AI agent skills by [chiubaca](https://github.com/chiubaca).

## Available skills

| Skill | Description |
| --- | --- |
| [attach-image](skills/attach-image/) | Copy a local image into the chiubaca/notes attachments folder and return the markdown reference. |
| [chiubaca-voice](skills/chiubaca-voice/) | Write and edit in chiubaca's personal voice. |

## Structure

Each skill lives in its own directory:

```text
skills/
  skill-name/
    SKILL.md
    references/
    scripts/
    templates/
```

Only `SKILL.md` is required. Supporting files are added when they make the skill more useful.

## Using a skill

Point your agent at the relevant `SKILL.md`, or copy the skill directory into the location used by your agent framework.

For Hermes Agent, copy a skill into your active profile's `skills` directory. For Claude Code and other agents that support Agent Skills, use their standard skills directory.

## License

MIT
