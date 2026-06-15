import * as RNFS from '@dr.pogodin/react-native-fs'

/**
 * Static utility — the platform **sandbox directories** exposed by
 * `@dr.pogodin/react-native-fs`. React Native has no current working
 * directory, so anchor a {@link FileRepository}'s `rootPath` to one of
 * these (e.g. `super({ rootPath: DirectoryUtils.document })`).
 *
 * These three are present on every platform; the backend exposes further
 * platform-specific roots (`MainBundlePath`, `ExternalStorageDirectoryPath`,
 * …) directly for the rarer cases.
 */
export class DirectoryUtils {
  private constructor() {}

  /** App-private documents directory — persisted and backed up. */
  static get document(): string {
    return RNFS.DocumentDirectoryPath
  }

  /** Caches directory — persisted, but the OS may purge it under pressure. */
  static get caches(): string {
    return RNFS.CachesDirectoryPath
  }

  /** Temporary directory — ephemeral scratch space. */
  static get temporary(): string {
    return RNFS.TemporaryDirectoryPath
  }
}
