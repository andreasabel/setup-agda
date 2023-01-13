Do not edit the files in this directory!

They are automatically generated by `./scripts/bundle_data.sh`.

The files `Agda.components.json`, `Agda.versions.json`, and `agda-stdlib-versions.json` contain information about Agda and the standard library, and are generated from the corresponding files in `./data`.

The file `licenses.json` contains the licenses of Agda's non-Cabal dependencies, and is generated from the files in `./data/licenses`. These licenses are _not_ automatically added to the license report, as, e.g., the ICU license is only added when Agda is built with `--enable-cluster-counting`. If you wish to include a new license in the license report, the relevant code is in `./src/cli/build.ts:licenseReport`.

The files in `setup-haskell` contain information about the `setup-haskell` action: `action.json` is generated from `./vendor/haskell/actions/setup/action.yml`, and `versions.json` is generated from `./vendor/haskell/actions/setup/src/versions.json`.

The files in `setup-agda` contain information about the `setup-agda` action: `action.json` is generated from `./action.yml`, and `package.json` is generated from `./package.json`.