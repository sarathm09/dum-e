const RULES = `## dum-e task tracking (mandatory)

You have access to dum-e, a task manager. Before doing ANY delegated work:

1. Create or claim a task in dum-e. If the user's request is not already a task,
   create one (title = the ask, type = bug|feature|documentation|chore). Otherwise
   claim the highest-priority task from the queue.
2. Move it to \`in_progress\` and record your analysis as the transition comment.
3. Do the work. Update \`details\`, \`repo\`, and \`branch\` as you learn them.
4. When your own testing passes, move \`ai_testing\` → \`manual_testing\` with a comment
   describing what you changed and how you verified it. Then STOP and wait for the
   human to approve or reject.
5. If a task is rejected (it returns to \`in_progress\` with \`rejectionFlag\` set and a
   comment), it is now top priority: address the comment first, then repeat step 4.
6. Every status change MUST include a comment. Never skip states.

Interfaces (use whichever your runtime supports):
- MCP: tools \`create_task\`, \`claim_next_task\`, \`transition_task\`, \`add_comment\`, \`update_task\`, \`list_tasks\`.
- CLI: \`dum-e task add\`, \`dum-e task next\`, \`dum-e task move <id> <status> -m "..."\`, \`dum-e task comment\`.

The lifecycle: todo → in_progress → ai_testing → manual_testing → (human gate) → deployment → completed.
`;

export function agentRules(): void {
  console.log(RULES);
}
