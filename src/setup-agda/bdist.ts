import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as tc from '@actions/tool-cache'
import ensureError from 'ensure-error'
import * as Mustache from 'mustache'
import * as os from 'node:os'
import * as path from 'node:path'
import pick from 'object.pick'
import * as opts from '../opts'
import * as icu from '../setup-icu'
import setupUpx from '../setup-upx'
import * as util from '../util'

export async function download(
  options: opts.BuildOptions
): Promise<string | null> {
  // Get the name for the distribution:
  const bdistName = renderName(opts.getDefaultPackageName(), options)
  const bdistUrl = opts.packageIndex[bdistName]
  if (bdistUrl !== undefined) {
    core.info(`Found package ${bdistName}`)
    try {
      core.info(`Downloading package ${bdistName} from ${bdistUrl}`)
      return await tc.downloadTool(bdistUrl)
    } catch (error) {
      core.warning(
        `Failed to download package ${bdistName}: ${ensureError(error).message}`
      )
      return null
    }
  } else {
    core.info(`Could not find package ${bdistName}`)
    return null
  }
}

export async function upload(
  installDir: string,
  options: opts.BuildOptions
): Promise<string> {
  // Get the name for the distribution:
  const bdistName = renderName(options['bdist-name'], options)
  const bdistDir = path.join(opts.agdaDir(), 'bdist', bdistName)
  util.mkdirP(bdistDir)

  // Copy binaries:
  util.mkdirP(path.join(bdistDir, 'bin'))
  for (const binName of util.agdaBinNames)
    await util.cp(
      path.join(installDir, 'bin', binName),
      path.join(bdistDir, 'bin', binName)
    )

  // Copy data:
  await util.cpR(path.join(installDir, 'data'), bdistDir)

  // Compress binaries:
  if (opts.shouldCompressExe(options)) {
    try {
      const upxExe = await setupUpx(options)
      for (const binName of util.agdaBinNames)
        await compressBin(upxExe, path.join(bdistDir, 'bin', binName))
    } catch (error) {
      core.debug(ensureError(error).message)
    }
  }

  // Bundle libraries:
  if (options['icu-version'] !== undefined) {
    await icu.bundle(bdistDir, options)
  }

  // Test artifact:
  await util.agdaTest({
    agdaBin: path.join(bdistDir, 'bin', util.agdaBinName),
    agdaDataDir: path.join(bdistDir, 'data')
  })

  // Create file list for artifact:
  const globber = await glob.create(path.join(bdistDir, '**', '*'), {
    followSymbolicLinks: false,
    implicitDescendants: false,
    matchDirectories: false
  })
  const files = await globber.glob()

  // Upload artifact:
  const artifactClient = artifact.create()
  const uploadInfo = await artifactClient.uploadArtifact(
    bdistName,
    files,
    bdistDir,
    {
      continueOnError: true,
      retentionDays: 90
    }
  )

  // Report any errors:
  if (uploadInfo.failedItems.length > 0) {
    core.error(['Failed to upload:', ...uploadInfo.failedItems].join(os.EOL))
  }

  // Return artifact name
  return uploadInfo.artifactName
}

async function compressBin(upxExe: string, binPath: string): Promise<void> {
  // Print the needed libraries before compressing:
  await printNeededLibs(binPath)
  // Compress with UPX:
  await util.getOutput(upxExe, ['--best', binPath])
  // Print the needed libraries after compressing:
  await printNeededLibs(binPath)
}

export function renderName(
  template: string,
  options: opts.BuildOptions
): string {
  return Mustache.render(template, {
    ...pick(options, [
      'agda-version',
      'ghc-version',
      'cabal-version',
      'stack-version',
      'icu-version',
      'upx-version'
    ]),
    arch: os.arch(),
    platform: os.platform(),
    release: os.release()
  })
}

// Helpers for patching executables

async function printNeededLibs(binPath: string): Promise<void> {
  try {
    let output = ''
    switch (opts.os) {
      case 'linux': {
        output = await util.patchelf('--print-needed', binPath)
        break
      }
      case 'macos': {
        output = await util.otool('-L', binPath)
        break
      }
      case 'windows': {
        output = await util.dumpbin('/imports', binPath)
        break
      }
    }
    core.info(`Needed libraries:${os.EOL}${output}`)
  } catch (error) {
    core.debug(ensureError(error).message)
  }
}
