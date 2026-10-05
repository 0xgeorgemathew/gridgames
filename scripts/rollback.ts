// Plan first. Source rollback makes a forward commit; it never resets or pushes.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const baseline = 'e6feed7b-5594-45ca-a194-8b05eb5d7503'
const [mode = 'plan', target, flag] = process.argv.slice(2)
function run(command: string, args: string[], cwd = root): string {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`)
  return result.stdout.trim()
}
try {
  if (mode === 'plan') {
    console.log(run('git', ['status', '--short']))
    console.log(run('git', ['log', '-5', '--oneline']))
    console.log(`Known-good Worker version: ${baseline}`)
    console.log('Inspect a reviewed release commit: bun run rollback:source <commit>')
    console.log('Apply its forward revert: bun run rollback:source <commit> --execute')
    console.log('Worker rollback changes production only; it does not change Git or stored data.')
  } else if (mode === 'source') {
    if (!target || !/^[a-f0-9]{7,40}$/i.test(target))
      throw new Error('Supply an explicit reviewed release commit hash')
    const commit = run('git', ['rev-parse', '--verify', `${target}^{commit}`])
    if (run('git', ['rev-list', '--parents', '-n', '1', commit]).split(' ').length !== 2)
      throw new Error('Only a non-merge release commit can be reverted by this command')
    console.log(run('git', ['show', '--stat', '--oneline', commit]))
    if (flag !== '--execute') {
      console.log(`Plan only: git revert ${commit}. Inspect the scope before adding --execute.`)
    } else {
      if (run('git', ['status', '--porcelain']))
        throw new Error('Worktree is not clean. Save your changes first; nothing was changed.')
      console.log(run('git', ['revert', '--no-edit', commit]))
      console.log('Review the new commit before a normal push. No push was performed.')
    }
  } else if (mode === 'worker') {
    if (!target || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(target))
      throw new Error('Supply an explicit Worker version UUID')
    if (!existsSync(`${root}frontend/dist/server/wrangler.json`))
      throw new Error('Build first: cd frontend && bun install --frozen-lockfile && bun run build')
    if (flag !== '--execute') {
      console.log(
        `Plan only: wrangler rollback ${target} --name grid-games --config dist/server/wrangler.json`
      )
      console.log(
        'Check that this version uses the current DO classes, bindings and storage migrations. Add --execute only after review.'
      )
    } else {
      console.log(
        run(
          'bunx',
          [
            'wrangler',
            'rollback',
            target,
            '--name',
            'grid-games',
            '--config',
            'dist/server/wrangler.json',
            '--message',
            'Rollback to reviewed known-good version',
          ],
          `${root}frontend`
        )
      )
    }
  } else throw new Error('Use plan, source or worker')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
