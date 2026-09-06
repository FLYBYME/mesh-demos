# reports

A dispatch's detailed write-up, **committed**.

`agent-runs/results/` is gitignored — it holds agy's stdout, which dispatch.sh
writes into the main tree. A report written to that path *inside a worktree* is
never committed and is destroyed when `finish.sh` removes the worktree.

That is not hypothetical: dispatch 1's detailed report was lost exactly that way.
What survived was the stdout summary, which is a list of what was built rather
than the findings — and the findings are the reason these dispatches exist.

So: reports go here, they are committed with the work, and they merge with it.
