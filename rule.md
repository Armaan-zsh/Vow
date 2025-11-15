## BEFORE EACH PROMPT:
1. Run `npm run fix:all` - must pass
2. Check `git status` - must be clean
3. Review PRD section for context

## AFTER AI GENERATES CODE:
1. Run `npm run fix:all` - if it fails, the code is wrong
2. Do NOT commit failing code
3. Regenerate with same prompt until it passes

## NEVER:
- Manually edit AI-generated code to fix type errors
- Skip tests to make build pass
- Commit with `// @ts-ignore` comments