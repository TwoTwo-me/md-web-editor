# ADR 002: Prefix command map
Status: accepted. Key invariant: never intercept `isComposing`, keyCode 229, AltGraph, or consume text as a trigger.

Default triggers: Escape (when no modal/prefix needs cancellation), Ctrl+Space (optional OS-sensitive alternative), visible command button. Subsequent physical `code` supports Korean keyboard layouts. 2 second timeout; unrelated character cancels and propagates. Repeats do not retrigger. Focus stays in editor; command palette uses modal focus behavior.

| Suffix | Command |
|---|---|
| p | Command palette |
| o | Quick switch note |
| f | Search vault |
| n | New note |
| d | Daily note |
| g | Global graph |
| l | Local graph |
| e | Cycle live/source/reading |
| b | Bold |
| i | Italic |
| k | Wiki link |
| c | Code |
| h | Heading |
| x | Task list |
| q | Blockquote |
| z / y | Undo / redo |
| / | Find in note |
| s | Flush save |
| t | Toggle theme |
| , | Settings |
| [ / ] | Previous / next tab |
| w | Close current tab |
| 1 / 2 | Toggle explorer / inspector |

All are in the command palette and most have buttons. Browser-reserved accelerators remain untouched. Trigger choices persist in validated local settings.
