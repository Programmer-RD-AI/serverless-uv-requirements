export interface UvConfig {
  /** Compilation mode - 'compile' generates from pyproject.toml, 'freeze' captures current env */
  mode?: "compile" | "freeze";

  /** Source file for dependencies (used in compile mode) */
  source?: string;

  /** Output requirements file path */
  output?: string;

  /** Working directory for uv commands */
  cwd?: string;

  /** Additional uv compile options */
  compileOptions?: string[];

  /** Additional uv freeze options */
  freezeOptions?: string[];

  /** Skip plugin execution if uv is not available */
  skipIfMissing?: boolean;

  /** Python version constraint for uv compile */
  pythonVersion?: string;

  /** Extra index URLs for dependency resolution */
  extraIndexUrl?: string[];

  /** Trusted hosts for package downloads */
  trustedHost?: string[];

  /** Enable verbose logging */
  verbose?: boolean;
}

export interface ServerlessInstance {
  service: {
    custom?: {
      uv?: UvConfig;
    };
    provider: {
      name: string;
      runtime?: string;
    };
    functions?: Record<string, any>;
  };
  cli: {
    log: (message: string, entity?: string) => void;
    warn: (message: string) => void;
  };
  utils: {
    writeFileSync: (path: string, content: string) => void;
    fileExistsSync: (path: string) => boolean;
  };
}

export interface PluginOptions {
  stage?: string;
  region?: string;
  verbose?: boolean;
}
