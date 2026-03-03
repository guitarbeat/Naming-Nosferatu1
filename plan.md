1. **Understand**
   - The CI is failing because of `amannn/action-semantic-pull-request@v6` checking the PR title.
   - The PR title used was `🧪 test: improve test coverage for SyncQueueService`.
   - The semantic PR check is failing with: "No release type found in pull request title... Add a prefix to indicate what kind of release this pull request corresponds to."
   - The `headerPattern` is `^([a-z]+)(?:\(([^)]+)\))?!?: (.+)$`.
   - The emoji at the start `🧪` breaks the `^[a-z]+` pattern match for the type! The check expects the title to strictly start with `test: ` or `test(scope): `.
   - Wait, my memory says: "The `.github/workflows/pr-title-lint.yml` workflow is configured to bypass semantic title checks for PR titles starting with '🎨 Palette:' using `!startsWith`." But for tests, we didn't specify an emoji exception. Or I just shouldn't include the emoji in the title.
   - Wait, I can't edit the PR title directly through a bash command because the PR was created by the `submit` tool. I need to call the `submit` tool again with a corrected title, or ask how to update the PR. But the tool `submit` creates/updates the PR if we use the same branch name.

2. **Action**
   - Call the `submit` tool again with the *same branch name* (`test-sync-queue-service-6064277251023481222` or just `test-sync-queue-service`? The previous output was: "The branch name used for this submit is 'test-sync-queue-service-6064277251023481222'."). I should use the same branch name as the one I just submitted to update it, or maybe I can just call `submit` with `test: improve test coverage for SyncQueueService` as the title.

3. **Verify**
   - Check if `submit` tool updates the PR.
