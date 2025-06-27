import { spawnSync, SpawnSyncReturns } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { UvConfig } from "./types";

export class UvUtils {
  /**
   * Check if uv is available in the system
   */
  static isUvAvailable(): boolean {
    try {
      const result = spawnSync("uv", ["--version"], { stdio: "pipe" });
      return result.status === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get uv version information
   */
  static getUvVersion(): string | null {
    try {
      const result = spawnSync("uv", ["--version"], {
        stdio: "pipe",
        encoding: "utf8",
      });
      if (result.status === 0 && result.stdout) {
        return result.stdout.trim();
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  /**
   * Build uv command based on configuration
   */
  static buildCommand(config: Required<UvConfig>): string[] {
    const baseCmd = ["uv", "pip"];

    if (config.mode === "freeze") {
      baseCmd.push("freeze");
      if (config.freezeOptions.length > 0) {
        baseCmd.push(...config.freezeOptions);
      }
    } else {
      baseCmd.push("compile");
      baseCmd.push(config.source);
      baseCmd.push("-o", config.output);

      if (config.pythonVersion) {
        baseCmd.push("--python-version", config.pythonVersion);
      }

      config.extraIndexUrl.forEach((url) => {
        baseCmd.push("--extra-index-url", url);
      });

      config.trustedHost.forEach((host) => {
        baseCmd.push("--trusted-host", host);
      });

      if (config.compileOptions.length > 0) {
        baseCmd.push(...config.compileOptions);
      }
    }

    if (config.verbose) {
      baseCmd.push("--verbose");
    }

    return baseCmd;
  }

  /**
   * Execute uv command
   */
  static executeCommand(
    command: string[],
    cwd: string,
    verbose: boolean = false
  ): SpawnSyncReturns<string> {
    const [cmd, ...args] = command;

    if (verbose) {
      console.log(`[uv] Executing: ${command.join(" ")}`);
      console.log(`[uv] Working directory: ${cwd}`);
    }

    return spawnSync(cmd, args, {
      cwd,
      stdio: verbose ? "inherit" : "pipe",
      encoding: "utf8",
      shell: process.platform === "win32",
    });
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: UvConfig, cwd: string): void {
    if (config.mode === "compile") {
      const sourcePath = join(cwd, config.source || "pyproject.toml");
      if (!existsSync(sourcePath)) {
        throw new Error(
          `Source file not found: ${sourcePath}. ` +
            `Create a pyproject.toml file or set custom.uv.source to an existing file.`
        );
      }
    }
  }

  /**
   * Get default configuration with all required fields
   */
  static getDefaultConfig(): Required<UvConfig> {
    return {
      mode: "compile",
      source: "pyproject.toml",
      output: "requirements.txt",
      cwd: process.cwd(),
      compileOptions: [],
      freezeOptions: [],
      skipIfMissing: false,
      pythonVersion: "",
      extraIndexUrl: [],
      trustedHost: [],
      verbose: false,
    };
  }

  /**
   * Merge user config with defaults
   */
  static mergeConfig(userConfig: UvConfig = {}): Required<UvConfig> {
    const defaults = this.getDefaultConfig();
    return {
      ...defaults,
      ...userConfig,
      compileOptions: userConfig.compileOptions || defaults.compileOptions,
      freezeOptions: userConfig.freezeOptions || defaults.freezeOptions,
      extraIndexUrl: userConfig.extraIndexUrl || defaults.extraIndexUrl,
      trustedHost: userConfig.trustedHost || defaults.trustedHost,
    };
  }
}
