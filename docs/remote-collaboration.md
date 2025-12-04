# Remote collaboration constraints

This workspace runs in an isolated container with read-only access to the repository's remote.
Because of this, changes can be committed locally on the provided branch but cannot be pushed or
open new branches directly on GitHub. A maintainer with remote access needs to push the commits
if they should appear on GitHub.
