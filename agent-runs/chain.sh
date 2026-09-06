#!/usr/bin/env bash
# chain.sh -- run this repository's queued dispatches back to back, unattended.
#
#   cd ~/code/mesh-demos && nohup agent-runs/chain.sh 1 5 > chain.log 2>&1 &
#
# For each N: wait for the running dispatch to finish, verify and merge it with
# finish.sh, then dispatch N+1. One agy at a time, by construction -- the wait is
# on `pgrep agy` going to zero, so a second slot running in *another* repository
# is unaffected.
#
# WHY IT MERGES BETWEEN EACH RATHER THAN AT THE END
#
# Dispatch N+1 is told to read what N wrote ("read src/, dispatches 1 and 2 are
# merged"). That is only true if N is actually on master when N+1 starts. Running
# all five and merging afterwards would give every dispatch the same empty src/
# and five incompatible ideas of what this repository looks like.
#
# It also keeps the blame boundary: if the suite breaks, it broke on one
# dispatch's merge, and the merge before it was green.
#
# A dispatch that fails verification STOPS THE CHAIN. It is left on its branch
# with its worktree intact, for a person to look at. Continuing past a red
# dispatch would stack the next one on a broken tree and lose which was at fault.

set -uo pipefail

FIRST="${1:?usage: chain.sh <first> <last>}"
LAST="${2:?usage: chain.sh <first> <last>}"
ROOT="$(git rev-parse --show-toplevel)"
DISPATCH="$HOME/code/agent-runs/dispatch.sh"
FINISH="$HOME/code/agent-runs/finish.sh"

say() { printf '\n=== [chain %s] %s\n' "$(date +%H:%M:%S)" "$*"; }

# The result file for N, whatever it is called.
result_of() { find "$ROOT/agent-runs/results" -name "$1-*.result.md" -print -quit 2>/dev/null; }

wait_for_agy() {
    # Both conditions, because either alone is wrong: a result file appears
    # slightly before the process exits, and a crashed agy writes no file at all.
    local waited=0
    while [ "$(pgrep -cf '^agy ' || echo 0)" != "0" ]; do
        sleep 30
        waited=$((waited + 30))
        if [ "$waited" -ge 5400 ]; then
            say "dispatch has run 90 minutes with no exit. Stopping the chain rather than piling on."
            return 1
        fi
    done
    return 0
}

for N in $(seq "$FIRST" "$LAST"); do
    if [ "$(pgrep -cf '^agy ' || echo 0)" = "0" ] && [ ! -d "$ROOT/../$(basename "$ROOT")-dispatch-$N" ]; then
        say "dispatching $N"
        (cd "$ROOT" && "$DISPATCH" "$N") || { say "dispatch $N failed to start"; exit 1; }
        sleep 10
    else
        say "$N is already running; waiting on it"
    fi

    wait_for_agy || exit 1

    r="$(result_of "$N")"
    say "dispatch $N finished. Result: ${r:-none written}"

    # The verifier writes its log into the main tree; it is gitignored, but a
    # merge refuses on any dirty tree, so make sure nothing else is loose.
    if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
        say "main tree is dirty before merging $N:"
        git -C "$ROOT" status --short
        say "stopping rather than merging over uncommitted work"
        exit 1
    fi

    say "verifying and merging $N"
    if (cd "$ROOT" && "$FINISH" "$N" --merge); then
        say "$N merged"
    else
        say "$N FAILED verification. Chain stopped; branch dispatch/$N and its worktree are intact."
        exit 1
    fi
done

say "all dispatches $FIRST..$LAST merged"
