# ADR 004: Split panels and shared documents

Status: implementation in progress.

The original workspace owns one visible editor or graph at a time. Replace this with a recursive split tree whose leaves are ordered tab groups. Note and graph tabs have view identities independent from file paths. Moving a tab changes layout metadata and DOM placement, not the file, editor undo state or graph instance.

One canonical document session owns the autosave queue, revision and recovery record for each note path. Multiple editor views mirror document changes through minimal non-history transactions; each view retains mode and selection. Closing a mirrored view cannot dispose the writer while another view remains. Closing the final view must drain saving successfully before removing it.

Focus belongs to a tab group. Commands, mode changes, status and links use the originating view. Graphs keep their own instances and navigate into a note group when available. Each pending note open is scoped to its group, preventing one panel's delayed read from replacing another panel's selection.

Validated, bounded layout metadata is stored in local IndexedDB per vault identity. It is restored after local folder access is granted, with missing files pruned. Neither layouts nor note contents are sent to the host. The selected-folder-root link contract and origin boundary remain unchanged.

Interaction reference: [Obsidian tabs](https://obsidian.md/help/tabs), [drag and drop](https://obsidian.md/help/drag-and-drop), and the project's DESIGN.md tab-group primitives.
