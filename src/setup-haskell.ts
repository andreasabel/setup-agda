import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as semver from 'semver'
import haskellActionsSetup from 'setup-haskell'
import {execOutput, progVersion} from './util/exec'

export async function cabal(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await execOutput('cabal', args, execOptions)
}

export async function ghc(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await execOutput('ghc', args, execOptions)
}

export async function getGHCVersion(): Promise<string> {
  return progVersion('ghc', '--numeric-version')
}

export async function getCabalVersion(): Promise<string> {
  return progVersion('cabal', '--numeric-version')
}

const ghcVersionRegExp = RegExp('GHC == (?<version>\\d+\\.\\d+\\.\\d+)')

export function getGHCVersionsTestedWith(cabalFile: string): semver.SemVer[] {
  const cabalFileContents = fs.readFileSync(cabalFile).toString()
  const versions = []
  for (const match of cabalFileContents.matchAll(ghcVersionRegExp)) {
    if (match.groups !== undefined) {
      const parsedVersion = semver.parse(match.groups.version)
      if (parsedVersion !== null) {
        versions.push(parsedVersion)
      } else {
        core.warning(
          `Could not parse GHC version ${match.groups.version} in ${cabalFile}`
        )
      }
    }
  }
  return versions
}

export async function setupHaskell(
  inputs: Record<string, string>
): Promise<void> {
  await haskellActionsSetup(inputs)
}
